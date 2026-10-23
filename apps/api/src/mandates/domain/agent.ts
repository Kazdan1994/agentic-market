import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";

const MAX_NAME = 60;

export interface AgentProps {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

/** A named agent owned by a user. It has exactly one mandate. */
export class Agent {
  private constructor(private readonly props: Readonly<AgentProps>) {
    Object.freeze(this);
  }

  static create(props: AgentProps): Agent {
    const name = props.name.trim();
    if (name.length < 1 || name.length > MAX_NAME) {
      throw new DomainError(ErrorCode.VALIDATION_FAILED, `Agent name must be 1 to ${MAX_NAME} characters.`, {
        field: "name",
      });
    }
    return new Agent({ ...props, name });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
