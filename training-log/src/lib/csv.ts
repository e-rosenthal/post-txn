import { addDays, startOfWeek, toISO } from "./dates";
import { WORKOUT_TYPES, type WorkoutType } from "./types";
import { TYPE_META } from "./workoutMeta";

/**
 * Training plans are written a week at a time — "this week: one long run, one
 * threshold, two easy" — so the CSV is one row per week and one column per
 * session type. Two sessions of the same type in a week are separated with `|`,
 * and `+strides` on a run tacks strides onto it.
 */

export type DraftSession = {
  type: WorkoutType;
  title: string;
  detail: string;
  strides: boolean;
};

export type DraftWeek = {
  /** Resolved Monday, or null while the row still refers to a week *number*. */
  weekStart: string | null;
  /** Set when the week column held a plain number ("Week 1") instead of a date. */
  weekNumber: number | null;
  label: string;
  sessions: DraftSession[];
};

export type ParseResult = {
  weeks: DraftWeek[];
  /** Columns recognised as session types, in the order they appeared. */
  columns: WorkoutType[];
  /** Headers that were ignored, so the UI can say so rather than fail silently. */
  ignored: string[];
  errors: string[];
  /** True when any row used a week number, meaning a start week is still needed. */
  needsStartWeek: boolean;
};

/** RFC 4180-ish: honours quoted fields, escaped quotes, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  // Strip a UTF-8 BOM, which spreadsheets love to add.
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const WEEK_HEADERS = new Set(["week", "week start", "week_start", "weekstart", "date", "wk", "w"]);

/** Accepts the obvious synonyms a coach or spreadsheet is likely to use. */
const TYPE_ALIASES: Record<string, WorkoutType> = {
  long: "long",
  "long run": "long",
  longrun: "long",
  threshold: "threshold",
  tempo: "threshold",
  "threshold run": "threshold",
  workout: "threshold",
  quality: "threshold",
  easy: "easy",
  "easy run": "easy",
  recovery: "easy",
  strength: "strength",
  strengthening: "strength",
  lift: "strength",
  lifting: "strength",
  bands: "strength",
  gym: "strength",
  strides: "strides",
  stride: "strides",
  cross: "cross",
  "cross train": "cross",
  "cross-train": "cross",
  crosstrain: "cross",
  xt: "cross",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function resolveType(header: string): WorkoutType | null {
  const key = normalizeHeader(header);
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];
  // Fall back to an exact type id, e.g. a column literally headed "cross".
  return (WORKOUT_TYPES as readonly string[]).includes(key) ? (key as WorkoutType) : null;
}

const ISO = /^\d{4}-\d{1,2}-\d{1,2}$/;
const US = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;

/** A week cell is either a date (any day in the week) or a plain week number. */
function readWeekCell(raw: string): { weekStart: string | null; weekNumber: number | null } {
  const value = raw.trim();

  if (ISO.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return { weekStart: startOfWeek(toISO(new Date(Date.UTC(y, m - 1, d)))), weekNumber: null };
  }

  const us = US.exec(value);
  if (us) {
    const [, m, d, y] = us;
    const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    return {
      weekStart: startOfWeek(toISO(new Date(Date.UTC(year, Number(m) - 1, Number(d))))),
      weekNumber: null,
    };
  }

  // "Week 3", "wk3", "3"
  const number = /^(?:week|wk|w)?\s*(\d{1,3})$/i.exec(value);
  if (number) return { weekStart: null, weekNumber: Number(number[1]) };

  return { weekStart: null, weekNumber: null };
}

const STRIDES_MARKER = /\s*\+\s*strides\b/i;

function readCell(raw: string, type: WorkoutType): DraftSession[] {
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const meta = TYPE_META[type];
      const strides = meta.canCarryStrides && STRIDES_MARKER.test(part);
      const detail = part.replace(STRIDES_MARKER, "").trim();
      return { type, title: meta.defaultTitle, detail, strides };
    });
}

export function parsePlanCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  const errors: string[] = [];

  if (rows.length === 0) {
    return { weeks: [], columns: [], ignored: [], errors: ["That file looks empty."], needsStartWeek: false };
  }

  const header = rows[0];
  let weekIndex = -1;
  const columns: { index: number; type: WorkoutType }[] = [];
  const ignored: string[] = [];

  header.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (weekIndex === -1 && WEEK_HEADERS.has(normalized)) {
      weekIndex = index;
      return;
    }
    const type = resolveType(cell);
    if (type) columns.push({ index, type });
    else if (normalized) ignored.push(cell.trim());
  });

  if (weekIndex === -1) {
    errors.push('No "week" column found. The first column should be headed "week".');
  }
  if (columns.length === 0) {
    errors.push(
      "No session columns found. Expected headings like long, threshold, easy, strength, strides.",
    );
  }
  if (errors.length > 0) {
    return { weeks: [], columns: [], ignored, errors, needsStartWeek: false };
  }

  const weeks: DraftWeek[] = [];
  let needsStartWeek = false;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawWeek = row[weekIndex] ?? "";
    const { weekStart, weekNumber } = readWeekCell(rawWeek);

    if (weekStart === null && weekNumber === null) {
      errors.push(`Row ${r + 1}: could not read "${rawWeek.trim()}" as a date or a week number.`);
      continue;
    }
    if (weekNumber !== null) needsStartWeek = true;

    const sessions = columns.flatMap(({ index, type }) => readCell(row[index] ?? "", type));
    if (sessions.length === 0) {
      errors.push(`Row ${r + 1}: no sessions listed, skipped.`);
      continue;
    }

    weeks.push({
      weekStart,
      weekNumber,
      label: rawWeek.trim(),
      sessions,
    });
  }

  return { weeks, columns: columns.map((c) => c.type), ignored, errors, needsStartWeek };
}

/** Turns week numbers into real Mondays, counting from the chosen start week. */
export function resolveWeeks(weeks: DraftWeek[], startWeek: string): DraftWeek[] {
  const base = startOfWeek(startWeek);
  const lowest = weeks.reduce(
    (min, week) => (week.weekNumber !== null && week.weekNumber < min ? week.weekNumber : min),
    Number.POSITIVE_INFINITY,
  );
  const offset = Number.isFinite(lowest) ? lowest : 1;

  return weeks.map((week) => {
    if (week.weekStart) return week;
    if (week.weekNumber === null) return week;
    return { ...week, weekStart: addDays(base, (week.weekNumber - offset) * 7) };
  });
}

export const EXAMPLE_CSV = `week,long,threshold,easy,strength,strides,cross
2026-09-21,75 min steady,4 x 6 min @ threshold (2 min float),45 min +strides|40 min,Bands — upper body|Bands — upper body,,
2026-09-28,80 min steady,5 x 6 min @ threshold,45 min +strides|40 min,Bands — upper body|Bands — lower + core,,30 min bike
2026-10-05,85 min steady,3 x 10 min @ threshold,50 min +strides|40 min,Bands — upper body|Bands — upper body,,
2026-10-12,60 min easy,20 min @ threshold,40 min|35 min,Bands — upper body,6 x 20s,
`;

/** Totals for the importer's preview line. */
export function summarize(weeks: DraftWeek[]): { sessions: number; firstWeek: string | null } {
  const sessions = weeks.reduce((sum, week) => sum + week.sessions.length, 0);
  const dated = weeks.flatMap((w) => (w.weekStart ? [w.weekStart] : []));
  return {
    sessions,
    firstWeek: dated.length > 0 ? dated.reduce((a, b) => (a < b ? a : b)) : null,
  };
}
