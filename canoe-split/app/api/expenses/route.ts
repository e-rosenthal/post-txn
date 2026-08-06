import { NextRequest, NextResponse } from "next/server";
import { addExpense, getExpenses, getPeople } from "@/lib/db";
import { validateExpenseInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const expenses = await getExpenses();
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const people = await getPeople();
  const validIds = new Set(people.map((p) => p.id));

  try {
    const validated = validateExpenseInput(body, validIds);
    const id = await addExpense(validated);
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
