const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DAILY_SYSTEM = `You are a warm, organized family assistant for a busy Modern Orthodox Jewish family in Skokie, Illinois.
Generate a concise WhatsApp morning briefing. Structure it around the family's 5 daily blocks:
Morning Routine, Drop-off, Pickup, Family Dinner (5:45 PM), and Bedtime (6:45 PM).
Use emojis. Bold names with *asterisks* (WhatsApp markdown). Keep it under 250 words.
IMPORTANT: If parentActivities exist for tonight, prominently flag this — state who is out,
what they're doing, and who is solo parenting. Make it feel like a helpful heads-up, not a burden.
If today is Thursday or Friday, add a short Shabbat prep note at the bottom.
Saturday and Sunday: relaxed warm tone, no school blocks, no drop-off/pickup.`;

const WEEKLY_SYSTEM = `You are a warm, organized family assistant for a busy Modern Orthodox Jewish family in Skokie, Illinois.
Generate a concise WhatsApp *weekly summary* for the upcoming Mon–Sun.
For each weekday list: who does drop-off, pickup, and bedtime. Note any parent evening activities
and who is solo parenting those nights. Note any extra tasks.
For Shabbat (Friday night → Saturday), add a warm Shabbat shalom note.
Use emojis. Bold names and day labels with *asterisks* (WhatsApp markdown). Keep it under 400 words.
End with an encouraging note for the week ahead.`;

function buildFallbackDaily(todaySchedule) {
  const { date, dayName, blocks, extraTasks, parentActivities } = todaySchedule;
  const day = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  let msg = `📅 *Good morning! Here's your ${day}, ${date} schedule:*\n\n`;

  for (const block of blocks) {
    const who = block.who === 'both' ? '*Both*' : `*${block.who}*`;
    msg += `${block.emoji} *${block.label}* (${block.time}) — ${who}\n`;
    if (block.tasks) msg += block.tasks.map(t => `  • ${t}`).join('\n') + '\n';
    msg += '\n';
  }

  if (extraTasks.length > 0) {
    msg += `📋 *Extra Tasks:*\n`;
    for (const t of extraTasks) msg += `${t.emoji || '•'} ${t.time} — *${t.who}*: ${t.task}\n`;
    msg += '\n';
  }

  if (parentActivities.length > 0) {
    msg += `⚠️ *Evening Alert:*\n`;
    for (const a of parentActivities) {
      msg += `${a.emoji || '🗓️'} *${a.who}* has ${a.activity} at ${a.time}\n`;
      msg += `→ *${a.soloParent}* is solo parenting tonight\n`;
    }
  }

  msg += `\nHave a wonderful day! 💙`;
  return msg;
}

function buildFallbackWeekly(weekDays) {
  const weekdays = weekDays.filter(d => !['saturday', 'sunday'].includes(d.dayName));
  const weekend  = weekDays.filter(d =>  ['saturday', 'sunday'].includes(d.dayName));

  let msg = `📆 *Upcoming Week at a Glance*\n\n`;

  for (const d of weekdays) {
    const label = d.dayName.charAt(0).toUpperCase() + d.dayName.slice(1);
    msg += `*${label} ${d.date}*\n`;
    const dropoff  = d.blocks.find(b => b.label === 'School Drop-off');
    const pickup   = d.blocks.find(b => b.label === 'School Pickup');
    const bedtime  = d.blocks.find(b => b.label === 'Bedtime Routine');
    if (dropoff)  msg += `  🚗 Drop-off: *${dropoff.who}*\n`;
    if (pickup)   msg += `  🏫 Pickup: *${pickup.who}*\n`;
    if (bedtime)  msg += `  🌙 Bedtime: *${bedtime.who}*\n`;
    for (const a of d.parentActivities) {
      msg += `  ⚠️ *${a.who}* out (${a.activity}) → *${a.soloParent}* solo\n`;
    }
    for (const t of d.extraTasks) {
      msg += `  ${t.emoji || '📌'} ${t.time}: ${t.task} (*${t.who}*)\n`;
    }
    msg += '\n';
  }

  msg += `🕯️ *Shabbat Shalom!* Have a restful weekend 💙\n`;
  return msg;
}

async function generateBriefing(todaySchedule) {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: DAILY_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(todaySchedule, null, 2) }],
    });
    return response.content[0].text;
  } catch (err) {
    console.error('[agent] Daily briefing fallback:', err.message);
    return buildFallbackDaily(todaySchedule);
  }
}

async function generateWeeklySummary(weekDays) {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      system: WEEKLY_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(weekDays, null, 2) }],
    });
    return response.content[0].text;
  } catch (err) {
    console.error('[agent] Weekly summary fallback:', err.message);
    return buildFallbackWeekly(weekDays);
  }
}

module.exports = { generateBriefing, generateWeeklySummary };
