"use client";

import { formatWeekRange } from "@/lib/dates";
import type { WeekSummary } from "@/lib/stats";
import { TYPE_META } from "@/lib/workoutMeta";

/**
 * One row per tracked goal, one cell per week: did that goal get hit? Row labels
 * carry the identity, so the colour is reinforcement rather than the only signal.
 */
export function ConsistencyGrid({ summaries }: { summaries: WeekSummary[] }) {
  const tracked = summaries[summaries.length - 1]?.tracked ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      <Row
        label="All goals"
        emphasis
        cells={summaries.map((summary) => ({
          key: summary.weekStart,
          level: summary.complete ? 1 : summary.doneCount > 0 ? 0.5 : 0,
          color: "var(--good)",
          title: `${formatWeekRange(summary.weekStart)} — ${summary.complete ? "every goal met" : `${summary.doneCount} session${summary.doneCount === 1 ? "" : "s"}`}`,
        }))}
      />

      {tracked.map((progress) => (
        <Row
          key={progress.type}
          label={TYPE_META[progress.type].label}
          cells={summaries.map((summary) => {
            const cell = summary.byType.find((p) => p.type === progress.type);
            const done = cell?.done ?? 0;
            const min = cell?.min ?? 0;
            return {
              key: summary.weekStart,
              level: min > 0 && done >= min ? 1 : done > 0 ? 0.5 : 0,
              color: TYPE_META[progress.type].color,
              title: `${formatWeekRange(summary.weekStart)} — ${done} of ${min} ${TYPE_META[progress.type].label.toLowerCase()}`,
            };
          })}
        />
      ))}
    </div>
  );
}

type Cell = { key: string; level: number; color: string; title: string };

function Row({ label, cells, emphasis }: { label: string; cells: Cell[]; emphasis?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-20 flex-none truncate text-[11px] ${emphasis ? "font-semibold text-ink" : "text-ink-2"}`}
      >
        {label}
      </span>
      <div className="flex min-w-0 flex-1 gap-[2px]">
        {cells.map((cell) => (
          <span
            key={cell.key}
            title={cell.title}
            className="h-2.5 min-w-[4px] flex-1 rounded-[3px]"
            style={{
              background:
                cell.level === 1
                  ? cell.color
                  : cell.level === 0.5
                    ? `color-mix(in srgb, ${cell.color} 28%, var(--surface))`
                    : "var(--surface-sunken)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
