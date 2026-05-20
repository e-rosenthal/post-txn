# Trustly Pay-by-Bank Return Recovery Journey

An interactive visualization of the 90-day dunning cycle for handling payment returns through Trustly's pay-by-bank service. Shows two parallel flows (NSF and non-NSF returns) plus a set of triggered events, with full message copy for email, SMS, and phone touchpoints. Designed for risk product, CX, eng, and legal review.

## Quick start

Open `index.html` in any modern browser. No build step, no server required.

## Deploy to GitHub Pages

1. Create a new GitHub repo (public if you want free Pages hosting).
2. Upload all the files in this folder to the root of the repo, including `.nojekyll`.
3. Go to **Settings → Pages** in the repo.
4. Under "Source", select your main branch and root folder, then Save.
5. Wait a minute. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## What's here

- `index.html` — page markup and modal
- `styles.css` — all styling, with light + dark mode via CSS variables
- `app.js` — data (timeline, events, full message copy) and all behavior
- `.nojekyll` — tells GitHub Pages to serve files as-is (no Jekyll processing)
- `README.md` — this file

## Features

- **Two flows in parallel**: NSF (insufficient funds — R01, R09) and Non-NSF (account closed, unauthorized, frozen, stop payment — R02 through R29).
- **Phase bands** show the dunning progression: soft auto-retry → past due → pre-collections → final.
- **Dynamic retry timing**: NSF retries are positioned as approximate, since exact timing within the first week depends on processor windows and merchant configuration.
- **Triggered events panel**: six event-driven messages (decline due to balance, payment received, plan agreed, hardship received, promise-to-pay broken, dispute received) that fire any time, independent of the timeline.
- **View toggle**: focus on just the timeline, just the events, or both.
- **Inline editing**: click any subject or body to edit the copy. Edits auto-save to localStorage.
- **Add new stages**: + Add touchpoint on the timeline, + Add event in the events grid.
- **Remove stages**: each detail panel has a Remove button. Built-ins can be restored with Reset all; custom stages are removed permanently.
- **Exports**: download as JSON (for engineering), Markdown (for review), or a fresh HTML file with your edits baked in (for sharing).

## How edits work

All customizations live in your browser's localStorage, scoped to the URL where you opened the file. To share edits with someone else, use **Export HTML** — that produces a copy of the page that pre-populates localStorage on load, so anyone who opens it sees your version.

If you want a more durable collaboration model, use **Export JSON**, commit it to a `data.json` file in the repo, and have the page load from that file. The current build doesn't do that automatically, but `app.js` is structured to make it a small change.

## DPD clock

The visualization assumes a **dual clock** model:

- The **internal/risk DPD clock** starts at the return date (Day 0). Drives charge-off triggers, bureau reporting at 30/60/90, merchant settlement reversals.
- The **customer-facing past-due framing** waits until retries are exhausted (around Day 10 for NSF, Day 7 for non-NSF). It's unfair to tell a customer they're past due while still automatically retrying.

The DPD card in the page itself explains this.

## Operating notes

- NACHA permits up to 2 re-presentments of an NSF return within 180 days of original settlement; exact timing is dynamic and usually both attempts land within the week following the original return.
- Non-NSF returns require new authorization and cannot be auto-retried.
- Live agent calls begin at Day 45.
- Hardship and payment-plan options surface from Day 30; settlement offers from Day 75.
- All messaging assumes Reg E, FDCPA, TCPA, and applicable state law compliance; STOP/opt-out language is included on every SMS and email template.

## Version

v3 — dynamic retry timing, no fee references, multi-file build (May 2026).
