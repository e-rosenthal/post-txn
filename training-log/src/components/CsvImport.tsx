"use client";

import { useMemo, useRef, useState } from "react";
import { EXAMPLE_CSV, parsePlanCsv, resolveWeeks, summarize, type DraftWeek } from "@/lib/csv";
import { formatWeekRange, startOfWeek, todayISO } from "@/lib/dates";
import { TYPE_META } from "@/lib/workoutMeta";
import { useAppData } from "./AppData";
import { Button, Icon, SectionTitle, Toggle } from "./ui";

/**
 * Upload a training plan as a CSV: one row per week, one column per session
 * type. Parsing happens here so the preview is instant and nothing reaches the
 * server until it looks right.
 */
export function CsvImport() {
  const { importPlan } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [startWeek, setStartWeek] = useState(() => startOfWeek(todayISO()));
  const [replace, setReplace] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parsePlanCsv(text) : null), [text]);
  const weeks: DraftWeek[] = useMemo(() => {
    if (!parsed) return [];
    return parsed.needsStartWeek ? resolveWeeks(parsed.weeks, startWeek) : parsed.weeks;
  }, [parsed, startWeek]);

  const totals = summarize(weeks);
  const ready = weeks.length > 0 && weeks.every((w) => w.weekStart);

  async function readFile(file: File) {
    setStatus(null);
    setText(await file.text());
  }

  async function runImport() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await importPlan(
        weeks.map((week) => ({
          weekStart: week.weekStart as string,
          sessions: week.sessions.map(({ type, title, detail, strides }) => ({
            type,
            title,
            detail,
            strides,
          })),
        })),
        replace,
      );
      setStatus(
        `Imported ${result.created} session${result.created === 1 ? "" : "s"} across ${weeks.length} week${weeks.length === 1 ? "" : "s"}` +
          (result.removed > 0 ? `, replacing ${result.removed} unfinished.` : "."),
      );
      setText("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadExample() {
    const url = URL.createObjectURL(new Blob([EXAMPLE_CSV], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "training-plan-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card p-4">
      <SectionTitle hint="One row per week">Import a plan</SectionTitle>

      <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
        A <code className="text-ink">week</code> column (a date or a week number), then one column
        per session type. Use <code className="text-ink">|</code> for two sessions of the same type
        in a week, and add <code className="text-ink">+strides</code> to a run to tack strides on.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
        <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" className="h-3.5 w-3.5" />
          Choose a CSV
        </Button>
        <Button variant="outline" size="sm" onClick={downloadExample}>
          <Icon name="download" className="h-3.5 w-3.5" />
          Example file
        </Button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-2">…or paste it here</span>
        <textarea
          rows={4}
          value={text}
          spellCheck={false}
          placeholder={EXAMPLE_CSV.split("\n").slice(0, 2).join("\n")}
          onChange={(event) => setText(event.target.value)}
          className="font-mono !text-[12px]"
        />
      </label>

      {parsed ? (
        <div className="mt-4 flex flex-col gap-3">
          {parsed.errors.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-xl px-3 py-2" style={{ border: "1px solid color-mix(in srgb, #d03b3b 40%, transparent)" }}>
              {parsed.errors.slice(0, 6).map((message) => (
                <li key={message} className="text-[12px] text-ink-2">
                  {message}
                </li>
              ))}
            </ul>
          ) : null}

          {parsed.ignored.length > 0 ? (
            <p className="text-[12px] text-ink-3">
              Ignored column{parsed.ignored.length === 1 ? "" : "s"}: {parsed.ignored.join(", ")}
            </p>
          ) : null}

          {parsed.needsStartWeek ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-2">
                Your plan uses week numbers — which week is week one?
              </span>
              <input
                type="date"
                value={startWeek}
                onChange={(event) =>
                  event.target.value && setStartWeek(startOfWeek(event.target.value))
                }
              />
            </label>
          ) : null}

          {weeks.length > 0 ? (
            <>
              <p className="text-[13px] text-ink-2">
                <span className="font-medium text-ink">
                  {weeks.length} week{weeks.length === 1 ? "" : "s"}, {totals.sessions} session
                  {totals.sessions === 1 ? "" : "s"}
                </span>
                {totals.firstWeek ? ` · starting ${formatWeekRange(totals.firstWeek)}` : ""}
              </p>

              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-hair p-2">
                {weeks.map((week, i) => (
                  <li key={`${week.label}-${i}`} className="flex items-baseline gap-2 px-1 py-1">
                    <span className="w-24 flex-none text-[12px] text-ink-3">
                      {week.weekStart ? formatWeekRange(week.weekStart) : `Week ${week.weekNumber}`}
                    </span>
                    <span className="flex min-w-0 flex-wrap gap-1.5">
                      {week.sessions.map((session, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 text-[12px] text-ink-2"
                          title={session.detail}
                        >
                          <span
                            aria-hidden="true"
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: TYPE_META[session.type].color }}
                          />
                          {TYPE_META[session.type].short}
                          {session.strides ? <span className="text-ink-3">+strides</span> : null}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>

              <Toggle
                checked={replace}
                onChange={setReplace}
                label="Replace what's already planned in those weeks"
                hint="Sessions you've already ticked off are never removed"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => void runImport()} disabled={!ready || busy}>
                  {busy ? "Importing…" : `Import ${weeks.length} week${weeks.length === 1 ? "" : "s"}`}
                </Button>
                <Button variant="ghost" onClick={() => setText("")} disabled={busy}>
                  Clear
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {status ? (
        <p className="mt-3 text-[13px]" style={{ color: "var(--good-ink)" }} role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
