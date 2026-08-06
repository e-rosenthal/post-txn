"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NamePicker from "@/components/NamePicker";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import BalancesView from "@/components/BalancesView";
import type { ExpenseWithSplits, Person, Settlement } from "@/lib/types";

const ME_KEY = "canoe_split_me_id";
const DEFAULT_TRIP_NAME = "Our Trip";

export default function Home() {
  const [tripName, setTripName] = useState(DEFAULT_TRIP_NAME);
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [tripRes, peopleRes, expensesRes, balancesRes] = await Promise.all([
      fetch("/api/trip"),
      fetch("/api/people"),
      fetch("/api/expenses"),
      fetch("/api/balances"),
    ]);
    const tripData = await tripRes.json();
    const peopleData = await peopleRes.json();
    const expensesData = await expensesRes.json();
    const balancesData = await balancesRes.json();
    setTripName(tripData.trip?.name ?? DEFAULT_TRIP_NAME);
    setPeople(peopleData.people ?? []);
    setExpenses(expensesData.expenses ?? []);
    setSettlements(balancesData.settlements ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      const stored = window.localStorage.getItem(ME_KEY);
      if (stored) setMeId(Number(stored));
      setLoading(false);
    })();
  }, [refresh]);

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

      <ExpenseForm people={people} meId={me.id} onCreated={refresh} />
      <BalancesView settlements={settlements} meId={me.id} />
      <ExpenseList expenses={expenses} meId={me.id} onDeleted={refresh} />
    </div>
  );
}
