import type { IdGenerator } from "../../src/shared/domain/id-generator";

/** Deterministic uuid-shaped ids: 00000000-0000-7000-8000-000000000001, ...002, ... */
export class SequentialIds implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `00000000-0000-7000-8000-${String(this.counter).padStart(12, "0")}`;
  }
}
