"use client";

import { formatMoney, formatPaymentPref } from "@/lib/format";
import type { ExpenseWithSplits, NetBalance, Person, Settlement } from "@/lib/types";

const SETTLED_THRESHOLD = 0.005;

export default function BalancesView({
  settlements,
  balances,
  expenses,
  people,
  meId,
}: {
  settlements: Settlement[];
  balances: NetBalance[];
  expenses: ExpenseWithSplits[];
  people: Person[];
  meId: number;
}) {
  const myNet = balances.find((b) => b.id === meId)?.net ?? 0;

  // Payments aren't costs, and the expenses feed is already filtered to real expenses.
  const tripTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const myShare = expenses.reduce((sum, e) => {
    const isMine = e.splitWith.some((p) => p.id === meId);
    return isMine ? sum + e.amount / e.splitWith.length : sum;
  }, 0);

  let summary: string;
  if (myNet > SETTLED_THRESHOLD) summary = `You're owed ${formatMoney(myNet)} overall`;
  else if (myNet < -SETTLED_THRESHOLD) summary = `You owe ${formatMoney(Math.abs(myNet))} overall`;
  else summary = "You're all settled up";

  return (
    <div className="card">
      <h2>Who owes who</h2>

      <p className="balance-summary">{summary}</p>
      {expenses.length > 0 && (
        <p className="muted balance-totals">
          Trip total {formatMoney(tripTotal)} · your share {formatMoney(myShare)}
        </p>
      )}

      {settlements.length === 0 ? (
        <p className="balance-empty">
          {expenses.length === 0 ? "No expenses yet — add one above to get started." : "Everyone's settled up. 🎉"}
        </p>
      ) : (
        <>
          {settlements.map((s, i) => {
            const involvesMe = s.fromId === meId || s.toId === meId;
            // Only surfaced on the row where you're the one paying — that's when you need it.
            const recipient = people.find((p) => p.id === s.toId);
            const payTo = s.fromId === meId ? formatPaymentPref(recipient?.paymentMethod ?? null, recipient?.paymentHandle ?? null) : null;

            return (
              <div key={i} className="balance-row">
                <span>
                  <strong>{s.fromName}</strong> owes <strong>{s.toName}</strong>
                  {s.fromId === meId && (
                    <span className="pay-to">
                      {payTo ? `Pay via ${payTo}` : `${s.toName} hasn't said how they'd like to be paid`}
                    </span>
                  )}
                </span>
                <span className="expense-amount" style={{ color: involvesMe ? "var(--accent)" : undefined }}>
                  {formatMoney(s.amount)}
                </span>
              </div>
            );
          })}
          <p className="muted balance-note">
            These are the fewest payments needed to settle everyone up, so you may be paying someone you didn't
            directly buy anything from.
          </p>
        </>
      )}
    </div>
  );
}
