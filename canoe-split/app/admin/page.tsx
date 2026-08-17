"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TripNameEditor from "@/components/TripNameEditor";
import PeopleManager from "@/components/PeopleManager";
import CsvImport from "@/components/CsvImport";
import AdminExpenseTable from "@/components/AdminExpenseTable";
import PaymentsList from "@/components/PaymentsList";
import { fetchJson } from "@/lib/fetchJson";
import type { ExpenseWithSplits, Payment, Person } from "@/lib/types";

export default function AdminPage() {
  const [tripName, setTripName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [tripData, peopleData, expensesData, paymentsData] = await Promise.all([
      fetchJson<{ trip: { name: string } }>("/api/trip"),
      fetchJson<{ people: Person[] }>("/api/people"),
      fetchJson<{ expenses: ExpenseWithSplits[] }>("/api/expenses"),
      fetchJson<{ payments: Payment[] }>("/api/payments"),
    ]);
    setTripName(tripData.trip?.name ?? "Our Trip");
    setPeople(peopleData.people ?? []);
    setExpenses(expensesData.expenses ?? []);
    setPayments(paymentsData.payments ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong loading trip settings.");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="spinner-text">Loading…</p>;
  }

  if (loadError) {
    return (
      <div className="card">
        <h2>Couldn't load trip settings</h2>
        <p className="error-text">{loadError}</p>
        <p className="muted" style={{ marginTop: 8 }}>
          If this is a fresh deployment, make sure a Postgres database is connected in Vercel's Storage tab.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Trip settings</h1>
          <p className="muted">Anyone with this link can make changes here</p>
        </div>
        <Link className="whoami" href="/">
          Back to trip
        </Link>
      </div>

      <TripNameEditor name={tripName} onChanged={refresh} />
      <PeopleManager people={people} onChanged={refresh} />
      <CsvImport onImported={refresh} />
      <AdminExpenseTable expenses={expenses} people={people} onChanged={refresh} />
      <PaymentsList payments={payments} onDeleted={refresh} />
    </div>
  );
}
