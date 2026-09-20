# Cadence — training log

A small web app for tracking that you **did** your training, week after week.
It is not a replacement for Garmin or Strava: there is no pace, no distance, no
heart rate. There is one question per session — did you do it? — and a record of
the weeks stacking up behind you.

Built for a week that looks like: one long run, one or two threshold runs,
strides (usually tacked onto another run), one or two easy runs, and two or
three strength days.

## What's in it

**Week** — the main screen. Seven days, the sessions planned for each, and a tick
box per session. Above it, one meter per weekly goal (`2/3` strength, `1/2`
threshold…) that fills as the week goes. Two buttons fill an empty week in one
click: *Fill from my template* or *Copy last week*.

**Over time** — current and best streak, sessions completed, recent weekly
average, a stacked bar chart of sessions per week, and a consistency grid showing
which goals were met in which weeks. 12 weeks / 26 weeks / 1 year, plus a table
view of the same numbers.

**Plan** — your weekly goals (a commitment number and a stretch number per type)
and your template week. Everything saves as you change it.

Details worth knowing:

- **Strides double-count on purpose.** Toggle "strides on this run" on an easy
  run and it counts toward both the easy goal and the strides goal, because
  that's how strides actually get done. A standalone strides session works too.
- **Nothing is ever lost to a re-plan.** "Fill from my template" clears only the
  week's *unfinished* sessions; anything already ticked off stays.
- **A partial current week never breaks a streak.** Tuesday isn't a failed week.
- Dark mode follows your system and can be toggled.

## Running it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `DATABASE_URL` set, everything is stored in
`.data/training-log.json` — no database to install, and the file is gitignored.

## Deploying it (free)

The app needs a Postgres database. Both steps below are free tiers.

### Vercel + Neon

1. Push this repo to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repo. **Set the Root
   Directory to `training-log`** — the app lives in a subfolder.
3. In the new project, go to **Storage → Create Database → Neon (Postgres)** and
   attach it. Vercel injects `DATABASE_URL` for you.
4. Redeploy. That's it — the tables are created on the first request.

### Anything else

Any host that runs Node and any Postgres will do (Railway, Render, Fly, a VPS).
Set one environment variable and run `npm run build && npm start`:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

The connection string is all the app needs. It creates its own tables on first
use, works with connection poolers (`prepare` is off), and adds `sslmode=require`
automatically for non-local hosts.

## How it stores things

Two tables, created automatically:

- `workouts` — one row per session: `date`, `type`, `title`, `detail`,
  `strides`, `done`. Dates are stored as `YYYY-MM-DD` text, never timestamps, so
  a Saturday long run stays on Saturday regardless of server timezone.
- `settings` — a single JSON row holding your goals and template week.

The same operations are implemented twice, behind one interface
(`src/lib/db/store.ts`): `pgStore` for deploys, `fileStore` for local dev. The
Plan tab tells you which one is live.

## API

Useful if you ever want to script against it or pull your data out.

| Method | Route | Does |
|---|---|---|
| `GET` | `/api/workouts?from=&to=` | List sessions, optionally within a date range |
| `POST` | `/api/workouts` | Create one session, or an array of them |
| `PATCH` | `/api/workouts/:id` | Update any field (this is what ticking a box calls) |
| `DELETE` | `/api/workouts/:id` | Remove a session |
| `GET` / `PUT` | `/api/settings` | Read / write goals and template |
| `POST` | `/api/weeks/apply` | Fill a week from the template or a previous week |

`GET /api/workouts` with no range returns everything — that's your export.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Postgres via `postgres.js`. No
auth, no accounts, no analytics: it is a single-person tool.

Chart and interface colours come from a palette validated for colour-vision
deficiency, contrast and lightness separation in both light and dark mode — the
six workout types stay distinguishable when stacked.
