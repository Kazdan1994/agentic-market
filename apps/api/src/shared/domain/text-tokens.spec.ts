import { describe, expect, it } from "vitest";
import { hasContentTokens, tokenize } from "./text-tokens";

describe("tokenize", () => {
  it("lower-cases, strips punctuation and removes English stop words", () => {
    expect(tokenize("Wireless headphones, for RUNNING!")).toEqual(["wireless", "headphone", "running"]);
  });

  it("folds simple plurals so 'earbuds' matches 'earbud'", () => {
    expect(tokenize("earbuds")).toEqual(tokenize("earbud"));
    expect(tokenize("glass")).toEqual(["glass"]);
    expect(tokenize("wine glasses, boxes, watches")).toEqual(["wine", "glass", "box", "watch"]);
    expect(tokenize("can opener")).toEqual(["can", "opener"]);
  });

  it("keeps each token once, in first-seen order", () => {
    expect(tokenize("lamp desk lamp")).toEqual(["lamp", "desk"]);
  });

  it("returns nothing for stop words and punctuation only", () => {
    expect(tokenize("the a of, ... and")).toEqual([]);
  });
});

describe("hasContentTokens", () => {
  it("is false when only stop words remain", () => {
    expect(hasContentTokens("I want the")).toBe(false);
    expect(hasContentTokens("I want a lamp")).toBe(true);
  });
});
