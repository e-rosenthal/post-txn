import { NextRequest, NextResponse } from "next/server";
import { addExpense, getPeople } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

type SkipReason = { row: number; reason: string };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const csvText = typeof body?.csv === "string" ? body.csv : "";
  if (!csvText.trim()) {
    return NextResponse.json({ error: "No CSV content received" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV appears to be empty" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const descIdx = header.indexOf("description");
  const amountIdx = header.indexOf("amount");
  const paidByIdx = header.indexOf("paid_by");
  const splitIdx = header.indexOf("split_with");

  if (descIdx === -1 || amountIdx === -1 || paidByIdx === -1) {
    return NextResponse.json(
      {
        error:
          "CSV must have description, amount, and paid_by columns. Download the template for the exact format.",
      },
      { status: 400 }
    );
  }

  const people = await getPeople();
  const byName = new Map(people.map((p) => [p.name.trim().toLowerCase(), p]));

  const dataRows = rows.slice(1);
  const skipped: SkipReason[] = [];
  let imported = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
    const cols = dataRows[i];
    const description = (cols[descIdx] || "").trim();
    const amount = Number((cols[amountIdx] || "").trim());
    const paidByName = (cols[paidByIdx] || "").trim();
    const splitRaw = splitIdx !== -1 ? (cols[splitIdx] || "").trim() : "";

    if (!description) {
      skipped.push({ row: rowNum, reason: "Missing description" });
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped.push({ row: rowNum, reason: `Invalid amount "${cols[amountIdx] ?? ""}"` });
      continue;
    }
    const payer = byName.get(paidByName.toLowerCase());
    if (!payer) {
      skipped.push({ row: rowNum, reason: `Unknown paid_by "${paidByName}"` });
      continue;
    }

    let splitWith: number[];
    if (!splitRaw || splitRaw.toLowerCase() === "everyone") {
      splitWith = people.map((p) => p.id);
    } else {
      const names = splitRaw
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const ids: number[] = [];
      let unknown: string | null = null;
      for (const n of names) {
        const person = byName.get(n.toLowerCase());
        if (!person) {
          unknown = n;
          break;
        }
        ids.push(person.id);
      }
      if (unknown) {
        skipped.push({ row: rowNum, reason: `Unknown person in split_with: "${unknown}"` });
        continue;
      }
      splitWith = ids;
    }

    if (splitWith.length === 0) {
      skipped.push({ row: rowNum, reason: "No one to split with" });
      continue;
    }

    await addExpense({
      description,
      amount: Math.round(amount * 100) / 100,
      paidBy: payer.id,
      splitWith,
      receiptUrl: null,
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
