import { NextRequest, NextResponse } from "next/server";
import { getTripSettings, updateTripName } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trip = await getTripSettings();
    return NextResponse.json({ trip });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load trip" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Trip name is too long" }, { status: 400 });
  }

  try {
    const trip = await updateTripName(name);
    return NextResponse.json({ trip });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save trip name" }, { status: 500 });
  }
}
