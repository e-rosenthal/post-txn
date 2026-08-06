"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";

export default function NamePicker({
  tripName,
  people,
  onAddPerson,
  onPick,
}: {
  tripName: string;
  people: Person[];
  onAddPerson: (name: string) => Promise<void>;
  onPick: (personId: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    try {
      await onAddPerson(name);
      setNewName("");
    } catch {
      setError("Couldn't add that name — try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card">
      <h1>🛶 {tripName}</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 14 }}>
        {people.length === 0
          ? "First person here — add everyone going on the trip, then pick your own name."
          : "Which one of you is this?"}
      </p>

      {people.length > 0 && (
        <div className="people-grid" style={{ marginBottom: 16 }}>
          {people.map((p) => (
            <button key={p.id} className="person-btn" onClick={() => onPick(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd}>
        <label>{people.length === 0 ? "Add the group" : "Not listed? Add yourself"}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
          />
          <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
            Add
          </button>
        </div>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
