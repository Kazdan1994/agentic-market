export type AiStatus = "disabled" | "cold" | "warm" | "unavailable";

/** Reports whether the local AI model is ready (research R5). */
export interface AiStatusPort {
  current(): Promise<AiStatus>;
}

export const AI_STATUS = Symbol("AiStatusPort");
