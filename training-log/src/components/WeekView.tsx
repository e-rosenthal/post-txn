"use client";

import { useMemo, useState } from "react";
import {
  DAY_NAMES,
  DAY_NAMES_LONG,
  addDays,
  formatShort,
  formatWeekRange,
  startOfWeek,
  weekDays,
  yearOf,
} from "@/lib/dates";
import { buildSummaries, streaks, summarizeWeek, weekRange } from "@/lib/stats";
import { useToday } from "@/lib/useToday";
import type { Workout } from "@/lib/types";
import { useAppData } from "./AppData";
import { GoalMeters } from "./GoalMeters";
import { WorkoutEditor, type EditorTarget, type EditorValues } from "./WorkoutEditor";
import { WorkoutRow } from "./WorkoutRow";
import { Banner, Button, Icon } from "./ui";

export function WeekView() {
  const { ready, error, workouts, settings, addWorkout, patchWorkout, removeWorkout, applyWeek } =
    useAppData();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const currentWeek = today ? startOfWeek(today) : null;
  const weekStart = currentWeek ? addDays(currentWeek, offset * 7) : null;

  const summary = useMemo(() => {
    if (!weekStart) return null;
    const inWeek = workouts.filter((w) => w.date >= weekStart && w.date <= addDays(weekStart, 6));
    return summarizeWeek(weekStart, inWeek, settings.goals);
  }, [workouts, weekStart, settings.goals]);

  const streak = useMemo(() => {
    if (!currentWeek) return { current: 0, best: 0 };
    const weeks = weekRange(workouts, currentWeek);
    return streaks(buildSummaries(workouts, weeks, settings.goals), currentWeek);
  }, [workouts, currentWeek, settings.goals]);

  if (!ready || !today || !weekStart || !summary || !currentWeek) {
    return <LoadingWeek />;
  }

  const byDay = new Map<string, Workout[]>();
  for (const day of weekDays(weekStart)) byDay.set(day, []);
  for (const w of summary.workouts) byDay.get(w.date)?.push(w);

  const plannedRemaining = summary.workouts.filter((w) => !w.done).length;

  async function fill(source: "template" | "week") {
    if (!weekStart) return;
    if (plannedRemaining > 0) {
      const ok = window.confirm(
        `Replace the ${plannedRemaining} unfinished session${plannedRemaining === 1 ? "" : "s"} in this week? Anything already ticked off stays.`,
      );
      if (!ok) return;
    }
    await applyWeek({
      weekStart,
      source,
      sourceWeekStart: source === "week" ? addDays(weekStart, -7) : undefined,
      replace: true,
    });
  }

  function saveEditor(values: EditorValues) {
    if (!editing) return;
    if (editing.mode === "edit") {
      void patchWorkout(editing.workout.id, values);
    } else {
      void addWorkout({ ...values, position: (byDay.get(values.date)?.length ?? 0) });
    }
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Banner>{error}</Banner> : null}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">
            <Icon name="left" />
          </Button>
          <div className="min-w-[11rem] text-center">
            <h1 className="text-lg font-semibold tracking-tight">{formatWeekRange(weekStart)}</h1>
            <p className="text-xs text-ink-3">{relativeWeek(offset, weekStart, currentWeek)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next week">
            <Icon name="right" />
          </Button>
          {offset !== 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Today
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {summary.complete ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium"
              style={{ border: "1px solid var(--good)", color: "var(--good-ink)" }}
            >
              <Icon name="check" className="h-3.5 w-3.5" />
              Week complete
            </span>
          ) : null}
          {streak.current > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hair-2 px-2.5 py-1 text-[13px] text-ink-2">
              <Icon name="spark" className="h-3.5 w-3.5" />
              {streak.current} week{streak.current === 1 ? "" : "s"} on plan
            </span>
          ) : null}
        </div>
      </header>

      <section aria-label="Weekly goals">
        <GoalMeters progress={summary.tracked} />
      </section>

      <section className="card overflow-hidden" aria-label="Sessions this week">
        <ul>
          {weekDays(weekStart).map((day) => {
            const items = byDay.get(day) ?? [];
            const isToday = day === today;
            return (
              <li key={day} className="flex gap-3 border-t border-hair px-3 py-2.5 first:border-t-0 sm:px-4">
                <div className="w-16 flex-none pt-1.5">
                  <div
                    className={`inline-flex items-center rounded-full text-[13px] font-semibold ${
                      isToday ? "bg-ink px-2 py-0.5 text-plane" : "text-ink"
                    }`}
                  >
                    {DAY_NAMES[weekDays(weekStart).indexOf(day)]}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-3">{formatShort(day)}</div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {items.map((workout) => (
                    <WorkoutRow
                      key={workout.id}
                      workout={workout}
                      onToggle={() => void patchWorkout(workout.id, { done: !workout.done })}
                      onEdit={() => setEditing({ mode: "edit", workout })}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditing({ mode: "create", date: day })}
                    aria-label={`Add a session on ${DAY_NAMES_LONG[weekDays(weekStart).indexOf(day)]} ${formatShort(day)}`}
                    className="flex items-center gap-1.5 self-start rounded-lg px-1.5 py-1 text-[13px] text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    {items.length === 0 ? "Add a session" : "Add"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void fill("template")}>
          <Icon name="spark" className="h-3.5 w-3.5" />
          Fill from my template
        </Button>
        <Button variant="outline" size="sm" onClick={() => void fill("week")}>
          <Icon name="copy" className="h-3.5 w-3.5" />
          Copy last week
        </Button>
        <p className="text-xs text-ink-3">
          {summary.doneCount} done{summary.plannedCount > summary.doneCount
            ? ` · ${summary.plannedCount - summary.doneCount} still planned`
            : ""}
        </p>
      </section>

      {editing ? (
        <WorkoutEditor
          key={editing.mode === "edit" ? editing.workout.id : `new-${editing.date}`}
          target={editing}
          onClose={() => setEditing(null)}
          onSave={saveEditor}
          onDelete={(workout) => {
            void removeWorkout(workout.id);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** "This week", "3 weeks ago", and the year once it stops being the current one. */
function relativeWeek(offset: number, weekStart: string, currentWeek: string): string {
  const label =
    offset === 0
      ? "This week"
      : offset === 1
        ? "Next week"
        : offset === -1
          ? "Last week"
          : offset > 0
            ? `In ${offset} weeks`
            : `${-offset} weeks ago`;
  const year = yearOf(weekStart);
  return year === yearOf(currentWeek) ? label : `${label} · ${year}`;
}

function LoadingWeek() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-sunken" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-sunken" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-sunken" />
    </div>
  );
}
