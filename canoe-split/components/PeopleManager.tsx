"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";

export default function PeopleManager({
  people,
  onChanged,
}: {
  people: Person[];
  onChanged: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add");
      setNewName("");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Person) {
    setEditingId(p.id);
    setEditingName(p.name);
    setError(null);
  }

  async function saveEdit(id: number) {
    const name = editingName.trim();
    if (!name) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to rename");
      setEditingId(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to remove");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>People</h2>

      {people.map((p) => (
        <div key={p.id} className="expense-row">
          {editingId === p.id ? (
            <div style={{ display: "flex", gap: 8, flex: 1 }}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                maxLength={40}
              />
              <button className="btn btn-primary" onClick={() => saveEdit(p.id)} disabled={busy}>
                Save
              </button>
              <button className="btn" onClick={() => setEditingId(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span>{p.name}</span>
              <div className="expense-actions">
                <button onClick={() => startEdit(p)}>Rename</button>
                <button className="danger" onClick={() => handleDelete(p.id)} disabled={busy}>
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <form onSubmit={handleAdd} style={{ marginTop: 14 }}>
        <label>Add someone</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !newName.trim()}>
            Add
          </button>
        </div>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
