import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { USER_REPOSITORY, type UserRepository } from "../domain/user-repository";

export class GetMeQuery {
  constructor(readonly userId: string) {}
}

export interface MeView {
  id: string;
  email: string;
  displayName: string;
}

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery, MeView> {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute({ userId }: GetMeQuery): Promise<MeView> {
    const user = await this.users.findById(userId);
    // A valid session for a user that no longer exists is treated as signed out.
    if (!user) throw new DomainError(ErrorCode.UNAUTHORIZED, "Please sign in.");
    return { id: user.id, email: user.email, displayName: user.displayName };
  }
}
