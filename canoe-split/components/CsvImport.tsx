"use client";

import { useRef, useState } from "react";
import type { ImportResult } from "@/lib/types";

export default function CsvImport({ onImported }: { onImported: () => Promise<void> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/expenses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed");
      setResult(body);
      await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="card">
      <h2>Import expenses from CSV</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Already tracking expenses in a spreadsheet? Export it as CSV and bring it all in at once. Columns:
        description, amount, paid_by, split_with (semicolon-separated names, or "everyone").
      </p>
      <a className="btn" href="/api/expenses/template">
        Download CSV template
      </a>

      <label style={{ marginTop: 16 }}>Upload CSV</label>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} disabled={busy} />

      {busy && (
        <p className="muted" style={{ marginTop: 8 }}>
          Importing…
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <p>
            <strong>{result.imported}</strong> expense{result.imported === 1 ? "" : "s"} imported.
          </p>
          {result.skipped.length > 0 && (
            <>
              <p className="muted">Skipped {result.skipped.length}:</p>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {result.skipped.map((s, i) => (
                  <li key={i} className="muted">
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
