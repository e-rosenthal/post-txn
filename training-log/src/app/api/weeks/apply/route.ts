import { store } from "@/lib/db";
import { addDays, dayIndex, startOfWeek } from "@/lib/dates";
import type { NewWorkout } from "@/lib/types";
import { BadRequest, assertDate } from "@/lib/validate";
import { fail, ok, readJson } from "../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fills a week from either the saved weekly template or a previous week.
 * `replace` clears the week's *planned* sessions first — anything already
 * ticked off is never touched.
 */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const weekStart = startOfWeek(assertDate(body.weekStart, "weekStart"));
    const source = body.source === "week" ? "week" : "template";
    const replace = Boolean(body.replace);
    const weekEnd = addDays(weekStart, 6);

    let drafts: NewWorkout[];
    if (source === "template") {
      const { template } = await store.getSettings();
      drafts = template.map((item, i) => ({
        date: addDays(weekStart, item.day),
        type: item.type,
        title: item.title,
        detail: item.detail,
        strides: item.strides,
        done: false,
        position: i,
      }));
    } else {
      const sourceStart = startOfWeek(assertDate(body.sourceWeekStart, "sourceWeekStart"));
      if (sourceStart === weekStart) throw new BadRequest("source week and target week are the same");
      const previous = await store.listWorkouts({ from: sourceStart, to: addDays(sourceStart, 6) });
      drafts = previous.map((w, i) => ({
        date: addDays(weekStart, dayIndex(w.date)),
        type: w.type,
        title: w.title,
        detail: w.detail,
        strides: w.strides,
        done: false,
        position: w.position || i,
      }));
    }

    const removed = replace ? await store.deletePlannedInRange(weekStart, weekEnd) : 0;
    const workouts = await store.createWorkouts(drafts);
    return ok({ workouts, removed, weekStart });
  } catch (error) {
    return fail(error);
  }
}
