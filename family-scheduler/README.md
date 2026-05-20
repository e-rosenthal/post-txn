# Family Scheduler

A full-stack family schedule agent for the Rosenthal family. Sends AI-generated WhatsApp morning briefings, evening reminders, and weekly summaries.

## Setup

### 1. Install dependencies

```bash
cd family-scheduler
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `META_PHONE_NUMBER_ID` | Meta for Developers → your app → WhatsApp → API Setup |
| `META_ACCESS_TOKEN` | Same page — temporary token (or System User token for production) |
| `META_API_VERSION` | Default `v19.0` — update if Meta releases a newer stable version |
| `META_WEBHOOK_VERIFY_TOKEN` | Any secret string you choose — paste this into Meta's webhook config |
| `PORT` | Default `3001` |

### 3. WhatsApp Chat Bot setup

The bot receives messages from both parents and responds using Claude with tool access to the schedule.

**Webhook registration:**
1. Your server must be publicly reachable (use [ngrok](https://ngrok.com) for local dev: `ngrok http 3001`)
2. In Meta for Developers → your app → WhatsApp → Configuration:
   - **Callback URL**: `https://your-domain/api/whatsapp/webhook`
   - **Verify token**: the value you set for `META_WEBHOOK_VERIFY_TOKEN` in `.env`
   - Subscribe to the **messages** webhook field
3. Both parent numbers must be verified/added to the sandbox (or a production number)

**What the bot can do via WhatsApp chat:**
- Read today's schedule, any date, this or next week
- Add / remove parent evening activities (soloParent is auto-derived)
- Add / remove extra one-off tasks
- Override a single day's drop-off, pickup, or bedtime
- Confirm next week

**What it cannot do via chat** (must use the app):
- Change the weekly rotation
- Modify settings or WhatsApp numbers
- Bulk-overwrite the schedule

**Example messages to the bot:**
> "What's on Friday?"
> "Add Wife has book club at 7:30pm on Thursday"
> "Elliot has a work dinner next Wednesday at 7pm"
> "Change pickup to Elliot on Monday"
> "Confirm next week"

### 4. Meta Cloud API setup

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create App → **Business** type → Add **WhatsApp** product
3. In WhatsApp → API Setup, copy the **Phone Number ID** and **Temporary Access Token**
4. Add and verify both parent phone numbers in the sandbox (they must send "join \<sandbox-code\>" to the test number)
5. **For production**: Create a permanent token via a System User in Business Manager, and apply for the `whatsapp_business_messaging` permission

### 4. Run

```bash
npm run dev
```

Opens:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

## Automated Messages

| Time | Day | What happens |
|---|---|---|
| `morningBriefingTime` (default 6:45 AM) | Mon–Fri, Sun | AI-generated daily briefing sent to both parents |
| `eveningReminderTime` (default 5:00 PM) | Mon–Fri | Plain-text pickup/dinner/bedtime reminder |
| `weeklySummaryTime` (default 8:00 PM) | Saturday | Schedule check — asks parents to confirm next week if not yet done |
| `weeklySummaryTime` (default 8:00 PM) | Sunday | Schedule check (if still unconfirmed) + AI-generated weekly summary |

Saturday sends are skipped if **Shabbat-aware mode** is on.

## Data

All schedule data lives in `server/schedule.json`. The app saves changes there directly — no database needed.

### Overrides

Date-specific overrides (in `schedule.json → overrides`) win over the weekly rotation. Each override can include:
- Custom drop-off / pickup / bedtime assignments
- `parentActivities` — evening activities that trigger the solo-parent alert
- `extraTasks` — one-off tasks inserted into the day's timeline

`soloParent` on each `parentActivity` is always auto-derived as the other parent. You never set it manually.

## Project Structure

```
family-scheduler/
├── client/
│   └── src/
│       ├── App.jsx                  # 4-tab shell
│       └── components/
│           ├── TodayView.jsx        # Today's blocks + preview/send
│           ├── WeekEditor.jsx       # Weekly rotation editor
│           ├── OverridesTab.jsx     # Date-specific overrides
│           └── SettingsTab.jsx      # Timing, toggles, phone numbers
├── server/
│   ├── index.js                     # Express + cron jobs
│   ├── agent.js                     # Claude daily briefing + weekly summary
│   ├── whatsapp.js                  # Meta Cloud API sender
│   ├── scheduleStore.js             # Read/write schedule.json
│   └── schedule.json                # Single source of truth
├── .env.example
└── README.md
```
