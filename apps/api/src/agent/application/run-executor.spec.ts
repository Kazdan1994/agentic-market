import { beforeEach, describe, expect, it } from "vitest";
import { FixedClock } from "../../../test/support/fixed-clock";
import { InMemoryRuns } from "../../../test/support/in-memory-runs";
import { InMemoryStore, type StoreProduct } from "../../../test/support/in-memory-store";
import { AUDIO_CATEGORY, KITCHEN_CATEGORY, testMandate } from "../../../test/support/mandates";
import type { ProductSelectorPort } from "../domain/product-selector.port";
import { RuleBasedSelector } from "../domain/rule-based-selector";
import type { RunStep } from "../domain/run-log-entry";
import { RunExecutor } from "./run-executor";
import { SelectionService } from "./selection.service";

const NOW = new Date("2026-10-23T12:00:00Z");
const RUN_ID = "00000000-0000-7000-8000-000000000101";

function product(id: string, over: Partial<StoreProduct["candidate"]> = {}, categoryId = AUDIO_CATEGORY, stock = 5): StoreProduct {
  return {
    categoryId,
    stock,
    candidate: {
      productId: `00000000-0000-7000-8000-0000000000${id}`,
      itemRef: `item-${id}`,
      name: "RunBuds Pro",
      description: "Wireless running earbuds",
      categoryName: categoryId === AUDIO_CATEGORY ? "Audio" : "Kitchen",
      merchantName: "TechCorner",
      priceMinor: 7_900,
      currency: "EUR",
      listedAt: new Date("2026-09-01T00:00:00Z"),
      ...over,
    },
  };
}

let runs: InMemoryRuns;
let store: InMemoryStore;
let logs: Record<string, unknown>[];

function setup(products: StoreProduct[]) {
  runs = new InMemoryRuns();
  store = new InMemoryStore(testMandate(), products, () => NOW);
  logs = [];
  runs.seedRunning({
    id: RUN_ID,
    mandateId: testMandate().id,
    userId: testMandate().userId,
    request: "wireless running earbuds",
    correlationId: "00000000-0000-7000-8000-0000000000cc",
    now: NOW,
  });
}

function executor(selector: ProductSelectorPort = new RuleBasedSelector()) {
  return new RunExecutor(
    runs,
    store,
    { keyFor: () => "amk_builtin" },
    selector,
    new FixedClock(NOW),
    { info: (obj: object) => void logs.push(obj as Record<string, unknown>), error: (obj: object) => void logs.push(obj as Record<string, unknown>) },
  );
}

const steps = (): RunStep[] => runs.entriesOf(RUN_ID).map((e) => e.step);
const outcome = async () => (await runs.findById(RUN_ID))?.outcome;

describe("RunExecutor", () => {
  beforeEach(() => setup([product("e1"), product("e2", { name: "Classic Wired Earphones", description: "Wired", priceMinor: 1_900 })]));

  it("searches, evaluates, selects, checks, pays and places the order", async () => {
    await executor().execute(RUN_ID);
    expect(steps()).toEqual(["search", "evaluation", "evaluation", "selection", "mandate_check", "payment", "outcome"]);
    expect(runs.entriesOf(RUN_ID).map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const run = await runs.findById(RUN_ID);
    expect(run).toMatchObject({ status: "completed", outcome: "order_placed", strategy: "rules", orderId: store.orders[0]?.orderId });
    expect(store.calls.every((c) => c.context.key === "amk_builtin" && c.context.runId === RUN_ID)).toBe(true);
    expect(logs.at(-1)).toMatchObject({ runId: RUN_ID, outcome: "order_placed", correlationId: "00000000-0000-7000-8000-0000000000cc" });
  });

  it("persists the fallback reason and states it in the selection entry", async () => {
    const forced = new SelectionService({ AGENT_SELECTION_MODE: "rules", OLLAMA_BASE_URL: undefined, AI_MODEL: undefined }, new RuleBasedSelector());
    await executor(forced).execute(RUN_ID);
    expect(await runs.findById(RUN_ID)).toMatchObject({ strategy: "rules", fallbackReason: "forced_rules" });
    const selection = runs.entriesOf(RUN_ID).find((e) => e.step === "selection");
    expect(selection?.message).toMatch(/rule-based selection is forced by configuration\.$/);
  });

  it("ends with no_eligible_product when nothing is kept, saying why", async () => {
    setup([product("e1", { priceMinor: 12_000 }), product("e2", {}, KITCHEN_CATEGORY)]);
    await executor().execute(RUN_ID);
    expect(await outcome()).toBe("no_eligible_product");
    const messages = runs.entriesOf(RUN_ID).map((e) => e.message).join("\n");
    expect(messages).toContain("per-purchase cap");
    expect(messages).toContain("category is not allowed");
    expect(steps().at(-1)).toBe("outcome");
  });

  it("records no_eligible_candidates and says the AI was not asked when nothing is kept", async () => {
    setup([product("e1", { priceMinor: 12_000 })]);
    const service = new SelectionService({ AGENT_SELECTION_MODE: "auto", OLLAMA_BASE_URL: undefined, AI_MODEL: undefined }, new RuleBasedSelector());
    await executor(service).execute(RUN_ID);
    expect(await runs.findById(RUN_ID)).toMatchObject({ strategy: "rules", fallbackReason: "no_eligible_candidates" });
    const selection = runs.entriesOf(RUN_ID).find((e) => e.step === "selection");
    expect(selection?.message).toBe("No product fits the request within the mandate, so the local AI was not asked.");
  });

  it.each([
    ["OVER_REMAINING_BUDGET", "refused_by_mandate"],
    ["MANDATE_REVOKED", "refused_by_mandate"],
    ["CATEGORY_NOT_ALLOWED", "refused_by_mandate"],
    ["PRICE_CHANGED", "no_eligible_product"],
    ["OUT_OF_STOCK", "no_eligible_product"],
    ["PAYMENT_DECLINED", "payment_declined"],
  ])("maps a checkout failing with %s to %s", async (code, expected) => {
    store.failNextCheckout = code;
    await executor().execute(RUN_ID);
    expect(await outcome()).toBe(expected);
    expect(runs.entriesOf(RUN_ID).some((e) => e.message.includes(code) || e.data.code === code)).toBe(true);
  });

  it("completes the run even when its outcome entry cannot be written", async () => {
    const append = runs.appendLog.bind(runs);
    runs.appendLog = async (entry) => (entry.step === "outcome" ? Promise.reject(new Error("db down")) : append(entry));
    await executor().execute(RUN_ID);
    expect((await runs.findById(RUN_ID))?.status).toBe("completed");
  });

  it("does not crash when the background execution fails", async () => {
    runs.findById = () => Promise.reject(new Error("db down"));
    executor().handle({ runId: RUN_ID });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(logs.at(-1)).toMatchObject({ runId: RUN_ID });
  });

  it("retries a timed-out checkout with the same idempotency key", async () => {
    store.failNextCheckout = "STORE_UNAVAILABLE";
    await executor().execute(RUN_ID);
    expect(await outcome()).toBe("order_placed");
    expect(store.orders).toHaveLength(1);
  });

  it("still completes and logs the run after an unexpected error", async () => {
    store.throwOnSearch = new Error("boom");
    await executor().execute(RUN_ID);
    const run = await runs.findById(RUN_ID);
    expect(run?.status).toBe("completed");
    expect(run?.outcome).toBe("interrupted");
    expect(runs.entriesOf(RUN_ID).at(-1)?.step).toBe("outcome");
  });
});
