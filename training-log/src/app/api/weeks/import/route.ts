import { store } from "@/lib/db";
import { BadRequest, parseImportWeek } from "@/lib/validate";
import { fail, ok, readJson } from "../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bulk-creates a plan: many weeks at once, from an uploaded CSV. As everywhere
 * else, `replace` only clears sessions that haven't been ticked off.
 */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    if (!Array.isArray(body.weeks)) throw new BadRequest("expected a weeks array");
    if (body.weeks.length > 104) throw new BadRequest("that is more than two years of weeks");

    const weeks = body.weeks.map(parseImportWeek);
    const replace = body.replace !== false;

    const removed = replace ? await store.deletePlannedInWeeks(weeks.map((w) => w.weekStart)) : 0;
    const created = await store.createWorkouts(weeks.flatMap((w) => w.sessions));

    return ok({ created: created.length, removed, weeks: weeks.length });
  } catch (error) {
    return fail(error);
  }
}
