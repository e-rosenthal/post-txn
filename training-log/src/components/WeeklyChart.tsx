"use client";

import { useState } from "react";
import { formatWeekRange, parseISO } from "@/lib/dates";
import type { WeekSummary } from "@/lib/stats";
import { TYPE_META, TYPE_ORDER } from "@/lib/workoutMeta";
import type { WorkoutType } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PLOT_HEIGHT = 200;

type Column = {
  weekStart: string;
  total: number;
  segments: { type: WorkoutType; count: number }[];
};

/**
 * Sessions completed per week, stacked by type. Strides tacked onto a run are
 * counted with that run, so a bar is always a true session count.
 */
export function WeeklyChart({ summaries }: { summaries: WeekSummary[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const columns: Column[] = summaries.map((summary) => {
    const done = summary.workouts.filter((w) => w.done);
    const segments = TYPE_ORDER.map((type) => ({
      type,
      count: done.filter((w) => w.type === type).length,
    })).filter((s) => s.count > 0);
    return { weekStart: summary.weekStart, total: done.length, segments };
  });

  const peak = Math.max(6, ...columns.map((c) => c.total));
  const ticks = niceTicks(peak);
  const max = ticks[ticks.length - 1];
  const active = hover === null ? null : columns[hover];

  // Only legend the types that actually appear, so the key matches the plot.
  const present = TYPE_ORDER.filter((type) => columns.some((c) => c.segments.some((s) => s.type === type)));
  const legend = present.length > 0 ? present : TYPE_ORDER;

  return (
    <figure className="m-0">
      {/* pt leaves room for the topmost tick label, which is centred on the gridline */}
      <div className="relative flex gap-2 pt-2">
        {/* y axis */}
        <div
          className="relative w-6 flex-none"
          style={{ height: PLOT_HEIGHT }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="tnum absolute right-0 -translate-y-1/2 text-[11px] text-ink-3"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* gridlines: solid hairlines, one shade off the surface */}
          <div className="pointer-events-none absolute inset-0" style={{ height: PLOT_HEIGHT }} aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute inset-x-0 block h-px"
                style={{
                  bottom: `${(tick / max) * 100}%`,
                  background: tick === 0 ? "var(--axis)" : "var(--grid)",
                }}
              />
            ))}
          </div>

          <div className="relative flex items-end gap-[3px]" style={{ height: PLOT_HEIGHT }}>
            {columns.map((column, index) => (
              <button
                key={column.weekStart}
                type="button"
                className="group relative flex h-full min-w-[6px] flex-1 flex-col items-center justify-end rounded-sm"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover((h) => (h === index ? null : h))}
                onFocus={() => setHover(index)}
                onBlur={() => setHover((h) => (h === index ? null : h))}
                aria-label={`Week of ${formatWeekRange(column.weekStart)}: ${column.total} session${column.total === 1 ? "" : "s"}`}
              >
                <span
                  className="pointer-events-none absolute inset-0 rounded-sm transition-colors"
                  style={{ background: hover === index ? "var(--surface-sunken)" : "transparent" }}
                />
                <span
                  className="relative flex w-full max-w-[26px] flex-col-reverse gap-[2px]"
                  style={{ height: `${(column.total / max) * 100}%` }}
                >
                  {column.segments.map((segment, i) => (
                    <span
                      key={segment.type}
                      className="block w-full"
                      style={{
                        flex: `${segment.count} 1 0`,
                        minHeight: 3,
                        background: TYPE_META[segment.type].color,
                        borderRadius: i === column.segments.length - 1 ? "4px 4px 0 0" : 0,
                      }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-1.5 flex gap-[3px]" aria-hidden="true">
            {columns.map((column, index) => (
              <span key={column.weekStart} className="min-w-[6px] flex-1 text-center text-[10px] text-ink-3">
                {monthTick(columns, index)}
              </span>
            ))}
          </div>

          {active ? <Tooltip column={active} index={hover ?? 0} count={columns.length} /> : null}
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {legend.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: TYPE_META[type].color }}
            />
            {TYPE_META[type].label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function Tooltip({ column, index, count }: { column: Column; index: number; count: number }) {
  // Flip the card to the other side near the right edge so it never clips.
  const leftHalf = index < count / 2;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-2 z-10 w-44 rounded-xl border border-hair bg-surface p-2.5 shadow-lg"
      style={leftHalf ? { left: `${((index + 1) / count) * 100}%`, marginLeft: 8 } : { right: `${((count - index) / count) * 100}%`, marginRight: 8 }}
    >
      <p className="text-[12px] font-semibold text-ink">{formatWeekRange(column.weekStart)}</p>
      <p className="mb-1.5 text-[11px] text-ink-3">
        {column.total} session{column.total === 1 ? "" : "s"} done
      </p>
      {column.segments.length === 0 ? (
        <p className="text-[11px] text-ink-3">Nothing logged</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {column.segments.map((segment) => (
            <li key={segment.type} className="flex items-center justify-between gap-2 text-[11px] text-ink-2">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: TYPE_META[segment.type].color }}
                />
                {TYPE_META[segment.type].label}
              </span>
              <span className="tnum text-ink">{segment.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Label the first week of each month, and always the first column. */
function monthTick(columns: Column[], index: number): string {
  const month = parseISO(columns[index].weekStart).getUTCMonth();
  if (index === 0) return MONTHS[month];
  const previous = parseISO(columns[index - 1].weekStart).getUTCMonth();
  if (month === previous) return "";
  // With many columns, drop every other label so they don't collide.
  const spacing = columns.length > 30 ? 2 : 1;
  return index % spacing === 0 || spacing === 1 ? MONTHS[month] : "";
}

function niceTicks(peak: number): number[] {
  const step = peak <= 8 ? 2 : peak <= 16 ? 4 : 5;
  const top = Math.ceil(peak / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}
