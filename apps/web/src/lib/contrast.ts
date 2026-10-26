// WCAG 2.x contrast for the brand tokens declared in index.css (research R5).

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export interface TokenPair {
  name: string;
  fg: string;
  bg: string;
  min: number;
}

const TOKENS = {
  ground: "#eef0f3",
  paper: "#fcfcfa",
  fg: "#14161a",
  muted: "#5b616b",
  faint: "#62676f",
  accent: "#1e4fd8",
  accentPale: "#e3eafc",
  accentInk: "#123a9e",
  successPale: "#e0f2e6",
  successInk: "#0f3f20",
  white: "#ffffff",
} as const;

const TEXT = ["fg", "muted", "faint", "accent"] as const;
const SURFACES = ["paper", "ground"] as const;

export const TOKEN_PAIRS: readonly TokenPair[] = [
  ...TEXT.flatMap((text) =>
    SURFACES.map((surface) => ({ name: `${text} on ${surface}`, fg: TOKENS[text], bg: TOKENS[surface], min: 4.5 })),
  ),
  { name: "live tag", fg: TOKENS.accentInk, bg: TOKENS.accentPale, min: 4.5 },
  { name: "active tag", fg: TOKENS.successInk, bg: TOKENS.successPale, min: 4.5 },
  { name: "primary button", fg: TOKENS.white, bg: TOKENS.fg, min: 4.5 },
  { name: "focus ring on ground", fg: TOKENS.accent, bg: TOKENS.ground, min: 3 },
];
