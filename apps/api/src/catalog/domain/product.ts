import { Money } from "../../shared/domain/money";

export const CATALOG_CURRENCY = "EUR";

export interface ProductProps {
  id: string;
  merchantId: string;
  categoryId: string;
  /** Shared by offers of the same item across merchants (FR-025a). */
  itemRef: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  stock: number;
  listedAt: Date;
}

export class Product {
  private constructor(private readonly props: Readonly<ProductProps>) {
    Object.freeze(this);
  }

  static create(props: ProductProps): Product {
    if (props.currency !== CATALOG_CURRENCY) {
      throw new RangeError(`Product currency must be ${CATALOG_CURRENCY}, got "${props.currency}"`);
    }
    if (!Number.isSafeInteger(props.priceMinor) || props.priceMinor <= 0) {
      throw new RangeError(`Product price must be a positive integer of cents, got ${props.priceMinor}`);
    }
    if (!Number.isSafeInteger(props.stock) || props.stock < 0) {
      throw new RangeError(`Product stock must be a non-negative integer, got ${props.stock}`);
    }
    return new Product({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get merchantId(): string {
    return this.props.merchantId;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get itemRef(): string {
    return this.props.itemRef;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get price(): Money {
    return Money.of(this.props.priceMinor, this.props.currency);
  }
  get stock(): number {
    return this.props.stock;
  }
  get listedAt(): Date {
    return this.props.listedAt;
  }

  isInStock(): boolean {
    return this.props.stock > 0;
  }
}
