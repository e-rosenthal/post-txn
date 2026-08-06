"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Person } from "@/lib/types";

export default function ExpenseForm({
  people,
  meId,
  onCreated,
}: {
  people: Person[];
  meId: number;
  onCreated: () => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(meId);
  const [splitWith, setSplitWith] = useState<Set<number>>(new Set(people.map((p) => p.id)));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSplit(id: number) {
    setSplitWith((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!description.trim()) {
      setError("Add a short description.");
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

    setSaving(true);
    try {
      let receiptUrl: string | null = null;
      if (file) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
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
      setAmount("");
      setFile(null);
      setSplitWith(new Set(people.map((p) => p.id)));
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Add an expense</h2>

      <label>What was it?</label>
      <input
        type="text"
        placeholder="e.g. Gas for the drive up"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={120}
      />

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

      {error && <p className="error-text">{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
