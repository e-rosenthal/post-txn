import { store } from "@/lib/db";
import { parsePatch } from "@/lib/validate";
import { fail, ok, readJson } from "../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const patch = parsePatch(await readJson(request));
    const workout = await store.updateWorkout(id, patch);
    if (!workout) return ok({ error: "not found" });
    return ok({ workout });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const deleted = await store.deleteWorkout(id);
    return ok({ deleted });
  } catch (error) {
    return fail(error);
  }
}
