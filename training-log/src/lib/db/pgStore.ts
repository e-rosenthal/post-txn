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
 * `week_start` is stored as text on purpose: the app deals in calendar weeks,
 * and text ISO dates sort correctly while never being re-interpreted in a
 * server timezone.
 */
function ensureSchema(): Promise<void> {
  globalForSql.__trainingLogReady ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists workouts (
        id text primary key,
        week_start text not null,
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
    // Migrate a database created before planning moved from days to weeks.
    await sql`
      do $$
      begin
        if exists (
          select 1 from information_schema.columns
          where table_name = 'workouts' and column_name = 'date'
        ) then
          alter table workouts add column if not exists week_start text;
          update workouts
            set week_start = to_char(date_trunc('week', date::date), 'YYYY-MM-DD')
            where week_start is null;
          alter table workouts alter column week_start set not null;
          alter table workouts drop column date;
        end if;
      end
      $$;`;
    await sql`create index if not exists workouts_week_idx on workouts (week_start)`;
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
  weekStart: string;
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
    weekStart: row.weekStart,
    type: row.type,
    title: row.title,
    detail: row.detail,
    strides: row.strides,
    done: row.done,
    doneAt: row.doneAt ? new Date(row.doneAt).toISOString() : null,
    position: row.position,
  };
}

const COLUMNS = ["id", "weekStart", "type", "title", "detail", "strides", "done", "doneAt", "position"] as const;

export const pgStore: Store = {
  async listWorkouts(range) {
    await ensureSchema();
    const sql = db();
    const from = range?.from ?? null;
    const to = range?.to ?? null;
    const rows = await sql<Row[]>`
      select id, week_start, type, title, detail, strides, done, done_at, position
      from workouts
      where (${from}::text is null or week_start >= ${from})
        and (${to}::text is null or week_start <= ${to})
      order by week_start asc, position asc`;
    return rows.map(toWorkout);
  },

  async createWorkouts(inputs: NewWorkout[]) {
    if (inputs.length === 0) return [];
    await ensureSchema();
    const sql = db();
    const records = inputs.map(normalizeWorkout);
    const rows = await sql<Row[]>`
      insert into workouts ${sql(records, ...COLUMNS)}
      returning id, week_start, type, title, detail, strides, done, done_at, position`;
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
        select id, week_start, type, title, detail, strides, done, done_at, position
        from workouts where id = ${id}`;
      return existing ? toWorkout(existing) : null;
    }
    const [row] = await sql<Row[]>`
      update workouts
      set ${sql(fields, ...keys)}, updated_at = now()
      where id = ${id}
      returning id, week_start, type, title, detail, strides, done, done_at, position`;
    return row ? toWorkout(row) : null;
  },

  async deleteWorkout(id: string) {
    await ensureSchema();
    const sql = db();
    const rows = await sql`delete from workouts where id = ${id} returning id`;
    return rows.length > 0;
  },

  async deletePlannedInWeeks(weekStarts: string[]) {
    if (weekStarts.length === 0) return 0;
    await ensureSchema();
    const sql = db();
    const rows = await sql`
      delete from workouts
      where done = false and week_start in ${sql(weekStarts)}
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
