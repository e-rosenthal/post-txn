import { NextRequest, NextResponse } from "next/server";
import { deletePerson, renamePerson } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 40) {
    return NextResponse.json({ error: "Name is too long" }, { status: 400 });
  }

  try {
    const person = await renamePerson(id, name);
    return NextResponse.json({ person });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to rename" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await deletePerson(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to remove" }, { status: 400 });
  }
}
