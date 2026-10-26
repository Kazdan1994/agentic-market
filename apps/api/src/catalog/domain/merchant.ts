const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface Merchant {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export function createMerchant(props: Merchant): Merchant {
  if (!SLUG_PATTERN.test(props.slug)) {
    throw new RangeError(`Merchant slug must match [a-z0-9-]+, got "${props.slug}"`);
  }
  return Object.freeze({ ...props });
}
