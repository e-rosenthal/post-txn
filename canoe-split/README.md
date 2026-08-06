# Canoe Trip Split

A tiny expense splitter for a fixed group of friends on one trip. Add what you paid for, pick who it should be split between (everyone, or just a couple of people), optionally attach a photo of the receipt, and everyone sees a live "who owes who" balance — already simplified to the fewest payments needed to settle up.

No accounts, no passwords: everyone opens the same link and picks their name from a list.

## How it works

- **First person to open the link** adds everyone's name, then picks their own.
- **Add an expense**: description, amount, who paid, who it's split between (defaults to everyone, with "Everyone" / "Just the payer" shortcuts), optional receipt photo.
- **Who owes who**: computed automatically from every expense, then reduced to the minimum number of payments (e.g. if Bob owes Alice $10 and Alice owes Carol $10, it just shows Bob owes Carol $10 — Alice's already settled inside the math and never has to touch money).
- Anyone can add or remove an expense.

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
