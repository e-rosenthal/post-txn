"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TripNameEditor from "@/components/TripNameEditor";
import PeopleManager from "@/components/PeopleManager";
import CsvImport from "@/components/CsvImport";
import AdminExpenseTable from "@/components/AdminExpenseTable";
import type { ExpenseWithSplits, Person } from "@/lib/types";

export default function AdminPage() {
  const [tripName, setTripName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [tripRes, peopleRes, expensesRes] = await Promise.all([
      fetch("/api/trip"),
      fetch("/api/people"),
      fetch("/api/expenses"),
    ]);
    const tripData = await tripRes.json();
    const peopleData = await peopleRes.json();
    const expensesData = await expensesRes.json();
    setTripName(tripData.trip?.name ?? "Our Trip");
    setPeople(peopleData.people ?? []);
    setExpenses(expensesData.expenses ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  if (loading) {
    return <p className="spinner-text">Loading…</p>;
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
    </div>
  );
}
