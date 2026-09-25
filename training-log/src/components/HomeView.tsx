"use client";

import { useMemo, useState } from "react";
import { addDays, formatWeekRange, startOfWeek, yearOf } from "@/lib/dates";
import { buildSummaries, streaks, summarizeWeek, weekRange } from "@/lib/stats";
import { useToday } from "@/lib/useToday";
import { useAppData } from "./AppData";
import { ConsistencyGrid } from "./ConsistencyGrid";
import { SessionRow } from "./SessionRow";
import { WorkoutEditor, type EditorTarget, type EditorValues } from "./WorkoutEditor";
import { Banner, Button, Card, Icon, SectionTitle } from "./ui";

const GRID_WEEKS = 12;

/**
 * The home screen does two things and nothing else: let you tick off this
 * week's sessions, and show the weeks stacking up behind you. Totals and charts
 * live on the Stats tab.
 */
export function HomeView() {
  const { ready, error, workouts, settings, patchWorkout, addWorkout, removeWorkout, applyWeek } =
    useAppData();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const currentWeek = today ? startOfWeek(today) : null;
  const weekStart = currentWeek ? addDays(currentWeek, offset * 7) : null;

  const summary = useMemo(() => {
    if (!weekStart) return null;
    return summarizeWeek(
      weekStart,
      workouts.filter((w) => w.weekStart === weekStart),
      settings.goals,
    );
  }, [workouts, weekStart, settings.goals]);

  const { streak, gridSummaries } = useMemo(() => {
    if (!currentWeek) return { streak: { current: 0, best: 0 }, gridSummaries: [] };
    const all = buildSummaries(workouts, weekRange(workouts, currentWeek), settings.goals);
    return {
      streak: streaks(all, currentWeek),
      gridSummaries: buildSummaries(
        workouts,
        weekRange(workouts, currentWeek, GRID_WEEKS, GRID_WEEKS),
        settings.goals,
      ),
    };
  }, [workouts, currentWeek, settings.goals]);

  if (!ready || !today || !weekStart || !summary || !currentWeek) return <LoadingHome />;

  const sessions = summary.workouts;

  async function fill(source: "template" | "week") {
    if (!weekStart) return;
    const unfinished = sessions.filter((w) => !w.done).length;
    if (unfinished > 0) {
      const ok = window.confirm(
        `Replace the ${unfinished} unfinished session${unfinished === 1 ? "" : "s"} in this week? Anything already ticked off stays.`,
      );
      if (!ok) return;
    }
    await applyWeek({ weekStart, source, replace: true });
  }

  function saveEditor(values: EditorValues) {
    if (!editing || !weekStart) return;
    if (editing.mode === "edit") void patchWorkout(editing.workout.id, values);
    else void addWorkout({ ...values, weekStart, position: sessions.length });
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Banner>{error}</Banner> : null}

      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">
            <Icon name="left" />
          </Button>
          <div className="min-w-[10rem] text-center">
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

        {streak.current > 0 ? (
          <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-hair-2 px-2.5 py-1 text-[13px] text-ink-2">
            <Icon name="spark" className="h-3.5 w-3.5" />
            {streak.current} week{streak.current === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      <Card className="overflow-hidden">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-ink-2">Nothing planned for this week yet.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="sm" onClick={() => void fill("template")}>
                Use my template
              </Button>
              <Button variant="outline" size="sm" onClick={() => void fill("week")}>
                Copy last week
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul>
              {sessions.map((workout) => (
                <SessionRow
                  key={workout.id}
                  workout={workout}
                  onToggle={() => void patchWorkout(workout.id, { done: !workout.done })}
                  onEdit={() => setEditing({ mode: "edit", workout })}
                />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-hair px-3 py-2 sm:px-4">
              <button
                type="button"
                onClick={() => setEditing({ mode: "create" })}
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add a session
              </button>
              <span className="tnum text-[13px] text-ink-2">
                {summary.doneCount} of {sessions.length} done
                {summary.complete ? (
                  <span style={{ color: "var(--good-ink)" }}> · goals met</span>
                ) : null}
              </span>
            </div>
          </>
        )}
      </Card>

      {sessions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => void fill("template")}>
            <Icon name="spark" className="h-3.5 w-3.5" />
            Use my template
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void fill("week")}>
            <Icon name="copy" className="h-3.5 w-3.5" />
            Copy last week
          </Button>
        </div>
      ) : null}

      <Card className="p-4">
        <SectionTitle hint="Filled means the goal was met">Consistency</SectionTitle>
        <ConsistencyGrid summaries={gridSummaries} />
        <p className="mt-3 text-[11px] text-ink-3">
          Each column is one week. The last one is this week.
        </p>
      </Card>

      {editing ? (
        <WorkoutEditor
          key={editing.mode === "edit" ? editing.workout.id : "new"}
          target={editing}
          weekLabel={formatWeekRange(weekStart)}
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

function LoadingHome() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="h-9 w-44 animate-pulse rounded-lg bg-sunken" />
      <div className="h-72 animate-pulse rounded-2xl bg-sunken" />
      <div className="h-40 animate-pulse rounded-2xl bg-sunken" />
    </div>
  );
}
