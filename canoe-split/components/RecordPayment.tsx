"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";

export default function RecordPayment({
  people,
  meId,
  onRecorded,
}: {
  people: Person[];
  meId: number;
  onRecorded: () => Promise<void>;
}) {
  const [fromId, setFromId] = useState(meId);
  const [toId, setToId] = useState<number>(() => people.find((p) => p.id !== meId)?.id ?? meId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (fromId === toId) {
      setError("Pick two different people.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId, toId, amount: amountNum, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to record payment");
      setAmount("");
      setNote("");
      await onRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Record a payment</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        Paid someone back outside the app (cash, Venmo, etc.)? Log it here — it settles the balance above without
        adding a new shared cost.
      </p>

      <label>Who paid</label>
      <select value={fromId} onChange={(e) => setFromId(Number(e.target.value))}>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id === meId ? `${p.name} (you)` : p.name}
          </option>
        ))}
      </select>

      <label>Who received it</label>
      <select value={toId} onChange={(e) => setToId(Number(e.target.value))}>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

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

      <label>Note (optional)</label>
      <input type="text" placeholder="e.g. Venmo" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />

      {error && <p className="error-text">{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
