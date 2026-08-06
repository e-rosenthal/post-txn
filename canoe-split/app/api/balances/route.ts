import { NextResponse } from "next/server";
import { computeNetBalances } from "@/lib/db";
import { simplifyDebts } from "@/lib/settle";

export const dynamic = "force-dynamic";

export async function GET() {
  const balances = await computeNetBalances();
  const settlements = simplifyDebts(balances);
  return NextResponse.json({ balances, settlements });
}
