"use client";

import { useState } from "react";
import { DAY_NAMES_LONG } from "@/lib/dates";
import {
  DEFAULT_SETTINGS,
  WORKOUT_TYPES,
  type Goal,
  type TemplateItem,
  type WorkoutType,
} from "@/lib/types";
import { TYPE_META } from "@/lib/workoutMeta";
import { useAppData } from "./AppData";
import { TemplateItemEditor } from "./TemplateItemEditor";
import { Banner, Button, Card, Icon, SectionTitle, TypeDot } from "./ui";

export function PlanView() {
  const { ready, error, settings, backend, saveSettings } = useAppData();
  const [editing, setEditing] = useState<TemplateItem | null>(null);

  if (!ready) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-sunken" />
        <div className="h-64 animate-pulse rounded-2xl bg-sunken" />
      </div>
    );
  }

  function setGoal(type: WorkoutType, next: Goal) {
    const min = Math.max(0, Math.min(14, next.min));
    void saveSettings({
      ...settings,
      goals: { ...settings.goals, [type]: { min, stretch: Math.max(min, Math.min(14, next.stretch)) } },
    });
  }

  function upsertTemplateItem(item: TemplateItem) {
    const exists = settings.template.some((t) => t.id === item.id);
    const template = exists
      ? settings.template.map((t) => (t.id === item.id ? item : t))
      : [...settings.template, item];
    void saveSettings({ ...settings, template });
    setEditing(null);
  }

  function removeTemplateItem(item: TemplateItem) {
    void saveSettings({ ...settings, template: settings.template.filter((t) => t.id !== item.id) });
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Banner>{error}</Banner> : null}

      <header>
        <h1 className="text-lg font-semibold tracking-tight">Your plan</h1>
        <p className="text-sm text-ink-2">
          What a normal week looks like. Changes save as you make them.
        </p>
      </header>

      <Card className="p-4">
        <SectionTitle hint="Goal / stretch">Weekly goals</SectionTitle>
        <ul className="flex flex-col">
          {WORKOUT_TYPES.map((type) => {
            const goal = settings.goals[type];
            return (
              <li
                key={type}
                className="flex items-center justify-between gap-3 border-t border-hair py-2.5 first:border-t-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <TypeDot type={type} />
                  <span className="truncate text-sm text-ink">{TYPE_META[type].label}</span>
                  {goal.min === 0 ? (
                    <span className="text-[11px] text-ink-3">not tracked</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  <Stepper
                    label={`${TYPE_META[type].label} goal`}
                    value={goal.min}
                    onChange={(min) => setGoal(type, { ...goal, min })}
                  />
                  <span className="text-ink-3">–</span>
                  <Stepper
                    label={`${TYPE_META[type].label} stretch`}
                    value={goal.stretch}
                    onChange={(stretch) => setGoal(type, { ...goal, stretch })}
                  />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-ink-3">
          Goal is the number you commit to; stretch is the good-week number. A run with strides
          counts toward both that run&apos;s goal and the strides goal.
        </p>
      </Card>

      <Card className="p-4">
        <SectionTitle
          hint={
            <button
              type="button"
              className="text-ink-3 underline underline-offset-2 hover:text-ink"
              onClick={() => {
                if (window.confirm("Reset the template back to the starting week?")) {
                  void saveSettings({ ...settings, template: DEFAULT_SETTINGS.template });
                }
              }}
            >
              Reset
            </button>
          }
        >
          Template week
        </SectionTitle>

        <ul className="flex flex-col">
          {DAY_NAMES_LONG.map((name, day) => {
            const items = settings.template.filter((t) => t.day === day);
            return (
              <li key={name} className="flex gap-3 border-t border-hair py-2 first:border-t-0">
                <span className="w-24 flex-none pt-1.5 text-[13px] font-medium text-ink">{name}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEditing(item)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-hair px-2.5 py-1 text-[13px] text-ink transition-colors hover:bg-sunken"
                      style={{ borderLeft: `3px solid ${TYPE_META[item.type].color}` }}
                    >
                      {item.title || TYPE_META[item.type].defaultTitle}
                      {item.strides ? <span className="text-[11px] text-ink-3">+ strides</span> : null}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: `t${Date.now().toString(36)}`,
                        day,
                        type: "easy",
                        title: "",
                        detail: "",
                        strides: false,
                      })
                    }
                    aria-label={`Add a template session on ${name}`}
                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[13px] text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    {items.length === 0 ? "Rest day" : "Add"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-ink-3">
          The Week tab&apos;s &ldquo;Fill from my template&rdquo; button drops this into any week.
        </p>
      </Card>

      <Card className="p-4">
        <SectionTitle>Your data</SectionTitle>
        <p className="text-sm text-ink-2">
          {backend === "postgres"
            ? "Saving to your Postgres database. Everything you tick off is stored server-side."
            : "Saving to a local JSON file in .data/ — that is the development backend. Set DATABASE_URL to use Postgres."}
        </p>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/workouts", "_blank")}>
            Export raw JSON
          </Button>
        </div>
      </Card>

      {editing ? (
        <TemplateItemEditor
          key={editing.id}
          item={editing}
          onClose={() => setEditing(null)}
          onSave={upsertTemplateItem}
          onDelete={removeTemplateItem}
        />
      ) : null}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-hair p-0.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label={`Decrease ${label}`}
        className="grid h-6 w-6 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30"
      >
        −
      </button>
      <span className="tnum w-5 text-center text-sm font-medium text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= 14}
        aria-label={`Increase ${label}`}
        className="grid h-6 w-6 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30"
      >
        +
      </button>
    </span>
  );
}
