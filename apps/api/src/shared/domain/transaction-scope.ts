/**
 * Opaque handle to an open database transaction. Domain and application code pass it
 * through to adapters without knowing what it is.
 */
export interface TransactionScope {
  readonly __brand: "TransactionScope";
}
