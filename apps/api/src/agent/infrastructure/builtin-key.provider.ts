import { Inject, Injectable } from "@nestjs/common";
import { MandateKeySecrets } from "../../mandates/domain/mandate-key";
import { APP_CONFIG, type AppConfig } from "../../shared/config/app-config";

/** Rebuilds the built-in agent's key for a mandate. The secret itself is never stored (R8). */
@Injectable()
export class BuiltinKeyProvider {
  constructor(@Inject(APP_CONFIG) private readonly config: Pick<AppConfig, "BUILTIN_KEY_SECRET">) {}

  keyFor(mandateId: string): string {
    return MandateKeySecrets.deriveBuiltin(this.config.BUILTIN_KEY_SECRET, mandateId).secret;
  }
}
