require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const { readSchedule, writeSchedule, getTodaySchedule, getWeekSchedule } = require('./scheduleStore');
const { generateBriefing, generateWeeklySummary } = require('./agent');
const { sendToAllParents, buildEveningReminder, buildScheduleCheckMessage } = require('./whatsapp');
const webhookRouter = require('./webhook');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/whatsapp', webhookRouter);

// ── REST endpoints ──────────────────────────────────────────────────────────

app.get('/api/today', (req, res) => {
  try {
    res.json(getTodaySchedule());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schedule', (req, res) => {
  try {
    res.json(readSchedule());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedule', (req, res) => {
  try {
    writeSchedule(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const schedule = readSchedule();
    schedule.settings = { ...schedule.settings, ...req.body };
    writeSchedule(schedule);
    res.json({ ok: true, settings: schedule.settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/preview', async (req, res) => {
  try {
    const todaySchedule = getTodaySchedule();
    const text = await generateBriefing(todaySchedule);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/send', async (req, res) => {
  try {
    const schedule = readSchedule();
    const todaySchedule = getTodaySchedule();
    const text = await generateBriefing(todaySchedule);
    const results = await sendToAllParents(text, schedule);
    const allOk = results.every(r => r.success);
    res.status(allOk ? 200 : 207).json({ text, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark the upcoming week as confirmed so Saturday/Sunday reminders won't fire again
app.post('/api/confirm-week', (req, res) => {
  try {
    const schedule = readSchedule();
    const tz = schedule.settings.timezone || 'America/Chicago';
    const now = dayjs().tz(tz);
    // Key = Monday of upcoming week
    const dayOfWeek = now.day(); // 0=Sun, 6=Sat
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = now.add(daysUntilMonday, 'day').format('YYYY-MM-DD');
    schedule.settings.weekConfirmed = schedule.settings.weekConfirmed || {};
    schedule.settings.weekConfirmed[nextMonday] = true;
    writeSchedule(schedule);
    res.json({ ok: true, weekConfirmed: nextMonday });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function isNextWeekConfirmed(schedule, tz) {
  const now = dayjs().tz(tz);
  const dayOfWeek = now.day();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = now.add(daysUntilMonday, 'day').format('YYYY-MM-DD');
  return !!(schedule.settings.weekConfirmed?.[nextMonday]);
}

// ── Cron jobs ───────────────────────────────────────────────────────────────

let cronJobs = [];

function clearCrons() {
  cronJobs.forEach(j => j.stop());
  cronJobs = [];
}

function scheduleCrons() {
  clearCrons();
  const schedule = readSchedule();
  const tz = schedule.settings.timezone || 'America/Chicago';

  const [briefHour, briefMin] = schedule.settings.morningBriefingTime.split(':');
  const [remHour, remMin] = schedule.settings.eveningReminderTime.split(':');
  const [wkHour, wkMin] = (schedule.settings.weeklySummaryTime || '20:00').split(':');

  // 1. Morning briefing (Mon–Fri + Sunday)
  const morningJob = cron.schedule(
    `${briefMin} ${briefHour} * * *`,
    async () => {
      try {
        const s = readSchedule();
        if (!s.settings.autoSendEnabled) return;
        const now = dayjs().tz(tz);
        const isSaturday = now.day() === 6;
        if (s.settings.shabbatAwareMode && isSaturday) return;

        const todaySchedule = getTodaySchedule();
        const text = await generateBriefing(todaySchedule);
        await sendToAllParents(text, s);
      } catch (err) {
        console.error('[cron] Morning briefing error:', err.message);
      }
    },
    { timezone: tz }
  );

  // 2. Evening reminder (daily except Shabbat Saturday)
  const eveningJob = cron.schedule(
    `${remMin} ${remHour} * * *`,
    async () => {
      try {
        const s = readSchedule();
        const now = dayjs().tz(tz);
        const isSaturday = now.day() === 6;
        if (s.settings.shabbatAwareMode && isSaturday) return;

        const todaySchedule = getTodaySchedule();
        const text = buildEveningReminder(todaySchedule);
        await sendToAllParents(text, s);
      } catch (err) {
        console.error('[cron] Evening reminder error:', err.message);
      }
    },
    { timezone: tz }
  );

  // 3. Saturday 8 PM — schedule check (if not confirmed)
  const saturdayJob = cron.schedule(
    `${wkMin} ${wkHour} * * 6`,
    async () => {
      try {
        const s = readSchedule();
        if (isNextWeekConfirmed(s, tz)) return;
        const weekSched = getWeekSchedule('next');
        const text = buildScheduleCheckMessage(weekSched, 'saturday');
        await sendToAllParents(text, s);
      } catch (err) {
        console.error('[cron] Saturday check error:', err.message);
      }
    },
    { timezone: tz }
  );

  // 4. Sunday 8 PM — schedule check (if not confirmed) + weekly summary
  const sundayJob = cron.schedule(
    `${wkMin} ${wkHour} * * 0`,
    async () => {
      try {
        const s = readSchedule();
        const weekSched = getWeekSchedule('next');

        if (!isNextWeekConfirmed(s, tz)) {
          const checkText = buildScheduleCheckMessage(weekSched, 'sunday');
          await sendToAllParents(checkText, s);
        }

        // Always send the weekly summary on Sunday
        const summaryText = await generateWeeklySummary(weekSched);
        await sendToAllParents(summaryText, s);
      } catch (err) {
        console.error('[cron] Sunday summary error:', err.message);
      }
    },
    { timezone: tz }
  );

  cronJobs = [morningJob, eveningJob, saturdayJob, sundayJob];

  console.log(`[cron] Morning briefing  @ ${briefHour}:${briefMin} ${tz}`);
  console.log(`[cron] Evening reminder  @ ${remHour}:${remMin} ${tz}`);
  console.log(`[cron] Sat schedule check & Sun summary @ ${wkHour}:${wkMin} ${tz}`);
}

scheduleCrons();

// Serve the built React frontend (production / Fly.io)
const clientDist = require('path').join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(require('path').join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`);
});
