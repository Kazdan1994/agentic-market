import { Money } from "../../../shared/domain/money";
import type { Candidate } from "../../domain/candidate";

/**
 * Builds the selection prompt. Only the request and public product facts go to the model:
 * no stock, item references, keys or user data.
 */
export function selectionPrompt(request: string, kept: readonly Candidate[]): string {
  const products = kept.map((c) => ({
    productId: c.productId,
    merchant: c.merchantName,
    name: c.name,
    description: c.description,
    category: c.categoryName,
    price: Money.of(c.priceMinor, c.currency).format(),
  }));
  return [
    "You choose one product for a shopper. All products below are already allowed by their budget.",
    "Pick the product that best fits the request; prefer the lower price only when two fit equally well.",
    "Set chosenProductId to null if none fits the request.",
    "Give one evaluation per product: verdict kept for your choice, discarded for the others.",
    "Write every reason in plain English, 15 words or fewer.",
    "",
    `Request: ${JSON.stringify(request)}`,
    `Products: ${JSON.stringify(products)}`,
  ].join("\n");
}
