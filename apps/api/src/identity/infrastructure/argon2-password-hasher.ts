import { argon2, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PasswordHasher } from "../domain/password-hasher";

// OWASP minimum for argon2id: 19 MiB memory, 2 passes, 1 lane.
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 } as const;
const PHC_PATTERN = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

const b64 = (buf: Buffer) => buf.toString("base64").replace(/=+$/, "");

function derive(
  password: string,
  nonce: Buffer,
  params: { memory: number; passes: number; parallelism: number; tagLength: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2("argon2id", { message: password, nonce, ...params }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** argon2id with Node's built-in implementation, stored as a PHC string. */
@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt, PARAMS);
    const { memory, passes, parallelism } = PARAMS;
    return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${b64(salt)}$${b64(key)}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const match = PHC_PATTERN.exec(hash);
    if (!match) return false;
    const [, m, t, p, salt, expected] = match as unknown as [string, string, string, string, string, string];
    const expectedKey = Buffer.from(expected, "base64");
    const key = await derive(password, Buffer.from(salt, "base64"), {
      memory: Number(m),
      passes: Number(t),
      parallelism: Number(p),
      tagLength: expectedKey.length,
    });
    return timingSafeEqual(key, expectedKey);
  }
}
