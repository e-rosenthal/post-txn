import { NextRequest, NextResponse } from "next/server";
import { deleteExpense } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await deleteExpense(id);
  return NextResponse.json({ ok: true });
}
