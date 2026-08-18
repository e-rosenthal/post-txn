import { NextRequest, NextResponse } from "next/server";
import { addPayment, getPayments, getPeople } from "@/lib/db";
import { parseAddedBy } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payments = await getPayments();
    return NextResponse.json({ payments });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const fromId = Number(body?.fromId);
  const toId = Number(body?.toId);
  const amount = Number(body?.amount);
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!Number.isFinite(fromId) || !Number.isFinite(toId)) {
    return NextResponse.json({ error: "Who paid and who received are required" }, { status: 400 });
  }
  if (fromId === toId) {
    return NextResponse.json({ error: "Pick two different people" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  let people;
  try {
    people = await getPeople();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load people" }, { status: 500 });
  }
  const validIds = new Set(people.map((p) => p.id));
  if (!validIds.has(fromId) || !validIds.has(toId)) {
    return NextResponse.json({ error: "Unknown person in request" }, { status: 400 });
  }

  try {
    const id = await addPayment({
      fromId,
      toId,
      amount: Math.round(amount * 100) / 100,
      note: note || null,
      addedBy: parseAddedBy(body, validIds),
    });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to record payment" }, { status: 500 });
  }
}
