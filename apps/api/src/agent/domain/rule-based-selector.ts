import { scoreCandidate } from "../../catalog/domain/search-scoring";
import { tokenize } from "../../shared/domain/text-tokens";
import type { Candidate } from "./candidate";
import { LogMessages } from "./log-messages";
import type { ProductSelectorPort, Selection } from "./product-selector.port";

/**
 * Deterministic selection (FR-009a, SC-003a): best relevance score, then lowest price,
 * earliest listing and smallest id. The same input always gives the same choice.
 */
export class RuleBasedSelector implements ProductSelectorPort {
  async select(request: string, kept: readonly Candidate[]): Promise<Selection> {
    const tokens = tokenize(request);
    const ranked = kept
      .map((candidate) => ({ candidate, score: scoreCandidate(tokens, { ...candidate, id: candidate.productId }) }))
      .sort(
        (x, y) =>
          y.score - x.score ||
          x.candidate.priceMinor - y.candidate.priceMinor ||
          x.candidate.listedAt.getTime() - y.candidate.listedAt.getTime() ||
          (x.candidate.productId < y.candidate.productId ? -1 : x.candidate.productId > y.candidate.productId ? 1 : 0),
      );
    const [winner, ...others] = ranked;
    if (!winner) {
      return { productId: null, reason: "No eligible product matched the request.", evaluations: [], strategy: "rules", fallbackReason: null };
    }
    const reason = LogMessages.ruleChoice(winner.candidate);
    return {
      productId: winner.candidate.productId,
      reason,
      evaluations: [
        { productId: winner.candidate.productId, verdict: "kept", reason },
        ...others.map(({ candidate, score }) => ({
          productId: candidate.productId,
          verdict: "discarded" as const,
          reason:
            score < winner.score
              ? LogMessages.weakerMatch(candidate, winner.candidate)
              : LogMessages.lostTie(candidate, winner.candidate),
        })),
      ],
      strategy: "rules",
      fallbackReason: null,
    };
  }
}
