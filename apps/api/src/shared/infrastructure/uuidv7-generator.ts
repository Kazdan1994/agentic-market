import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { IdGenerator } from "../domain/id-generator";

@Injectable()
export class UuidV7Generator implements IdGenerator {
  next(): string {
    return uuidv7();
  }
}
