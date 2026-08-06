import { NextRequest, NextResponse } from "next/server";
import { addExpense, getExpenses, getPeople } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const expenses = await getExpenses();
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const amount = Number(body?.amount);
  const paidBy = Number(body?.paidBy);
  const splitWith = Array.isArray(body?.splitWith) ? body.splitWith.map((n: unknown) => Number(n)) : [];
  const receiptUrl = typeof body?.receiptUrl === "string" ? body.receiptUrl : null;

  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(paidBy)) {
    return NextResponse.json({ error: "Who paid is required" }, { status: 400 });
  }
  if (splitWith.length === 0 || splitWith.some((n: number) => !Number.isFinite(n))) {
    return NextResponse.json({ error: "Pick at least one person to split with" }, { status: 400 });
  }

  const people = await getPeople();
  const validIds = new Set(people.map((p) => p.id));
  if (!validIds.has(paidBy) || splitWith.some((id: number) => !validIds.has(id))) {
    return NextResponse.json({ error: "Unknown person in request" }, { status: 400 });
  }

  const id = await addExpense({
    description,
    amount: Math.round(amount * 100) / 100,
    paidBy,
    splitWith,
    receiptUrl,
  });

  return NextResponse.json({ id });
}
