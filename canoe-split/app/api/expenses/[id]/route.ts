import { NextRequest, NextResponse } from "next/server";
import { deleteExpense, getPeople, updateExpense } from "@/lib/db";
import { validateExpenseInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();

  let people;
  try {
    people = await getPeople();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load people" }, { status: 500 });
  }
  const validIds = new Set(people.map((p) => p.id));

  try {
    const validated = validateExpenseInput(body, validIds);
    await updateExpense(id, validated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await deleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete" }, { status: 500 });
  }
}
