"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NamePicker from "@/components/NamePicker";
import AddEntryForm from "@/components/AddEntryForm";
import ExpenseList from "@/components/ExpenseList";
import BalancesView from "@/components/BalancesView";
import PaymentsList from "@/components/PaymentsList";
import { fetchJson } from "@/lib/fetchJson";
import type { ExpenseWithSplits, Payment, Person, Settlement } from "@/lib/types";

const ME_KEY = "canoe_split_me_id";
const DEFAULT_TRIP_NAME = "Our Trip";

export default function Home() {
  const [tripName, setTripName] = useState(DEFAULT_TRIP_NAME);
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [tripData, peopleData, expensesData, paymentsData, balancesData] = await Promise.all([
      fetchJson<{ trip: { name: string } }>("/api/trip"),
      fetchJson<{ people: Person[] }>("/api/people"),
      fetchJson<{ expenses: ExpenseWithSplits[] }>("/api/expenses"),
      fetchJson<{ payments: Payment[] }>("/api/payments"),
      fetchJson<{ settlements: Settlement[] }>("/api/balances"),
    ]);
    setTripName(tripData.trip?.name ?? DEFAULT_TRIP_NAME);
    setPeople(peopleData.people ?? []);
    setExpenses(expensesData.expenses ?? []);
    setPayments(paymentsData.payments ?? []);
    setSettlements(balancesData.settlements ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await refresh();
      const stored = window.localStorage.getItem(ME_KEY);
      if (stored) setMeId(Number(stored));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong loading the trip.");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddPerson(name: string) {
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to add person");
    await refresh();
  }

  function handlePick(personId: number) {
    window.localStorage.setItem(ME_KEY, String(personId));
    setMeId(personId);
  }

  function handleSwitch() {
    window.localStorage.removeItem(ME_KEY);
    setMeId(null);
  }

  if (loading) {
    return <p className="spinner-text">Loading…</p>;
  }

  if (loadError) {
    return (
      <div className="card">
        <h2>Couldn't load the trip</h2>
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

  const me = people.find((p) => p.id === meId);

  if (!me) {
    return <NamePicker tripName={tripName} people={people} onAddPerson={handleAddPerson} onPick={handlePick} />;
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>🛶 {tripName}</h1>
          <p className="muted">Hi, {me.name}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <button className="whoami" onClick={handleSwitch}>
            Switch person
          </button>
          <Link className="whoami" href="/admin">
            Trip settings
          </Link>
        </div>
      </div>

      <AddEntryForm people={people} meId={me.id} onCreated={refresh} />
      <BalancesView settlements={settlements} meId={me.id} />
      <PaymentsList payments={payments} onDeleted={refresh} />
      <ExpenseList expenses={expenses} meId={me.id} onDeleted={refresh} />
    </div>
  );
}
