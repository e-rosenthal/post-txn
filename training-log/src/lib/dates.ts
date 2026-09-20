/**
 * Weeks are identified by their Monday as a local calendar day (`YYYY-MM-DD`),
 * never an instant. Helpers parse into UTC midnight purely so arithmetic is stable, and
 * format back by hand — so a run logged on Saturday stays on Saturday no matter
 * what timezone the server happens to be in.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** Monday-based week start. */
export function startOfWeek(iso: string): string {
  const d = parseISO(iso);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -offset);
}

export function weeksBetween(aWeekStart: string, bWeekStart: string): number {
  const ms = parseISO(bWeekStart).getTime() - parseISO(aWeekStart).getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatShort(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const a = parseISO(weekStart);
  const b = parseISO(end);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}–${b.getUTCDate()}`;
  }
  return `${formatShort(weekStart)} – ${formatShort(end)}`;
}

export function yearOf(iso: string): number {
  return parseISO(iso).getUTCFullYear();
}
