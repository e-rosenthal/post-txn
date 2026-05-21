const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const SCHEDULE_PATH = path.join(__dirname, 'schedule.json');

function readSchedule() {
  const raw = fs.readFileSync(SCHEDULE_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeSchedule(data) {
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function buildDaySchedule(schedule, targetDate) {
  const tz = schedule.settings.timezone || 'America/Chicago';
  const dt = dayjs.tz(targetDate, tz);
  const dateString = dt.format('YYYY-MM-DD');
  const dayName = dt.format('dddd').toLowerCase();

  const weekly = schedule.weeklyAssignments[dayName] || {};
  const override = schedule.overrides[dateString] || {};

  const dropoff = override.dropoff !== undefined ? override.dropoff : weekly.dropoff;
  const pickup  = override.pickup  !== undefined ? override.pickup  : weekly.pickup;
  const bedtime = override.bedtime !== undefined ? override.bedtime : weekly.bedtime;

  const extraTasks       = override.extraTasks       || [];
  const parentActivities = override.parentActivities || [];

  let soloParentTonight = null;
  if (parentActivities.length > 0) {
    soloParentTonight = parentActivities[0].soloParent || null;
  }

  const { morningRoutine, dinner, bedtime: bedtimeBlock } = schedule.dailyStructure;
  const isWeekend = dayName === 'saturday' || dayName === 'sunday';

  const mealData = schedule.meals?.[dateString] || null;

  const blocks = [];

  blocks.push({
    time: morningRoutine.time,
    label: 'Morning Routine',
    who: 'both',
    tasks: morningRoutine.tasks,
    emoji: morningRoutine.emoji,
  });

  if (!isWeekend && dropoff) {
    blocks.push({
      time: schedule.dropoffTime,
      label: 'School Drop-off',
      who: dropoff,
      emoji: '🚗',
    });
  }

  if (!isWeekend && pickup) {
    blocks.push({
      time: schedule.pickupTime,
      label: 'School Pickup',
      who: pickup,
      emoji: '🏫',
    });
  }

  blocks.push({
    time: dinner.time,
    label: 'Family Dinner',
    who: 'both',
    tasks: [dinner.task],
    emoji: dinner.emoji,
    meal: mealData,
  });

  blocks.push({
    time: bedtimeBlock.time,
    label: 'Bedtime Routine',
    who: bedtime,
    tasks: bedtimeBlock.tasks,
    emoji: bedtimeBlock.emoji,
  });

  return {
    date: dateString,
    dayName,
    blocks,
    extraTasks,
    parentActivities,
    soloParentTonight,
    dropoffTime: schedule.dropoffTime,
    pickupTime:  schedule.pickupTime,
    meal: mealData,
  };
}

function getTodaySchedule() {
  const schedule = readSchedule();
  const tz = schedule.settings.timezone || 'America/Chicago';
  const today = dayjs().tz(tz).format('YYYY-MM-DD');
  return buildDaySchedule(schedule, today);
}

/**
 * Returns an array of day-schedule objects for Mon–Fri of either the
 * current week ("this") or next week ("next").
 */
function getWeekSchedule(which = 'next') {
  const schedule = readSchedule();
  const tz = schedule.settings.timezone || 'America/Chicago';
  const now = dayjs().tz(tz);

  // Find the Monday of the target week
  const currentDay = now.day(); // 0 = Sun, 1 = Mon … 6 = Sat
  let mondayOffset;
  if (which === 'next') {
    // From any day, jump to next Monday
    mondayOffset = currentDay === 0 ? 1 : 8 - currentDay;
  } else {
    // This week's Monday
    mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  }

  const monday = now.add(mondayOffset, 'day');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = monday.add(i, 'day').format('YYYY-MM-DD');
    days.push(buildDaySchedule(schedule, d));
  }
  return days;
}

module.exports = { readSchedule, writeSchedule, getTodaySchedule, getWeekSchedule, buildDaySchedule };
