"use client";

import { useMemo, useState } from "react";
import { formatWeekRange, startOfWeek } from "@/lib/dates";
import { buildSummaries, streaks, totals, weekRange } from "@/lib/stats";
import { useToday } from "@/lib/useToday";
import { TYPE_META, TYPE_ORDER } from "@/lib/workoutMeta";
import { useAppData } from "./AppData";
import { WeeklyChart } from "./WeeklyChart";
import { Banner, Button, Card, Icon, SectionTitle } from "./ui";

const RANGES = [
  { label: "12 weeks", weeks: 12 },
  { label: "26 weeks", weeks: 26 },
  { label: "1 year", weeks: 52 },
];

export function StatsView() {
  const { ready, error, workouts, settings } = useAppData();
  const today = useToday();
  const [range, setRange] = useState(12);
  const [showTable, setShowTable] = useState(false);

  const currentWeek = today ? startOfWeek(today) : null;

  const { summaries, allSummaries } = useMemo(() => {
    if (!currentWeek) return { summaries: [], allSummaries: [] };
    return {
      summaries: buildSummaries(workouts, weekRange(workouts, currentWeek, range, 8), settings.goals),
      allSummaries: buildSummaries(workouts, weekRange(workouts, currentWeek), settings.goals),
    };
  }, [workouts, currentWeek, range, settings.goals]);

  if (!ready || !currentWeek) return <LoadingStats />;

  const streak = streaks(allSummaries, currentWeek);
  const stats = totals(allSummaries, currentWeek);
  const hasData = stats.sessionsDone > 0;

  return (
    <div className="flex flex-col gap-6">
      {error ? <Banner>{error}</Banner> : null}

      <header>
        <h1 className="text-lg font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-ink-2">
          The totals and trends behind the consistency grid on your home screen.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat value={streak.current} unit={streak.current === 1 ? "week" : "weeks"} label="Current streak" hint="Weeks with every goal met" />
        <Stat value={streak.best} unit={streak.best === 1 ? "week" : "weeks"} label="Best streak" />
        <Stat value={stats.sessionsDone} label="Sessions done" hint={`Across ${stats.weeksLogged} week${stats.weeksLogged === 1 ? "" : "s"}`} />
        <Stat
          value={stats.recentAverage ? Math.round(stats.recentAverage * 10) / 10 : 0}
          label="Per week"
          hint="Average of the last 4 weeks"
        />
      </div>

      {/* One filter row above everything it scopes. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border border-hair p-0.5">
          {RANGES.map((option) => (
            <button
              key={option.weeks}
              type="button"
              onClick={() => setRange(option.weeks)}
              aria-pressed={range === option.weeks}
              className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
                range === option.weeks ? "bg-ink text-plane" : "text-ink-2 hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          <Icon name={showTable ? "chart" : "table"} className="h-3.5 w-3.5" />
          {showTable ? "Show charts" : "Show table"}
        </Button>
      </div>

      {!hasData ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-2">
            Nothing logged yet. Tick off a session on the Week tab and it will show up here.
          </p>
        </Card>
      ) : showTable ? (
        <Card className="overflow-x-auto p-4">
          <SectionTitle>Week by week</SectionTitle>
          <WeekTable summaries={[...summaries].reverse()} />
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <SectionTitle hint="Sessions completed">Weekly volume</SectionTitle>
            <WeeklyChart summaries={summaries} />
            <p className="mt-3 text-[11px] text-ink-3">
              Strides tacked onto a run are counted with that run, so each bar is a true session count.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  value,
  unit,
  label,
  hint,
}: {
  value: number;
  unit?: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="card p-3.5">
      <p className="text-3xl leading-none font-semibold tracking-tight text-ink">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-ink-3">{unit}</span> : null}
      </p>
      <p className="mt-2 text-[13px] font-medium text-ink">{label}</p>
      {hint ? <p className="text-[11px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

function WeekTable({ summaries }: { summaries: ReturnType<typeof buildSummaries> }) {
  return (
    <table className="w-full min-w-[34rem] text-left text-[13px]">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-ink-3">
          <th scope="col" className="py-2 pr-3 font-medium">Week</th>
          {TYPE_ORDER.map((type) => (
            <th key={type} scope="col" className="py-2 pr-3 text-right font-medium">
              {TYPE_META[type].short}
            </th>
          ))}
          <th scope="col" className="py-2 pr-3 text-right font-medium">Total</th>
          <th scope="col" className="py-2 text-right font-medium">Goals</th>
        </tr>
      </thead>
      <tbody>
        {summaries.map((summary) => (
          <tr key={summary.weekStart} className="border-t border-hair">
            <th scope="row" className="py-2 pr-3 font-normal text-ink">
              {formatWeekRange(summary.weekStart)}
            </th>
            {TYPE_ORDER.map((type) => {
              const cell = summary.byType.find((p) => p.type === type);
              return (
                <td key={type} className="tnum py-2 pr-3 text-right text-ink-2">
                  {cell?.done ? cell.done : <span className="text-ink-3">—</span>}
                </td>
              );
            })}
            <td className="tnum py-2 pr-3 text-right font-medium text-ink">{summary.doneCount}</td>
            <td className="py-2 text-right">
              {summary.complete ? (
                <span style={{ color: "var(--good-ink)" }} className="inline-flex items-center gap-1">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  <span className="text-[11px]">met</span>
                </span>
              ) : (
                <span className="text-[11px] text-ink-3">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LoadingStats() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-sunken" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-sunken" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-sunken" />
    </div>
  );
}
