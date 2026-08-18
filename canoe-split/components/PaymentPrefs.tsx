"use client";

import { useState } from "react";
import { formatPaymentPref } from "@/lib/format";
import { PAYMENT_METHODS, type Person } from "@/lib/types";

export default function PaymentPrefs({ me, onSaved }: { me: Person; onSaved: () => Promise<void> }) {
  const current = formatPaymentPref(me.paymentMethod, me.paymentHandle);
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState(me.paymentMethod ?? "");
  const [handle, setHandle] = useState(me.paymentHandle ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setMethod(me.paymentMethod ?? "");
    setHandle(me.paymentHandle ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${me.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method || null, paymentHandle: handle || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      setEditing(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="card prefs-card">
        <div>
          <h2>How you get paid back</h2>
          {current ? (
            <p className="muted">{current}</p>
          ) : (
            <p className="muted">Not set — add it so people know where to send your money.</p>
          )}
        </div>
        <button className="btn" onClick={startEdit}>
          {current ? "Edit" : "Add"}
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSave}>
      <h2>How you get paid back</h2>
      <p className="muted" style={{ marginBottom: 4 }}>
        Shown to anyone who owes you, so they know how to send it.
      </p>

      <label>Method</label>
      <select value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="">— none —</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <label>Username, phone, or email</label>
      <input
        type="text"
        placeholder="e.g. @alice-h or alice@email.com"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        maxLength={80}
      />

      {error && <p className="error-text">{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
