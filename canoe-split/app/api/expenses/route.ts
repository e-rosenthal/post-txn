import { NextRequest, NextResponse } from "next/server";
import { addExpense, getExpenses, getPeople } from "@/lib/db";
import { validateExpenseInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json({ expenses });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const id = await addExpense(validated);
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
