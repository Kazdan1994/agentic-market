import { AppendOnlyGuard1761130000001 } from "./0001-append-only-guard";
import { AuditEvents1761130000002 } from "./0002-audit-events";
import { Users1761130000003 } from "./0003-users";
import { Catalog1761130000004 } from "./0004-catalog";
import { Mandates1761130000005 } from "./0005-mandates";
import { Checkout1761130000006 } from "./0006-checkout";
import { AgentRuns1761130000007 } from "./0007-agent-runs";

/** Explicit, ordered list: works the same from compiled JS and from TypeScript tests. */
export const migrations = [
  AppendOnlyGuard1761130000001,
  AuditEvents1761130000002,
  Users1761130000003,
  Catalog1761130000004,
  Mandates1761130000005,
  Checkout1761130000006,
  AgentRuns1761130000007,
];
