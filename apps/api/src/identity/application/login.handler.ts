import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { PASSWORD_HASHER, type PasswordHasher } from "../domain/password-hasher";
import { USER_REPOSITORY, type UserRepository } from "../domain/user-repository";

export class LoginCommand {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}
}

// Verified when the email is unknown, so both failures take about the same time.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$Dh8Z2bKvxFqgPbJ2nYV5JrPpm4cCEdWkCq5w1xI0mQ4";

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, { userId: string }> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute({ email, password }: LoginCommand): Promise<{ userId: string }> {
    const user = await this.users.findByEmail(email);
    const valid = await this.hasher.verify(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      throw new DomainError(ErrorCode.UNAUTHORIZED, "Email or password is incorrect.");
    }
    return { userId: user.id };
  }
}
