import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

// The default 1 s wait for findBy* is too short when the API suite runs alongside.
configure({ asyncUtilTimeout: 5_000 });

// jsdom has no ResizeObserver; Radix primitives measure themselves with it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
