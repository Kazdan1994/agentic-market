import { AppendOnlyGuard1761130000001 } from "./0001-append-only-guard";
import { AuditEvents1761130000002 } from "./0002-audit-events";

/** Explicit, ordered list: works the same from compiled JS and from TypeScript tests. */
export const migrations = [AppendOnlyGuard1761130000001, AuditEvents1761130000002];
