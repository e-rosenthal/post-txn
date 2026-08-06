import { NextResponse } from "next/server";
import { getPeople } from "@/lib/db";
import { toCsvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  let people;
  try {
    people = await getPeople();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load people" }, { status: 500 });
  }
  const names = people.map((p) => p.name);
  const examplePayer = names[0] ?? "Alice";
  const examplePair = names.length >= 2 ? `${names[0]};${names[1]}` : "Alice;Bob";

  const lines = [
    toCsvRow(["description", "amount", "paid_by", "split_with"]),
    toCsvRow(["Gas for the drive up", "42.50", examplePayer, "everyone"]),
    toCsvRow(["Firewood bundle", "15.00", examplePayer, examplePair]),
  ];

  const csv = lines.join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="expense-template.csv"',
    },
  });
}
