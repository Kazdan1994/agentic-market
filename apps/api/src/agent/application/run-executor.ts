import { Inject } from "@nestjs/common";
import { EventBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { CorrelationContext } from "../../shared/correlation/correlation-context";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { Money } from "../../shared/domain/money";
import type { AgentRun, Completion, RunOutcome } from "../domain/agent-run";
import { AGENT_RUN_REPOSITORY, type AgentRunRepository } from "../domain/agent-run-repository";
import type { Candidate } from "../domain/candidate";
import { evaluateCandidates } from "../domain/candidate-evaluator";
import { LogMessages } from "../domain/log-messages";
import { PRODUCT_SELECTOR, type ProductSelectorPort, type Selection } from "../domain/product-selector.port";
import { RunLog, type RunLogInput } from "../domain/run-log-entry";
import { STORE, type StoreContext, StoreError, type StorePort } from "../domain/store.port";
import { RunCompletedEvent, RunLogAppendedEvent } from "./run-log-events";
import { BUILTIN_KEYS, type BuiltinKeys, RUN_LOGGER, type RunEventPublisher, type RunLogger } from "./ports";
import { RunStartedEvent } from "./run-started.event";

const SEARCH_LIMIT = 20;
const COMPLETE_ATTEMPTS = 3;
const MANDATE_REFUSALS = /^(MANDATE_|OVER_|CATEGORY_NOT_ALLOWED$)/;
const CHANGED_SINCE_SEARCH = new Set(["PRICE_CHANGED", "OUT_OF_STOCK"]);

type Result = Omit<Completion, "now"> & { message: string; code?: string };

/** Appends entries to one run's decision log with gap-free sequence numbers. */
class LogWriter {
  private log: RunLog;

  constructor(
    runId: string,
    private readonly runs: AgentRunRepository,
    private readonly clock: Clock,
    private readonly events: RunEventPublisher,
  ) {
    this.log = RunLog.empty(runId);
  }

  async write(input: RunLogInput): Promise<void> {
    const { log, entry } = this.log.append(input, this.clock.now());
    await this.runs.appendLog(entry);
    this.log = log;
    // Only after the insert has committed, so live subscribers never get ahead of a replay.
    this.events.publish(new RunLogAppendedEvent(entry));
  }
}

/**
 * Runs the built-in agent: search, evaluate, select, check, pay (FR-006 to FR-009). It
 * reaches the store only through StorePort, with its own mandate key (FR-010a). Every run
 * ends completed with an outcome, even after an unexpected error.
 */
@EventsHandler(RunStartedEvent)
export class RunExecutor implements IEventHandler<RunStartedEvent> {
  constructor(
    @Inject(AGENT_RUN_REPOSITORY) private readonly runs: AgentRunRepository,
    @Inject(STORE) private readonly store: StorePort,
    @Inject(BUILTIN_KEYS) private readonly keys: BuiltinKeys,
    @Inject(PRODUCT_SELECTOR) private readonly selector: ProductSelectorPort,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RUN_LOGGER) private readonly logger: RunLogger,
    @Inject(EventBus) private readonly events: RunEventPublisher,
  ) {}

  handle(event: RunStartedEvent): void {
    // Not awaited: the HTTP request that started the run has already answered 202.
    this.execute(event.runId).catch((error: unknown) =>
      this.logger.error({ runId: event.runId, err: { message: String(error) } }, "agent run could not be executed"),
    );
  }

  async execute(runId: string): Promise<void> {
    const run = await this.runs.findById(runId);
    if (!run || run.status !== "running") return;
    await CorrelationContext.run(run.correlationId, () => this.executeRun(run));
  }

  private async executeRun(run: AgentRun): Promise<void> {
    const writer = new LogWriter(run.id, this.runs, this.clock, this.events);
    const context: StoreContext = { key: this.keys.keyFor(run.mandateId), runId: run.id, correlationId: run.correlationId };
    let result: Result;
    try {
      result = await this.decide(run, context, writer);
    } catch (error) {
      this.logger.error({ runId: run.id, err: { message: String(error) } }, "agent run failed unexpectedly");
      result = {
        outcome: "interrupted",
        strategy: null,
        fallbackReason: null,
        orderId: null,
        message: "The run stopped because of an unexpected error. No order was placed by this step.",
        code: error instanceof StoreError ? error.code : "INTERNAL_ERROR",
      };
    }
    await this.finish(run, writer, result);
    this.logger.info(
      {
        runId: run.id,
        mandateId: run.mandateId,
        userId: run.userId,
        principal: "builtin",
        outcome: result.outcome,
        strategy: result.strategy,
        fallbackReason: result.fallbackReason,
        correlationId: run.correlationId,
      },
      "agent run completed",
    );
  }

  /**
   * Always tries to close the run, even if the outcome entry cannot be written: a run left
   * `running` would block its mandate (one run at a time) until the next restart.
   */
  private async finish(run: AgentRun, writer: LogWriter, result: Result): Promise<void> {
    try {
      await writer.write({ step: "outcome", message: result.message, productId: null, data: { outcome: result.outcome, code: result.code ?? null } });
    } catch (error) {
      this.logger.error({ runId: run.id, err: { message: String(error) } }, "could not write the run's outcome entry");
    }
    const completed = run.complete({ ...result, now: this.clock.now() });
    for (let attempt = 1; attempt <= COMPLETE_ATTEMPTS; attempt += 1) {
      try {
        await this.runs.complete(completed);
        this.events.publish(new RunCompletedEvent(completed));
        return;
      } catch (error) {
        if (attempt === COMPLETE_ATTEMPTS) throw error;
      }
    }
  }

  private async decide(run: AgentRun, context: StoreContext, writer: LogWriter): Promise<Result> {
    const limits = await this.store.getMandate(context);
    const results = await this.store.search(context, run.request, SEARCH_LIMIT);
    await writer.write({
      step: "search",
      message: LogMessages.searched(run.request, results),
      productId: null,
      data: { query: run.request, count: results.length },
    });

    const evaluations = evaluateCandidates(results);
    for (const e of evaluations) {
      const c = e.candidate;
      const message =
        e.verdict === "kept"
          ? LogMessages.kept(c)
          : e.reasonCode === "cheaper_offer_elsewhere" && e.cheaperOffer
            ? LogMessages.cheaperElsewhere(c, e.cheaperOffer)
            : LogMessages.discarded(c, e.reasonCode as "over_budget" | "category_not_allowed" | "out_of_stock", limits);
      await writer.write({
        step: "evaluation",
        message,
        productId: c.productId,
        data: { verdict: e.verdict, reasonCode: e.reasonCode, merchant: c.merchantName, priceMinor: c.priceMinor },
      });
    }

    const kept = evaluations.filter((e) => e.verdict === "kept").map((e) => e.candidate);
    const selection = await this.selector.select(run.request, kept);
    const chosen = kept.find((c) => c.productId === selection.productId);
    await writer.write({
      step: "selection",
      message: chosen
        ? `${selection.reason} ${LogMessages.strategy(selection.strategy, selection.fallbackReason)}`
        : LogMessages.noEligibleProduct(selection.fallbackReason),
      productId: chosen?.productId ?? null,
      data: { strategy: selection.strategy, fallbackReason: selection.fallbackReason, evaluations: selection.evaluations },
    });
    if (!chosen) return this.ended(selection, "no_eligible_product", LogMessages.noEligibleProduct());

    const limit = Math.min(limits.perPurchaseCapMinor, limits.remainingMinor);
    await writer.write({
      step: "mandate_check",
      message: `Checked the mandate: ${this.price(chosen)} is within the ${Money.of(limit, limits.currency).format()} limit.`,
      productId: chosen.productId,
      data: { priceMinor: chosen.priceMinor, limitMinor: limit },
    });
    return this.checkout(context, chosen, selection, writer);
  }

  private async checkout(context: StoreContext, chosen: Candidate, selection: Selection, writer: LogWriter): Promise<Result> {
    try {
      const request = { productId: chosen.productId, expectedPriceMinor: chosen.priceMinor };
      // A timed-out checkout may have been paid; the retry reuses the run's idempotency key,
      // so it returns that order instead of paying twice.
      const { orderId } = await this.store
        .checkout(context, request)
        .catch((error: unknown) =>
          error instanceof StoreError && error.code === "STORE_UNAVAILABLE" ? this.store.checkout(context, request) : Promise.reject(error),
        );
      await writer.write({
        step: "payment",
        message: `Paid ${this.price(chosen)} to ${chosen.merchantName} (simulated payment approved).`,
        productId: chosen.productId,
        data: { outcome: "approved", orderId },
      });
      return { ...this.ended(selection, "order_placed", `Order placed: "${chosen.name}" from ${chosen.merchantName} for ${this.price(chosen)}.`), orderId };
    } catch (error) {
      if (!(error instanceof StoreError)) throw error;
      const code = error.code;
      if (code === "PAYMENT_DECLINED") {
        await writer.write({ step: "payment", message: `The simulated payment of ${this.price(chosen)} was declined (PAYMENT_DECLINED).`, productId: chosen.productId, data: { outcome: "declined", code } });
        return { ...this.ended(selection, "payment_declined", "The payment was declined. No order was placed and no budget was used."), code };
      }
      if (CHANGED_SINCE_SEARCH.has(code)) {
        const what = code === "PRICE_CHANGED" ? "its price changed" : "it went out of stock";
        await writer.write({ step: "mandate_check", message: `"${chosen.name}" can no longer be bought: ${what} since the search (${code}).`, productId: chosen.productId, data: { code } });
        return { ...this.ended(selection, "no_eligible_product", `No order: ${what}.`), code };
      }
      if (MANDATE_REFUSALS.test(code)) {
        await writer.write({ step: "mandate_check", message: `The mandate refused the purchase of "${chosen.name}" (${code}).`, productId: chosen.productId, data: { code } });
        return { ...this.ended(selection, "refused_by_mandate", `No order: the mandate refused it (${code}).`), code };
      }
      throw error;
    }
  }

  private ended(selection: Selection, outcome: RunOutcome, message: string): Result {
    return { outcome, strategy: selection.strategy, fallbackReason: selection.fallbackReason, orderId: null, message };
  }

  private price(c: Candidate): string {
    return Money.of(c.priceMinor, c.currency).format();
  }
}
