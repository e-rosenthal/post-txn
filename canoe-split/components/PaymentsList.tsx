"use client";

import { useState } from "react";
import type { Payment } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function PaymentsList({
  payments,
  onDeleted,
}: {
  payments: Payment[];
  onDeleted: () => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
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
            <div className="expense-actions">
              <button className="danger" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
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
