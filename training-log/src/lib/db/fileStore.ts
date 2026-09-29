import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS, type NewWorkout, type Settings, type Workout, type WorkoutPatch } from "../types";
import { normalizeWorkout, type Store } from "./store";

/**
 * Zero-setup backend for local development: a single JSON file. `npm run dev`
 * works with no database at all. Production uses the Postgres store instead.
 */

type Shape = { workouts: Workout[]; settings: Settings };

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "training-log.json");

const EMPTY: Shape = { workouts: [], settings: DEFAULT_SETTINGS };

async function read(): Promise<Shape> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Shape>;
    return {
      workouts: parsed.workouts ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { ...EMPTY };
  }
}

async function write(data: Shape): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  } catch (error) {
    // Any failure here means this store cannot persist. The overwhelmingly common
    // cause is a deploy with no DATABASE_URL: the host's filesystem is read-only,
    // reads quietly return empty, and without this the app looks fine right up
    // until the first tick-off. The errno varies by host, so don't branch on it.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not save to ${DATA_DIR}. If this is a deployed app, connect a Postgres ` +
        `database and set DATABASE_URL, then redeploy. (${detail})`,
    );
  }
}

// Serialise read-modify-write so two requests in flight can't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: (data: Shape) => Promise<T> | T): Promise<T> {
  const next = queue.then(async () => {
    const data = await read();
    const result = await fn(data);
    await write(data);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

function inRange(w: Workout, from?: string, to?: string) {
  if (from && w.weekStart < from) return false;
  if (to && w.weekStart > to) return false;
  return true;
}

function sortWorkouts(list: Workout[]) {
  return list.sort((a, b) => a.weekStart.localeCompare(b.weekStart) || a.position - b.position);
}

export const fileStore: Store = {
  async listWorkouts(range) {
    const { workouts } = await read();
    return sortWorkouts(workouts.filter((w) => inRange(w, range?.from, range?.to)));
  },

  async createWorkouts(inputs: NewWorkout[]) {
    return withLock((data) => {
      const created = inputs.map(normalizeWorkout);
      data.workouts.push(...created);
      return created;
    });
  },

  async updateWorkout(id: string, patch: WorkoutPatch) {
    return withLock((data) => {
      const target = data.workouts.find((w) => w.id === id);
      if (!target) return null;
      Object.assign(target, patch);
      if (patch.done !== undefined) {
        target.doneAt = patch.done ? new Date().toISOString() : null;
      }
      return { ...target };
    });
  },

  async deleteWorkout(id: string) {
    return withLock((data) => {
      const before = data.workouts.length;
      data.workouts = data.workouts.filter((w) => w.id !== id);
      return data.workouts.length < before;
    });
  },

  async deletePlannedInWeeks(weekStarts: string[]) {
    const targets = new Set(weekStarts);
    return withLock((data) => {
      const before = data.workouts.length;
      data.workouts = data.workouts.filter((w) => w.done || !targets.has(w.weekStart));
      return before - data.workouts.length;
    });
  },

  async getSettings() {
    const { settings } = await read();
    return settings;
  },

  async saveSettings(settings: Settings) {
    return withLock((data) => {
      data.settings = settings;
      return settings;
    });
  },
};
