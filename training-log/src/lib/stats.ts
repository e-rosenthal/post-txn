import { addDays, weeksBetween } from "./dates";
import { TYPE_ORDER } from "./workoutMeta";
import type { Goals, Workout, WorkoutType } from "./types";

/**
 * Strides are the one type that double-counts: a run with strides tacked on
 * counts both as that run and as a strides session, which is how they actually
 * get done.
 */
export function countType(list: Workout[], type: WorkoutType): number {
  if (type === "strides") {
    return list.filter((w) => w.type === "strides" || w.strides).length;
  }
  return list.filter((w) => w.type === type).length;
}

export type TypeProgress = {
  type: WorkoutType;
  done: number;
  planned: number;
  min: number;
  stretch: number;
  metMin: boolean;
  metStretch: boolean;
};

export type WeekSummary = {
  weekStart: string;
  workouts: Workout[];
  byType: TypeProgress[];
  doneCount: number;
  plannedCount: number;
  /** Every goal with a `min` above zero was hit. */
  complete: boolean;
  /** Goals that are actually being tracked (min or stretch above zero). */
  tracked: TypeProgress[];
};

export function groupByWeek(workouts: Workout[]): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>();
  for (const w of workouts) {
    const bucket = map.get(w.weekStart);
    if (bucket) bucket.push(w);
    else map.set(w.weekStart, [w]);
  }
  return map;
}

export function summarizeWeek(weekStart: string, workouts: Workout[], goals: Goals): WeekSummary {
  const done = workouts.filter((w) => w.done);
  const byType = TYPE_ORDER.map((type): TypeProgress => {
    const goal = goals[type] ?? { min: 0, stretch: 0 };
    const doneCount = countType(done, type);
    return {
      type,
      done: doneCount,
      planned: countType(workouts, type),
      min: goal.min,
      stretch: goal.stretch,
      metMin: goal.min > 0 && doneCount >= goal.min,
      metStretch: goal.stretch > 0 && doneCount >= goal.stretch,
    };
  });
  const tracked = byType.filter((p) => p.min > 0 || p.stretch > 0);
  const required = byType.filter((p) => p.min > 0);
  return {
    weekStart,
    workouts,
    byType,
    tracked,
    doneCount: done.length,
    plannedCount: workouts.length,
    complete: required.length > 0 && required.every((p) => p.metMin),
  };
}

/** Every week from the first logged one through `currentWeek`, gaps included. */
export function weekRange(
  workouts: Workout[],
  currentWeek: string,
  limit?: number,
  minimum = 1,
): string[] {
  let first = currentWeek;
  for (const w of workouts) {
    if (w.weekStart < first) first = w.weekStart;
  }
  const span = weeksBetween(first, currentWeek) + 1;
  let count = limit ? Math.min(span, limit) : span;
  count = Math.max(count, Math.min(minimum, limit ?? minimum));
  const start = addDays(currentWeek, -(count - 1) * 7);
  return Array.from({ length: count }, (_, i) => addDays(start, i * 7));
}

export type Streaks = { current: number; best: number };

/**
 * A streak counts consecutive weeks where every required goal was met. The
 * current week only extends the streak once it's actually complete — a Tuesday
 * shouldn't look like a broken week.
 */
export function streaks(summaries: WeekSummary[], currentWeek: string): Streaks {
  let best = 0;
  let run = 0;
  for (const s of summaries) {
    if (s.complete) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = summaries.length - 1; i >= 0; i--) {
    const s = summaries[i];
    if (s.complete) {
      current += 1;
      continue;
    }
    // An in-progress current week is neutral, not a break.
    if (s.weekStart === currentWeek) continue;
    break;
  }
  return { current, best };
}

export type Totals = {
  sessionsDone: number;
  weeksLogged: number;
  recentAverage: number;
  completeWeeks: number;
};

export function totals(summaries: WeekSummary[], currentWeek: string): Totals {
  const sessionsDone = summaries.reduce((sum, s) => sum + s.doneCount, 0);
  const weeksLogged = summaries.filter((s) => s.doneCount > 0).length;
  // Average over finished weeks only, so a fresh Monday doesn't drag it down.
  const finished = summaries.filter((s) => s.weekStart !== currentWeek).slice(-4);
  const recentAverage = finished.length
    ? finished.reduce((sum, s) => sum + s.doneCount, 0) / finished.length
    : 0;
  return {
    sessionsDone,
    weeksLogged,
    recentAverage,
    completeWeeks: summaries.filter((s) => s.complete).length,
  };
}

export function buildSummaries(workouts: Workout[], weeks: string[], goals: Goals): WeekSummary[] {
  const grouped = groupByWeek(workouts);
  return weeks.map((weekStart) => summarizeWeek(weekStart, grouped.get(weekStart) ?? [], goals));
}
