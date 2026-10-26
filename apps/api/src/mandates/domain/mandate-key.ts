import { createHash, createHmac, randomBytes } from "node:crypto";

export const KEY_PREFIX = "amk_";
const HINT_LENGTH = 4;

export type MandateKeyKind = "builtin" | "external";

export interface KeyMaterial {
  /** Shown once (external) or rebuilt on demand (builtin). Never stored. */
  secret: string;
  keyHash: Buffer;
  hint: string;
}

function hashSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function material(secret: string): KeyMaterial {
  return { secret, keyHash: hashSecret(secret), hint: secret.slice(-HINT_LENGTH) };
}

export const MandateKeySecrets = {
  hash: hashSecret,

  generateExternal(): KeyMaterial {
    return material(KEY_PREFIX + randomBytes(32).toString("base64url"));
  },

  /** Deterministic, so the run executor can rebuild the built-in key (research R8). */
  deriveBuiltin(builtinKeySecret: string, mandateId: string): KeyMaterial {
    return material(KEY_PREFIX + createHmac("sha256", builtinKeySecret).update(mandateId).digest("base64url"));
  },
};

export interface MandateKeyProps {
  id: string;
  mandateId: string;
  kind: MandateKeyKind;
  keyHash: Buffer;
  hint: string;
  label: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/** A stored access key: only its hash and last 4 characters (FR-010c). */
export class MandateKey {
  private constructor(private readonly props: Readonly<MandateKeyProps>) {
    Object.freeze(this);
  }

  static restore(props: MandateKeyProps): MandateKey {
    return new MandateKey({ ...props, keyHash: Buffer.from(props.keyHash) });
  }

  get id(): string {
    return this.props.id;
  }
  get mandateId(): string {
    return this.props.mandateId;
  }
  get kind(): MandateKeyKind {
    return this.props.kind;
  }
  get keyHash(): Buffer {
    return Buffer.from(this.props.keyHash);
  }
  get hint(): string {
    return this.props.hint;
  }
  get label(): string | null {
    return this.props.label;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  revoke(now: Date): MandateKey {
    return this.isRevoked() ? this : new MandateKey({ ...this.props, revokedAt: now });
  }
}
