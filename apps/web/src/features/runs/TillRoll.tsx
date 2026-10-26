import { useId } from "react";
import { cn } from "@/lib/utils";
import { logTime } from "./DecisionLog";
import type { LogEntry } from "./useRunEvents";

const runDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

interface TillRollProps {
  agentName: string;
  startedAt: string;
  entries: readonly LogEntry[];
}

/** A running agent's steps, printed like a till roll; the newest line is still printing. */
export function TillRoll({ agentName, startedAt, entries }: TillRollProps) {
  const headingId = useId();
  if (entries.length === 0) return null;
  const started = new Date(startedAt);

  return (
    <section aria-labelledby={headingId} className="slip-edge px-5 pt-5 pb-6 font-print text-print leading-roll text-fg/85">
      <h2 id={headingId} className="flex justify-between font-bold text-fg">
        <span>
          <span className="sr-only">{agentName} live</span>
          <span aria-hidden="true">{agentName.toUpperCase()} · LIVE</span>
        </span>
      </h2>
      <p className="mb-2.5 text-faint uppercase">
        {runDate.format(started)} · started {logTime(startedAt)}
      </p>
      <ol aria-live="polite" aria-relevant="additions">
        {entries.map((entry, index) => {
          const now = index === entries.length - 1;
          return (
            <li
              key={entry.seq}
              className={cn("grid grid-cols-roll gap-2 border-t border-dashed border-dots py-0.5", now && "now text-accent")}
            >
              <time dateTime={entry.at} className={now ? undefined : "text-faint"}>
                {logTime(entry.at)}
              </time>
              <span className="uppercase">
                {entry.message}
                {now && (
                  <span aria-hidden="true" className="ml-0.5 animate-blink">
                    ▌
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
