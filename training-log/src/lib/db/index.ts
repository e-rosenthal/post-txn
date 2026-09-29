import { fileStore } from "./fileStore";
import { pgStore } from "./pgStore";
import type { Store } from "./store";

/**
 * Postgres when `DATABASE_URL` is set (that's what a deploy gets), otherwise a
 * local JSON file so `npm run dev` runs with nothing else installed.
 */
export const store: Store = process.env.DATABASE_URL ? pgStore : fileStore;

export const backendName = process.env.DATABASE_URL ? "postgres" : "file";

export type { Store };
