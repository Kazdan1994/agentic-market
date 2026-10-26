const MAX_DISPLAY_NAME = 80;

export interface UserProps {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
}

/** A human account. Demo users are seeded; there is no sign-up (spec assumptions). */
export class User {
  private constructor(private readonly props: Readonly<UserProps>) {
    Object.freeze(this);
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static create(props: UserProps): User {
    const email = User.normalizeEmail(props.email);
    if (!email.includes("@")) {
      throw new RangeError(`User email must contain @, got "${email}"`);
    }
    const displayName = props.displayName.trim();
    if (displayName.length < 1 || displayName.length > MAX_DISPLAY_NAME) {
      throw new RangeError(`User display name must be 1-${MAX_DISPLAY_NAME} characters`);
    }
    return new User({ ...props, email, displayName });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get displayName(): string {
    return this.props.displayName;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
