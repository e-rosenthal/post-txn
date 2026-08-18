import { NextRequest, NextResponse } from "next/server";
import { deletePerson, updatePerson } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Absent key = leave alone; empty string = clear it. */
function readOptionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();

  let name: string | undefined;
  if (body?.name !== undefined) {
    name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (name.length > 40) return NextResponse.json({ error: "Name is too long" }, { status: 400 });
  }

  const paymentMethod = readOptionalText(body?.paymentMethod, 20);
  if (typeof paymentMethod === "string" && !PAYMENT_METHODS.includes(paymentMethod as any)) {
    return NextResponse.json({ error: "Unknown payment method" }, { status: 400 });
  }
  const paymentHandle = readOptionalText(body?.paymentHandle, 80);

  try {
    const person = await updatePerson(id, { name, paymentMethod, paymentHandle });
    return NextResponse.json({ person });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update" }, { status: 400 });
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
