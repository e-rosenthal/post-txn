"use client";

import type { Workout } from "@/lib/types";
import { TYPE_META } from "@/lib/workoutMeta";
import { Icon } from "./ui";

/**
 * The whole row is the tick target. Marking a session done is the thing this
 * app exists to make effortless, so it gets the biggest, most forgiving hit
 * area on the page — editing hides behind a small button on the right.
 */
export function SessionRow({
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

  return (
    <li
      className="flex items-stretch border-t border-hair transition-colors first:border-t-0"
      style={{
        background: workout.done ? "color-mix(in srgb, var(--good) 7%, transparent)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={workout.done}
        aria-label={workout.done ? `Mark ${title} as not done` : `Mark ${title} as done`}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span className="tick" data-done={workout.done}>
          <Icon name="check" className="h-[18px] w-[18px]" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 flex-none rounded-full"
              style={{ background: meta.color }}
            />
            <span className="text-[15px] font-medium text-ink">{title}</span>
            {workout.strides ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] text-ink-2"
                style={{
                  border: `1px solid color-mix(in srgb, ${TYPE_META.strides.color} 55%, transparent)`,
                }}
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
            <span className="mt-0.5 block pl-4 text-[13px] leading-snug text-ink-2">
              {workout.detail}
            </span>
          ) : null}
        </span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${title}`}
        className="flex w-11 flex-none items-center justify-center text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
      >
        <Icon name="pencil" className="h-4 w-4" />
      </button>
    </li>
  );
}
