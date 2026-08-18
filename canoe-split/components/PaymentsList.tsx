"use client";

import { useState } from "react";
import { formatAdded, formatMoney } from "@/lib/format";
import type { Payment } from "@/lib/types";

export default function PaymentsList({
  payments,
  onDeleted,
  showAddedInfo = false,
}: {
  payments: Payment[];
  onDeleted: () => Promise<void>;
  showAddedInfo?: boolean;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(p: Payment) {
    const label = `${p.fromName} paid ${p.toName} ${formatMoney(p.amount)}`;
    if (!window.confirm(`Delete this payment — ${label}? This can't be undone.`)) return;

    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/expenses/${p.id}`, { method: "DELETE" });
      if (res.ok) await onDeleted();
    } finally {
      setDeletingId(null);
    }
  }

  if (payments.length === 0) return null;

  return (
    <div className="card">
      <h2>Payments</h2>
      {payments.map((p) => (
        <div key={p.id} className="expense-row">
          <div>
            <div className="expense-desc">
              {p.fromName} paid {p.toName}
            </div>
            {p.note && <div className="expense-meta">{p.note}</div>}
            {showAddedInfo && <div className="expense-meta">{formatAdded(p.createdAt, p.addedByName)}</div>}
            <div className="expense-actions">
              <button className="danger" onClick={() => handleDelete(p)} disabled={deletingId === p.id}>
                {deletingId === p.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
          <div className="expense-amount">{formatMoney(p.amount)}</div>
        </div>
      ))}
    </div>
  );
}
