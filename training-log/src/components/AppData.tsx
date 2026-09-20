"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SETTINGS, type NewWorkout, type Settings, type Workout, type WorkoutPatch } from "@/lib/types";

/**
 * The whole log lives in memory. Even a few years of training is well under a
 * thousand rows, so loading it once makes week-flipping and the history charts
 * instant, and every mutation is optimistic with a rollback on failure.
 */

type ApplyOptions = {
  weekStart: string;
  source: "template" | "week";
  sourceWeekStart?: string;
  replace?: boolean;
};

type AppDataValue = {
  ready: boolean;
  error: string | null;
  workouts: Workout[];
  settings: Settings;
  /** "postgres" once DATABASE_URL is set, "file" for zero-setup local dev. */
  backend: string;
  addWorkout: (input: Omit<NewWorkout, "done"> & { done?: boolean }) => Promise<void>;
  patchWorkout: (id: string, patch: WorkoutPatch) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  applyWeek: (options: ApplyOptions) => Promise<void>;
  reload: () => Promise<void>;
};

const AppDataContext = createContext<AppDataValue | null>(null);

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || `Request failed (${response.status})`);
  }
  return payload as T;
}

function sortWorkouts(list: Workout[]): Workout[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position);
}

type Snapshot = { workouts: Workout[]; settings: Settings; backend: string };

async function fetchSnapshot(): Promise<Snapshot> {
  const [w, s] = await Promise.all([
    request<{ workouts: Workout[] }>("/api/workouts"),
    request<{ settings: Settings; backend: string }>("/api/settings"),
  ]);
  return { workouts: w.workouts, settings: s.settings, backend: s.backend };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [backend, setBackend] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((snapshot: Snapshot) => {
    setWorkouts(sortWorkouts(snapshot.workouts));
    setSettings(snapshot.settings);
    setBackend(snapshot.backend);
    setError(null);
    setReady(true);
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await fetchSnapshot());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the server");
      setReady(true);
    }
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await fetchSnapshot();
        if (!cancelled) apply(snapshot);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not reach the server");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const addWorkout = useCallback<AppDataValue["addWorkout"]>(async (input) => {
    const draft: Workout = {
      id: `temp-${Math.random().toString(36).slice(2)}`,
      date: input.date,
      type: input.type,
      title: input.title ?? "",
      detail: input.detail ?? "",
      strides: Boolean(input.strides),
      done: Boolean(input.done),
      doneAt: input.done ? new Date().toISOString() : null,
      position: input.position ?? 0,
    };
    setWorkouts((prev) => sortWorkouts([...prev, draft]));
    try {
      const { workouts: created } = await request<{ workouts: Workout[] }>("/api/workouts", {
        method: "POST",
        body: JSON.stringify({ ...draft, id: undefined }),
      });
      const saved = created[0];
      setWorkouts((prev) => sortWorkouts(prev.map((w) => (w.id === draft.id ? saved : w))));
      setError(null);
    } catch (err) {
      setWorkouts((prev) => prev.filter((w) => w.id !== draft.id));
      setError(err instanceof Error ? err.message : "Could not save that session");
    }
  }, []);

  const patchWorkout = useCallback<AppDataValue["patchWorkout"]>(async (id, patch) => {
    let previous: Workout | undefined;
    setWorkouts((prev) =>
      sortWorkouts(
        prev.map((w) => {
          if (w.id !== id) return w;
          previous = w;
          const doneAt = patch.done === undefined ? w.doneAt : patch.done ? new Date().toISOString() : null;
          return { ...w, ...patch, doneAt };
        }),
      ),
    );
    try {
      await request(`/api/workouts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setError(null);
    } catch (err) {
      if (previous) {
        const restore = previous;
        setWorkouts((prev) => sortWorkouts(prev.map((w) => (w.id === id ? restore : w))));
      }
      setError(err instanceof Error ? err.message : "Could not update that session");
    }
  }, []);

  const removeWorkout = useCallback<AppDataValue["removeWorkout"]>(async (id) => {
    let previous: Workout | undefined;
    setWorkouts((prev) => {
      previous = prev.find((w) => w.id === id);
      return prev.filter((w) => w.id !== id);
    });
    try {
      await request(`/api/workouts/${id}`, { method: "DELETE" });
      setError(null);
    } catch (err) {
      if (previous) {
        const restore = previous;
        setWorkouts((prev) => sortWorkouts([...prev, restore]));
      }
      setError(err instanceof Error ? err.message : "Could not delete that session");
    }
  }, []);

  const saveSettings = useCallback<AppDataValue["saveSettings"]>(async (next) => {
    const previous = settings;
    setSettings(next);
    try {
      const { settings: saved } = await request<{ settings: Settings }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      setSettings(saved);
      setError(null);
    } catch (err) {
      setSettings(previous);
      setError(err instanceof Error ? err.message : "Could not save your plan");
    }
  }, [settings]);

  const applyWeek = useCallback<AppDataValue["applyWeek"]>(async (options) => {
    try {
      await request("/api/weeks/apply", { method: "POST", body: JSON.stringify(options) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fill that week");
    }
  }, [reload]);

  const value = useMemo<AppDataValue>(
    () => ({
      ready,
      error,
      workouts,
      settings,
      backend,
      addWorkout,
      patchWorkout,
      removeWorkout,
      saveSettings,
      applyWeek,
      reload,
    }),
    [ready, error, workouts, settings, backend, addWorkout, patchWorkout, removeWorkout, saveSettings, applyWeek, reload],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside <AppDataProvider>");
  return value;
}
