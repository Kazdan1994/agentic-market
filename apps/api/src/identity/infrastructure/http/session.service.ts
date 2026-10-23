import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export const SESSION_COOKIE = "am_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Stateless session: a signed JWT in an httpOnly cookie (research R6). */
@Injectable()
export class SessionService {
  constructor(private readonly jwt: JwtService) {}

  issue(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId }, { expiresIn: SESSION_TTL_SECONDS });
  }

  /** The user id, or null for a missing, forged or expired token. */
  async verify(token: string | undefined): Promise<string | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
