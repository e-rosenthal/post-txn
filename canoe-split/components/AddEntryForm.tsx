"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Person } from "@/lib/types";

type Mode = "expense" | "payment";

export default function AddEntryForm({
  people,
  meId,
  onCreated,
}: {
  people: Person[];
  meId: number;
  onCreated: () => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("expense");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(meId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expense-only fields
  const [description, setDescription] = useState("");
  const [splitWith, setSplitWith] = useState<Set<number>>(new Set(people.map((p) => p.id)));
  const [file, setFile] = useState<File | null>(null);

  // Payment-only fields
  const [toId, setToId] = useState<number>(() => people.find((p) => p.id !== meId)?.id ?? meId);
  const [note, setNote] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
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

  async function submitExpense(amountNum: number) {
    if (!description.trim()) throw new Error("Add a short description.");
    if (splitWith.size === 0) throw new Error("Pick at least one person to split with.");

    let receiptUrl: string | null = null;
    if (file) {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
      receiptUrl = blob.url;
    }

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        amount: amountNum,
        paidBy,
        splitWith: Array.from(splitWith),
        receiptUrl,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to save expense");
    }

    setDescription("");
    setFile(null);
    setSplitWith(new Set(people.map((p) => p.id)));
  }

  async function submitPayment(amountNum: number) {
    if (paidBy === toId) throw new Error("Pick two different people.");

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId: paidBy, toId, amount: amountNum, note: note.trim() || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to record payment");
    }

    setNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "expense") await submitExpense(amountNum);
      else await submitPayment(amountNum);
      setAmount("");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="mode-toggle" role="group" aria-label="What are you adding?">
        <button
          type="button"
          className={mode === "expense" ? "active" : ""}
          onClick={() => switchMode("expense")}
        >
          Shared expense
        </button>
        <button
          type="button"
          className={mode === "payment" ? "active" : ""}
          onClick={() => switchMode("payment")}
        >
          Paying someone back
        </button>
      </div>

      {mode === "payment" && (
        <p className="muted" style={{ marginBottom: 4 }}>
          Settles up an existing balance (cash, Venmo, etc.) instead of adding a new shared cost.
        </p>
      )}

      {mode === "expense" && (
        <>
          <label>What was it?</label>
          <input
            type="text"
            placeholder="e.g. Gas for the drive up"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
          />
        </>
      )}

      <label>Amount</label>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <label>Who paid?</label>
      <select value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id === meId ? `${p.name} (you)` : p.name}
          </option>
        ))}
      </select>

      {mode === "expense" ? (
        <>
          <label>Split with</label>
          <div className="checkbox-grid">
            {people.map((p) => (
              <label key={p.id} className="checkbox-chip">
                <input type="checkbox" checked={splitWith.has(p.id)} onChange={() => toggleSplit(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
          <div className="split-actions">
            <button type="button" className="btn" onClick={() => setSplitWith(new Set(people.map((p) => p.id)))}>
              Everyone
            </button>
            <button type="button" className="btn" onClick={() => setSplitWith(new Set([paidBy]))}>
              Just the payer
            </button>
          </div>

          <label>Receipt photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </>
      ) : (
        <>
          <label>Who received it?</label>
          <select value={toId} onChange={(e) => setToId(Number(e.target.value))}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label>Note (optional)</label>
          <input
            type="text"
            placeholder="e.g. Venmo"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
          />
        </>
      )}

      {error && <p className="error-text">{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Saving…" : mode === "expense" ? "Add expense" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
