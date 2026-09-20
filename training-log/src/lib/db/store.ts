import type { NewWorkout, Settings, Workout, WorkoutPatch } from "../types";

export interface Store {
  listWorkouts(range?: { from?: string; to?: string }): Promise<Workout[]>;
  createWorkouts(inputs: NewWorkout[]): Promise<Workout[]>;
  updateWorkout(id: string, patch: WorkoutPatch): Promise<Workout | null>;
  deleteWorkout(id: string): Promise<boolean>;
  /** Used when re-applying a plan; never touches sessions already ticked off. */
  deletePlannedInWeeks(weekStarts: string[]): Promise<number>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
}

export function newId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

export function normalizeWorkout(input: NewWorkout): Workout {
  return {
    id: input.id ?? newId(),
    weekStart: input.weekStart,
    type: input.type,
    title: (input.title ?? "").trim(),
    detail: (input.detail ?? "").trim(),
    strides: Boolean(input.strides),
    done: Boolean(input.done),
    doneAt: input.done ? new Date().toISOString() : null,
    position: input.position ?? 0,
  };
}
