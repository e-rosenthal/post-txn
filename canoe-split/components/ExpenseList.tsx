"use client";

import { useState } from "react";
import type { ExpenseWithSplits } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function ExpenseList({
  expenses,
  meId,
  onDeleted,
}: {
  expenses: ExpenseWithSplits[];
  meId: number;
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

  return (
    <div className="card">
      <div className="section-head">
        <h2>Expenses</h2>
        <span className="tag">{expenses.length}</span>
      </div>

      {expenses.length === 0 && <p className="balance-empty">No expenses logged yet.</p>}

      {expenses.map((exp) => {
        const splitNames = exp.splitWith.map((p) => p.name).join(", ");
        const yourShare = exp.splitWith.some((p) => p.id === meId)
          ? exp.amount / exp.splitWith.length
          : 0;

        return (
          <div key={exp.id} className="expense-row">
            <div>
              <div className="expense-desc">{exp.description}</div>
              <div className="expense-meta">
                {exp.paidByName} paid · split with {splitNames}
                {yourShare > 0 && ` · your share ${formatMoney(yourShare)}`}
              </div>
              <div className="expense-actions">
                {exp.receiptUrl && (
                  <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer">
                    View receipt
                  </a>
                )}
                <button
                  className="danger"
                  onClick={() => handleDelete(exp.id)}
                  disabled={deletingId === exp.id}
                >
                  {deletingId === exp.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
            <div className="expense-amount">{formatMoney(exp.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}
