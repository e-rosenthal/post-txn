import { store } from "@/lib/db";
import { parseNewWorkout } from "@/lib/validate";
import { fail, ok, readJson } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const workouts = await store.listWorkouts({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    });
    return ok({ workouts });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const list = Array.isArray(body) ? body : [body];
    const created = await store.createWorkouts(list.map(parseNewWorkout));
    return ok({ workouts: created });
  } catch (error) {
    return fail(error);
  }
}
