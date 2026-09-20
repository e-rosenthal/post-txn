"use client";

import { useSyncExternalStore } from "react";
import { todayISO } from "./dates";

/**
 * The clock is an external system, so it's read through `useSyncExternalStore`.
 * The server snapshot is deliberately `null`: the server has no idea what day it
 * is in Chicago, and guessing would produce a hydration mismatch at exactly the
 * moment it matters — around midnight. Callers render a skeleton until it lands.
 */

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

// Equal date strings compare true under Object.is, so this never loops.
const getSnapshot = () => todayISO();
const getServerSnapshot = () => null;

export function useToday(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
