export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /** False for a wrong password or a malformed hash; never throws for those. */
  verify(password: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol("PasswordHasher");
