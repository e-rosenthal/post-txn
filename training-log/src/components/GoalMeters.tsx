"use client";

import type { TypeProgress } from "@/lib/stats";
import { TYPE_META } from "@/lib/workoutMeta";
import { Icon } from "./ui";

/**
 * One meter per tracked goal. Colour marks identity; the `done/target` figure
 * and the check carry the "am I there yet" meaning, so nothing is colour-only.
 */
function Meter({ progress }: { progress: TypeProgress }) {
  const slots = Math.max(progress.stretch, progress.min, progress.done, 1);
  const meta = TYPE_META[progress.type];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hair bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 flex-none rounded-full"
            style={{ background: meta.color }}
          />
          {meta.label}
        </span>
        <span className="flex items-center gap-1">
          <span className="tnum text-[13px] font-semibold text-ink">
            {progress.done}
            <span className="font-normal text-ink-3">/{slots}</span>
          </span>
          {progress.metMin ? (
            <span style={{ color: "var(--good-ink)" }} title="Goal met">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </span>
      </div>

      <div
        className="flex h-1.5 gap-[2px]"
        role="img"
        aria-label={`${progress.done} done, goal ${progress.min}${progress.stretch > progress.min ? ` to ${progress.stretch}` : ""}`}
      >
        {Array.from({ length: slots }, (_, i) => {
          const filled = i < progress.done;
          const required = i < progress.min;
          return (
            <span
              key={i}
              className="flex-1 rounded-[3px]"
              style={{
                background: filled ? meta.color : required ? "var(--surface-sunken)" : "transparent",
                border: filled || required ? "none" : "1px solid var(--hairline)",
              }}
            />
          );
        })}
      </div>

      <p className="text-[11px] leading-tight text-ink-3">
        {progress.stretch > progress.min
          ? `Goal ${progress.min}, up to ${progress.stretch}`
          : meta.blurb}
      </p>
    </div>
  );
}

export function GoalMeters({ progress }: { progress: TypeProgress[] }) {
  if (progress.length === 0) {
    return <p className="text-sm text-ink-3">No weekly goals set yet — add them on the Plan tab.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {progress.map((p) => (
        <Meter key={p.type} progress={p} />
      ))}
    </div>
  );
}
