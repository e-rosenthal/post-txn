# Cadence — training log

A small web app for tracking that you **did** your training, week after week.
It is not a replacement for Garmin or Strava: there is no pace, no distance, no
heart rate. There is one question per session — did you do it? — and a record of
the weeks stacking up behind you.

## The one idea

**Sessions belong to a week, not a day.** You plan "this week: one long run, one
threshold, two easy, two band sessions" and tick them off whenever you actually
get them done. No calendar, no rescheduling, no guilt about a Tuesday run that
happened on Wednesday.

## The three screens

**This week** (home) — a list of the week's sessions. Tap anywhere on a row to
tick it off; that's the whole interaction. Below it, a consistency grid: one row
per goal, one column per week, filled where you hit the goal. That's the
progress view — no totals, no charts.

**Plan** — import a plan from a CSV, set your weekly goals, and keep a template
week for when you're not following a written plan. Everything saves as you type.

**Stats** — the numbers, kept off the home screen deliberately: streaks,
sessions completed, weekly average, a stacked bar chart of sessions per week
over 12 / 26 / 52 weeks, and a table view of the same data.

## Importing a plan from CSV

One row per week, one column per session type:

```csv
week,long,threshold,easy,strength,strides,cross
2026-09-21,75 min steady,4 x 6 min @ threshold,45 min +strides|40 min,Bands — upper body|Bands — upper body,,
2026-09-28,80 min steady,5 x 6 min @ threshold,45 min +strides|40 min,Bands — upper body|Bands — lower + core,,30 min bike
```

`training-plan-template.csv` in this folder is a working example, and the Plan
screen has a **Example file** button that downloads it.

The rules:

- **`week`** is either a date (`2026-09-21`, `9/21/2026` — any day in the week
  works, it snaps to the Monday) or a plain week number (`1`, `Week 1`). If you
  use numbers, the importer asks which calendar week is week one.
- **One column per type.** Headings are matched loosely: `long`/`long run`,
  `threshold`/`tempo`/`workout`, `easy`/`recovery`, `strength`/`bands`/`lift`,
  `strides`, `cross`/`xt`. Unrecognised columns are listed and skipped.
- **`|` separates two sessions of the same type** in one week —
  `45 min +strides|40 min` is two easy runs.
- **`+strides` on a run** tacks strides onto it, so it counts toward both that
  run's goal and the strides goal.
- **A blank cell** means none that week.
- The cell text becomes the session's workout description; the session is named
  after its type.

Importing shows a preview first, and **replacing a week never removes a session
you've already ticked off.**

## Other things worth knowing

- **Strides double-count on purpose** — a run with strides counts as both that
  run and a strides session, because that's how strides actually get done.
- **A partial current week never breaks a streak.** Wednesday isn't a failed
  week.
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
4. Redeploy. The tables are created on the first request.

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

- `workouts` — one row per session: `week_start`, `type`, `title`, `detail`,
  `strides`, `done`. `week_start` is the Monday, stored as `YYYY-MM-DD` text
  rather than a timestamp, so a week never shifts under a server timezone.
- `settings` — a single JSON row holding your goals and template week.

The same operations are implemented twice behind one interface
(`src/lib/db/store.ts`): `pgStore` for deploys, `fileStore` for local dev. The
Plan screen tells you which one is live.

## API

Useful if you ever want to script against it or pull your data out.

| Method | Route | Does |
|---|---|---|
| `GET` | `/api/workouts?from=&to=` | List sessions, optionally within a range of week starts |
| `POST` | `/api/workouts` | Create one session, or an array of them |
| `PATCH` | `/api/workouts/:id` | Update any field (this is what ticking a row calls) |
| `DELETE` | `/api/workouts/:id` | Remove a session |
| `GET` / `PUT` | `/api/settings` | Read / write goals and template |
| `POST` | `/api/weeks/apply` | Fill a week from the template or a previous week |
| `POST` | `/api/weeks/import` | Bulk-create many weeks — what the CSV importer calls |

`GET /api/workouts` with no range returns everything — that's your export.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Postgres via `postgres.js`. No
auth, no accounts, no analytics: it is a single-person tool.

Chart and interface colours come from a palette validated for colour-vision
deficiency, contrast and lightness separation in both light and dark mode.
