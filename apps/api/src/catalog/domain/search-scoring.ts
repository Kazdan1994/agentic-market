import { tokenize } from "../../shared/domain/text-tokens";

const NAME_WEIGHT = 3;
const CATEGORY_WEIGHT = 2;
const DESCRIPTION_WEIGHT = 1;

export interface SearchCandidate {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  priceMinor: number;
  listedAt: Date;
}

export interface RankedCandidate<T extends SearchCandidate> {
  candidate: T;
  score: number;
}

const compareCodePoints = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function matches(requestTokens: readonly string[], field: string): number {
  const fieldTokens = new Set(tokenize(field));
  return requestTokens.filter((token) => fieldTokens.has(token)).length;
}

export function scoreCandidate(requestTokens: readonly string[], candidate: SearchCandidate): number {
  return (
    NAME_WEIGHT * matches(requestTokens, candidate.name) +
    CATEGORY_WEIGHT * matches(requestTokens, candidate.categoryName) +
    DESCRIPTION_WEIGHT * matches(requestTokens, candidate.description)
  );
}

/** Matching candidates, best first: score desc, then price, listing date and id ascending. */
export function rankByRelevance<T extends SearchCandidate>(
  requestTokens: readonly string[],
  candidates: readonly T[],
): RankedCandidate<T>[] {
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(requestTokens, candidate) }))
    .filter(({ score }) => score > 0)
    .sort(
      (x, y) =>
        y.score - x.score ||
        x.candidate.priceMinor - y.candidate.priceMinor ||
        x.candidate.listedAt.getTime() - y.candidate.listedAt.getTime() ||
        compareCodePoints(x.candidate.id, y.candidate.id),
    );
}
