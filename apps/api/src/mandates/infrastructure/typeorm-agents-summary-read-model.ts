import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  type AgentsSummaryReadModel,
  type AgentsSummaryView,
  ENDING_SOON_DAYS,
  type RunningRunView,
} from "../application/agents-summary-view";
import { MANDATE_CURRENCY } from "../domain/mandate";

interface Row {
  remaining_minor: number;
  active_count: number;
  ending_agent_id: string | null;
  ending_agent_name: string | null;
  ending_expires_at: Date | null;
  ending_days: number | null;
  running: RunningRunView[];
}

const SUMMARY = `
  WITH active AS (
    SELECT m.id, m.agent_id, a.name, m.total_budget_minor - m.spent_minor AS remaining_minor, m.expires_at,
           CEIL(EXTRACT(EPOCH FROM m.expires_at - $2::timestamptz) / 86400)::int AS days
    FROM mandates m
    JOIN agents a ON a.id = m.agent_id
    WHERE m.user_id = $1 AND m.revoked_at IS NULL AND m.expires_at > $2 AND m.total_budget_minor > m.spent_minor
  )
  SELECT
    (SELECT COALESCE(SUM(remaining_minor), 0) FROM active)::int AS remaining_minor,
    (SELECT count(*) FROM active)::int AS active_count,
    soon.agent_id AS ending_agent_id, soon.name AS ending_agent_name,
    soon.expires_at AS ending_expires_at, soon.days AS ending_days,
    (SELECT COALESCE(
       json_agg(json_build_object('mandateId', r.mandate_id, 'runId', r.id, 'agentName', act.name)
                ORDER BY act.expires_at, act.id),
       '[]'::json)
     FROM agent_runs r JOIN active act ON act.id = r.mandate_id
     WHERE r.status = 'running') AS running
  FROM (SELECT 1) one
  LEFT JOIN LATERAL (
    SELECT agent_id, name, expires_at, days FROM active WHERE days <= $3 ORDER BY expires_at, id LIMIT 1
  ) soon ON true`;

@Injectable()
export class TypeOrmAgentsSummaryReadModel implements AgentsSummaryReadModel {
  constructor(private readonly dataSource: DataSource) {}

  async summarize(userId: string, now: Date): Promise<AgentsSummaryView> {
    const [row]: Row[] = await this.dataSource.query(SUMMARY, [userId, now, ENDING_SOON_DAYS]);
    if (!row) throw new Error("agents summary query returned no row");
    return {
      remaining: { amountMinor: row.remaining_minor, currency: MANDATE_CURRENCY },
      activeCount: row.active_count,
      endingSoon:
        row.ending_agent_id && row.ending_agent_name && row.ending_expires_at && row.ending_days !== null
          ? {
              agentId: row.ending_agent_id,
              agentName: row.ending_agent_name,
              expiresAt: row.ending_expires_at.toISOString(),
              days: row.ending_days,
            }
          : null,
      running: row.running,
    };
  }
}
