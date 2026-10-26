import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();

/** Correlation id of the current request or background job (research R15). */
export const CorrelationContext = {
  current(): string | undefined {
    return storage.getStore();
  },
  run<T>(correlationId: string, fn: () => T): T {
    return storage.run(correlationId, fn);
  },
};
