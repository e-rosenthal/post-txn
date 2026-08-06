"use client";

import type { Settlement } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function BalancesView({ settlements, meId }: { settlements: Settlement[]; meId: number }) {
  return (
    <div className="card">
      <h2>Who owes who</h2>
      {settlements.length === 0 ? (
        <p className="balance-empty">Everyone's settled up. 🎉</p>
      ) : (
        settlements.map((s, i) => {
          const involvesMe = s.fromId === meId || s.toId === meId;
          return (
            <div key={i} className="balance-row">
              <span>
                <strong>{s.fromName}</strong> owes <strong>{s.toName}</strong>
              </span>
              <span className="expense-amount" style={{ color: involvesMe ? "var(--accent)" : undefined }}>
                {formatMoney(s.amount)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
