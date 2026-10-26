// Common English filler, plus shopping-request filler ("I want to buy ...").
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "for", "to", "in", "on", "at", "by", "with",
  "from", "as", "is", "are", "be", "it", "its", "this", "that", "these", "those", "my", "me",
  "i", "we", "you", "your", "our", "some", "any", "please", "want", "need", "buy",
  "find", "looking", "something", "could", "would", "should", "very", "so",
]);

const MIN_STEM_LENGTH = 4;

// Plurals that add "es": glasses, boxes, watches, dishes.
const ES_PLURAL = /(ss|x|ch|sh)es$/;

/** Folds simple English plurals: "earbuds" → "earbud", "glasses" → "glass"; keeps "glass", "bus". */
function stem(word: string): string {
  if (word.length < MIN_STEM_LENGTH || !word.endsWith("s")) return word;
  if (ES_PLURAL.test(word)) return word.slice(0, -2);
  if (word.endsWith("ss") || word.endsWith("us")) return word;
  return word.slice(0, -1);
}

/** Lower-cased, punctuation-free, stop-word-free, de-duplicated tokens, in first-seen order. */
export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
  return [...new Set(words.map(stem))];
}

/** True when the text has at least one meaningful word (FR-006a). */
export function hasContentTokens(text: string): boolean {
  return tokenize(text).length > 0;
}
