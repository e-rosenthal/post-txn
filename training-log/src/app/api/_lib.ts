import { NextResponse } from "next/server";
import { BadRequest } from "@/lib/validate";

export function ok<T>(data: T) {
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

export function fail(error: unknown) {
  if (error instanceof BadRequest) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("[training-log]", error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BadRequest("invalid JSON body");
  }
}
