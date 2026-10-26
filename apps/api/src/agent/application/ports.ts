/** Rebuilds the built-in agent's mandate key (research R8). */
export interface BuiltinKeys {
  keyFor(mandateId: string): string;
}

export const BUILTIN_KEYS = Symbol("BuiltinKeys");

export interface RunLogger {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export const RUN_LOGGER = Symbol("RunLogger");

export interface RunEventPublisher {
  publish(event: object): void;
}
