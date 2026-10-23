import { describe, expect, it } from "vitest";
import { tokenize } from "../../shared/domain/text-tokens";
import { rankByRelevance, type SearchCandidate, scoreCandidate } from "./search-scoring";

const candidate = (over: Partial<SearchCandidate>): SearchCandidate => ({
  id: "00000000-0000-7000-8000-000000000001",
  name: "Desk Lamp",
  description: "Dimmable",
  categoryName: "Home",
  priceMinor: 1000,
  listedAt: new Date("2026-09-01T00:00:00Z"),
  ...over,
});

describe("scoreCandidate", () => {
  it("adds 3 per name match, 2 per category match, 1 per description match", () => {
    const tokens = tokenize("wireless audio earbuds");
    const score = scoreCandidate(tokens, candidate({ name: "RunBuds Earbuds", categoryName: "Audio", description: "Wireless sport earbuds" }));
    // name: earbud (3); category: audio (2); description: wireless + earbud (2)
    expect(score).toBe(7);
  });

  it("scores 0 when nothing matches", () => {
    expect(scoreCandidate(tokenize("kettle"), candidate({}))).toBe(0);
  });
});

describe("rankByRelevance", () => {
  const tokens = tokenize("lamp");
  const a = candidate({ id: "00000000-0000-7000-8000-00000000000a", priceMinor: 3900 });
  const b = candidate({ id: "00000000-0000-7000-8000-00000000000b", priceMinor: 3900, listedAt: new Date("2026-08-01T00:00:00Z") });
  const c = candidate({ id: "00000000-0000-7000-8000-00000000000c", priceMinor: 4200, name: "Lamp", description: "lamp" });
  const d = candidate({ id: "00000000-0000-7000-8000-00000000000d", priceMinor: 3900, listedAt: b.listedAt });
  const none = candidate({ id: "00000000-0000-7000-8000-00000000000e", name: "Clock", description: "" });

  it("drops zero scores and orders by score, price, listing date, then id", () => {
    expect(rankByRelevance(tokens, [none, a, d, c, b]).map((r) => r.candidate.id)).toEqual([c.id, b.id, d.id, a.id]);
  });
});
