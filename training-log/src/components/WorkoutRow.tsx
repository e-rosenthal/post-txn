"use client";

import type { Workout } from "@/lib/types";
import { TYPE_META } from "@/lib/workoutMeta";
import { Icon } from "./ui";

export function WorkoutRow({
  workout,
  onToggle,
  onEdit,
}: {
  workout: Workout;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const meta = TYPE_META[workout.type];
  const title = workout.title || meta.defaultTitle;
  // "Strength — Strength" is noise; only name the type when the title differs.
  const showTypeLabel = title.trim().toLowerCase() !== meta.label.toLowerCase();

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-hair py-2 pr-2.5 pl-2 transition-colors"
      style={{
        borderLeft: `3px solid ${meta.color}`,
        background: workout.done
          ? "color-mix(in srgb, var(--good) 7%, var(--surface))"
          : "var(--surface)",
      }}
    >
      <button
        type="button"
        className="tick mt-0.5"
        data-done={workout.done}
        onClick={onToggle}
        aria-pressed={workout.done}
        aria-label={workout.done ? `Mark ${title} as not done` : `Mark ${title} as done`}
      >
        <Icon name="check" className="h-4 w-4" />
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-ink">{title}</span>
          {showTypeLabel ? <span className="text-[11px] text-ink-3">{meta.label}</span> : null}
          {workout.strides ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] text-ink-2"
              style={{ border: `1px solid color-mix(in srgb, ${TYPE_META.strides.color} 55%, transparent)` }}
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: TYPE_META.strides.color }}
              />
              strides
            </span>
          ) : null}
        </span>
        {workout.detail ? (
          <span className="mt-0.5 block text-xs leading-snug text-ink-2">{workout.detail}</span>
        ) : null}
      </button>
    </div>
  );
}
