import { NextRequest, NextResponse } from "next/server";
import { addPerson, getPeople } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const people = await getPeople();
    return NextResponse.json({ people });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load people" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 40) {
    return NextResponse.json({ error: "Name is too long" }, { status: 400 });
  }

  try {
    const person = await addPerson(name);
    return NextResponse.json({ person });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to add person" }, { status: 500 });
  }
}
