# Canoe Trip Split

A tiny expense splitter for a fixed group of friends on one trip. Add what you paid for, pick who it should be split between (everyone, or just a couple of people), optionally attach a photo of the receipt, and everyone sees a live "who owes who" balance — already simplified to the fewest payments needed to settle up.

No accounts, no passwords: everyone opens the same link and picks their name from a list.

## How it works

- **First person to open the link** adds everyone's name, then picks their own.
- **Add something**: one form at the top with a toggle between two modes.
  - **Shared expense** — description, amount, who paid, who it's split between (defaults to everyone, with "Everyone" / "Just the payer" shortcuts), optional receipt photo.
  - **Paying someone back** — who paid, who received it, amount, optional note. Settles an existing balance instead of adding a new shared cost.
- **Who owes who**: leads with your own position ("You're owed $45 overall") plus the trip total and your share, then lists the payments needed — reduced to the minimum number (e.g. if Bob owes Alice $10 and Alice owes Carol $10, it just shows Bob owes Carol $10 — Alice is already settled inside the math and never has to touch money).
- Deleting anything asks for confirmation first, since there's no undo.
- Anyone can add or remove an expense.
- Payments appear in their own "Payments" list, separate from the expenses list, so trip costs and settling-up never get mixed together. Delete one the same way you'd delete an expense if it was entered by mistake.
- **Trip settings** (`/admin`, linked from the header as "Trip settings"): rename the trip, add/rename/remove people, bulk-import expenses from a CSV, and edit or delete any expense. This page isn't password-protected — it's reachable by anyone with the app link, same trust model as the rest of the app. Say the word if you'd rather it be locked behind a shared passcode.

## Importing expenses from a CSV

On the Trip settings page: **Download CSV template** for the exact column format, or build your own with these columns:

| column | required | notes |
| --- | --- | --- |
| `description` | yes | |
| `amount` | yes | plain number, no currency symbol |
| `paid_by` | yes | must match a name already in the trip |
| `split_with` | no | semicolon-separated names (e.g. `Alice;Bob`), or `everyone` / blank to split with the whole group |

Upload the file and it reports how many rows imported and, for any it skipped, which row and why (unknown name, bad amount, etc.) so you can fix and re-upload just those rows.

## Deploy (Vercel, free tier)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. **Important**: set the project's **Root Directory** to `canoe-split` (this app lives in a subfolder of the repo).
4. Before or after the first deploy, go to the project's **Storage** tab and add:
   - A **Postgres** database (Neon, via Vercel's marketplace) — this sets `DATABASE_URL` automatically.
   - A **Blob** store — this sets `BLOB_READ_WRITE_TOKEN` automatically (used for receipt photo uploads).
5. Redeploy (Vercel does this automatically after you connect storage, or trigger it manually from the Deployments tab).
6. Open the deployed URL, add your 6 names, and start logging expenses.

That's it — no manual database setup or migrations. The app creates its own tables on first use.

## Local development

Requires a local (or remote) Postgres instance.

```bash
npm install
cp .env.example .env.local
# edit .env.local and set DATABASE_URL to your local Postgres connection string
npm run dev
```

Receipt uploads need `BLOB_READ_WRITE_TOKEN` from a real Vercel Blob store to work locally — everything else works without it.

## Notes

- Splits are always even across whoever's selected for an expense — no per-person custom amounts, by design, to keep this simple.
- This is scoped to one trip with one fixed group. It's not built for running multiple trips/groups from the same deployment.
