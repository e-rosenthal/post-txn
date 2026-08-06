"use client";

import { useState } from "react";

export default function TripNameEditor({
  name,
  onChanged,
}: {
  name: string;
  onChanged: () => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/trip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      setSaved(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSave}>
      <h2>Trip name</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        maxLength={80}
      />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={busy || !value.trim()}>
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="muted">Saved.</span>}
      </div>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
