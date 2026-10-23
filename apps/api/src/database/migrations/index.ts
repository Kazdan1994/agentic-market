import { AppendOnlyGuard1761130000001 } from "./0001-append-only-guard";
import { AuditEvents1761130000002 } from "./0002-audit-events";
import { Users1761130000003 } from "./0003-users";
import { Catalog1761130000004 } from "./0004-catalog";

/** Explicit, ordered list: works the same from compiled JS and from TypeScript tests. */
export const migrations = [
  AppendOnlyGuard1761130000001,
  AuditEvents1761130000002,
  Users1761130000003,
  Catalog1761130000004,
];
