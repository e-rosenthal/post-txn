import postgres from "postgres";
import { DEFAULT_SETTINGS, type NewWorkout, type Settings, type Workout, type WorkoutPatch } from "../types";
import { normalizeWorkout, type Store } from "./store";

/**
 * Postgres backend — the one that runs in production. Works with any Postgres
 * connection string (Neon, Supabase, Railway, a plain server).
 */

const SETTINGS_KEY = "app";

type Sql = ReturnType<typeof postgres>;

// Next.js hot-reloads modules in dev; keep one pool on globalThis so we don't
// open a new connection on every edit.
const globalForSql = globalThis as unknown as { __trainingLogSql?: Sql; __trainingLogReady?: Promise<void> };

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const declaresSsl = /[?&]sslmode=/.test(url);
  return postgres(url, {
    ssl: !isLocal && !declaresSsl ? "require" : undefined,
    max: 3,
    idle_timeout: 20,
    // Required for transaction-mode poolers (Supabase, pgbouncer).
    prepare: false,
    transform: postgres.camel,
  });
}

function db(): Sql {
  globalForSql.__trainingLogSql ??= connect();
  return globalForSql.__trainingLogSql;
}

/**
 * `date` is stored as text on purpose: the app deals in calendar days, and text
 * ISO dates sort correctly while never being re-interpreted in a server timezone.
 */
function ensureSchema(): Promise<void> {
  globalForSql.__trainingLogReady ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists workouts (
        id text primary key,
        date text not null,
        type text not null,
        title text not null default '',
        detail text not null default '',
        strides boolean not null default false,
        done boolean not null default false,
        done_at timestamptz,
        position integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
    await sql`create index if not exists workouts_date_idx on workouts (date)`;
    await sql`
      create table if not exists settings (
        key text primary key,
        value jsonb not null,
        updated_at timestamptz not null default now()
      )`;
  })().catch((err) => {
    // Let the next request retry rather than caching a failed migration.
    globalForSql.__trainingLogReady = undefined;
    throw err;
  });
  return globalForSql.__trainingLogReady;
}

type Row = {
  id: string;
  date: string;
  type: Workout["type"];
  title: string;
  detail: string;
  strides: boolean;
  done: boolean;
  doneAt: Date | string | null;
  position: number;
};

function toWorkout(row: Row): Workout {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    title: row.title,
    detail: row.detail,
    strides: row.strides,
    done: row.done,
    doneAt: row.doneAt ? new Date(row.doneAt).toISOString() : null,
    position: row.position,
  };
}

const COLUMNS = ["id", "date", "type", "title", "detail", "strides", "done", "doneAt", "position"] as const;

export const pgStore: Store = {
  async listWorkouts(range) {
    await ensureSchema();
    const sql = db();
    const from = range?.from ?? null;
    const to = range?.to ?? null;
    const rows = await sql<Row[]>`
      select id, date, type, title, detail, strides, done, done_at, position
      from workouts
      where (${from}::text is null or date >= ${from})
        and (${to}::text is null or date <= ${to})
      order by date asc, position asc`;
    return rows.map(toWorkout);
  },

  async createWorkouts(inputs: NewWorkout[]) {
    if (inputs.length === 0) return [];
    await ensureSchema();
    const sql = db();
    const records = inputs.map(normalizeWorkout);
    const rows = await sql<Row[]>`
      insert into workouts ${sql(records, ...COLUMNS)}
      returning id, date, type, title, detail, strides, done, done_at, position`;
    return rows.map(toWorkout);
  },

  async updateWorkout(id: string, patch: WorkoutPatch) {
    await ensureSchema();
    const sql = db();
    const fields: Record<string, unknown> = { ...patch };
    if (patch.done !== undefined) {
      fields.doneAt = patch.done ? new Date() : null;
    }
    const keys = COLUMNS.filter((c) => c !== "id" && c in fields);
    if (keys.length === 0) {
      const [existing] = await sql<Row[]>`
        select id, date, type, title, detail, strides, done, done_at, position
        from workouts where id = ${id}`;
      return existing ? toWorkout(existing) : null;
    }
    const [row] = await sql<Row[]>`
      update workouts
      set ${sql(fields, ...keys)}, updated_at = now()
      where id = ${id}
      returning id, date, type, title, detail, strides, done, done_at, position`;
    return row ? toWorkout(row) : null;
  },

  async deleteWorkout(id: string) {
    await ensureSchema();
    const sql = db();
    const rows = await sql`delete from workouts where id = ${id} returning id`;
    return rows.length > 0;
  },

  async deletePlannedInRange(from: string, to: string) {
    await ensureSchema();
    const sql = db();
    const rows = await sql`
      delete from workouts
      where done = false and date >= ${from} and date <= ${to}
      returning id`;
    return rows.length;
  },

  async getSettings() {
    await ensureSchema();
    const sql = db();
    const [row] = await sql<{ value: Partial<Settings> }[]>`
      select value from settings where key = ${SETTINGS_KEY}`;
    return { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
  },

  async saveSettings(settings: Settings) {
    await ensureSchema();
    const sql = db();
    await sql`
      insert into settings (key, value)
      values (${SETTINGS_KEY}, ${sql.json(settings)})
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
    return settings;
  },
};
