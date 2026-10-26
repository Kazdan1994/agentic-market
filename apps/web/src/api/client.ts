import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Typed client generated from the API's OpenAPI document (research R9).
// Same-origin requests: Vite proxies /v1 to the API in development.
// `fetch` is resolved per call so tests can stub it.
export const api = createClient<paths>({
  baseUrl: window.location.origin,
  credentials: "include",
  fetch: (request) => globalThis.fetch(request),
});
