"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { formatAdded, formatMoney } from "@/lib/format";
import type { ExpenseWithSplits, Person } from "@/lib/types";

export default function AdminExpenseTable({
  expenses,
  people,
  onChanged,
}: {
  expenses: ExpenseWithSplits[];
  people: Person[];
  onChanged: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(0);
  const [splitWith, setSplitWith] = useState<Set<number>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);

  function startEdit(exp: ExpenseWithSplits) {
    setEditingId(exp.id);
    setDescription(exp.description);
    setAmount(String(exp.amount));
    setPaidBy(exp.paidById);
    setSplitWith(new Set(exp.splitWith.map((p) => p.id)));
    setFile(null);
    setExistingReceiptUrl(exp.receiptUrl);
    setError(null);
  }

  function toggleSplit(id: number) {
    setSplitWith((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave(id: number) {
    const amountNum = Number(amount);
    if (!description.trim()) {
      setError("Add a description.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (splitWith.size === 0) {
      setError("Pick at least one person to split with.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let receiptUrl = existingReceiptUrl;
      if (file) {
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
        receiptUrl = blob.url;
      }

      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: amountNum,
          paidBy,
          splitWith: Array.from(splitWith),
          receiptUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      setEditingId(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number, description: string) {
    if (!window.confirm(`Delete "${description}"? This can't be undone.`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      if (editingId === id) setEditingId(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>All expenses</h2>
      {expenses.length === 0 && <p className="balance-empty">No expenses yet.</p>}

      {expenses.map((exp) => (
        <div key={exp.id} className="expense-row" style={{ display: "block" }}>
          {editingId === exp.id ? (
            <div>
              <label>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={120}
              />
              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <label>Paid by</label>
              <select value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label>Split with</label>
              <div className="checkbox-grid">
                {people.map((p) => (
                  <label key={p.id} className="checkbox-chip">
                    <input type="checkbox" checked={splitWith.has(p.id)} onChange={() => toggleSplit(p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
              <label>Replace receipt photo (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {existingReceiptUrl && !file && (
                <p className="muted" style={{ marginTop: 6 }}>
                  Current:{" "}
                  <a href={existingReceiptUrl} target="_blank" rel="noopener noreferrer">
                    view receipt
                  </a>
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => handleSave(exp.id)} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </button>
                <button className="btn" onClick={() => setEditingId(null)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div className="expense-desc">{exp.description}</div>
                <div className="expense-meta">
                  {exp.paidByName} paid · split with {exp.splitWith.map((p) => p.name).join(", ")}
                </div>
                <div className="expense-meta">{formatAdded(exp.createdAt, exp.addedByName)}</div>
                <div className="expense-actions">
                  <button onClick={() => startEdit(exp)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(exp.id, exp.description)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="expense-amount">{formatMoney(exp.amount)}</div>
            </div>
          )}
        </div>
      ))}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
