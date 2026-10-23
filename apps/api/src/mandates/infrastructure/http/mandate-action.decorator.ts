import { SetMetadata } from "@nestjs/common";
import type { ActivityAction } from "../../domain/mandate-activity-log";

export const MANDATE_ACTION = "mandate:action";

/** Names the activity recorded for every key-authenticated call to this route (FR-010e). */
export const MandateAction = (action: ActivityAction) => SetMetadata(MANDATE_ACTION, action);
