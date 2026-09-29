import { backendName, store } from "@/lib/db";
import { parseSettings } from "@/lib/validate";
import { fail, ok, readJson } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ settings: await store.getSettings(), backend: backendName });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const settings = parseSettings(await readJson(request));
    return ok({ settings: await store.saveSettings(settings), backend: backendName });
  } catch (error) {
    return fail(error);
  }
}
