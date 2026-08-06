import { NextResponse } from "next/server";
import { computeNetBalances } from "@/lib/db";
import { simplifyDebts } from "@/lib/settle";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const balances = await computeNetBalances();
    const settlements = simplifyDebts(balances);
    return NextResponse.json({ balances, settlements });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load balances" }, { status: 500 });
  }
}
