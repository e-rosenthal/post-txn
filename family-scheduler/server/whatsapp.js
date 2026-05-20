const axios = require('axios');

async function sendWhatsAppMessage(to, message) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken   = process.env.META_ACCESS_TOKEN;
  const apiVersion    = process.env.META_API_VERSION || 'v19.0';
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const timestamp = new Date().toISOString();

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[whatsapp] ${timestamp} → Sent to ${to}: success`);
    return { success: true, recipient: to, timestamp, data: response.data };
  } catch (err) {
    const errDetail = err.response?.data || err.message;
    console.error(`[whatsapp] ${timestamp} → Failed to send to ${to}:`, errDetail);
    return { success: false, recipient: to, timestamp, error: errDetail };
  }
}

async function sendToAllParents(message, schedule) {
  const numbers = schedule.family?.whatsapp || {};
  const results = [];
  for (const [name, number] of Object.entries(numbers)) {
    if (number && !number.includes('X')) {
      const result = await sendWhatsAppMessage(number, message);
      results.push({ name, ...result });
    } else {
      console.warn(`[whatsapp] Skipping ${name} — phone number not configured`);
      results.push({ name, success: false, error: 'Phone number not configured' });
    }
  }
  return results;
}

function buildEveningReminder(todaySchedule) {
  const { dayName, blocks, parentActivities } = todaySchedule;
  const day = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const pickupBlock  = blocks.find(b => b.label === 'School Pickup');
  const bedtimeBlock = blocks.find(b => b.label === 'Bedtime Routine');

  let msg = `🌇 *Evening Reminder — ${day}*\n\n`;

  if (pickupBlock) msg += `🏫 Pickup: *${pickupBlock.who}* at ${pickupBlock.time}\n`;
  msg += `🍽️ Family Dinner: *5:45 PM*\n`;
  if (bedtimeBlock) {
    const who = bedtimeBlock.who === 'both' ? '*Both*' : `*${bedtimeBlock.who}*`;
    msg += `🌙 Bedtime: ${who} at *6:45 PM*\n`;
  }

  if (parentActivities.length > 0) {
    msg += `\n⚠️ *Tonight:*\n`;
    for (const a of parentActivities) {
      msg += `${a.emoji || '🗓️'} *${a.who}* is out (${a.activity} at ${a.time})\n`;
      msg += `→ *${a.soloParent}* is solo parenting tonight 💪\n`;
    }
  }

  return msg;
}

/**
 * Sent Saturday 8 PM (and Sunday 8 PM if still unconfirmed) asking
 * parents to review/confirm the coming week in the app.
 */
function buildScheduleCheckMessage(weekDays, day) {
  const isSunday = day === 'sunday';
  const weekdays = weekDays.filter(d => !['saturday', 'sunday'].includes(d.dayName));

  const monday = weekdays[0];
  const friday = weekdays[weekdays.length - 1];

  let msg = isSunday
    ? `📋 *Final reminder — please confirm next week's schedule!*\n`
    : `📋 *Heads up — have you set next week's schedule?*\n`;

  msg += `_(${monday?.date} – ${friday?.date})_\n\n`;

  msg += `Here's the current plan:\n`;
  for (const d of weekdays) {
    const label = d.dayName.charAt(0).toUpperCase() + d.dayName.slice(1);
    const dropoff  = d.blocks.find(b => b.label === 'School Drop-off');
    const pickup   = d.blocks.find(b => b.label === 'School Pickup');
    const bedtime  = d.blocks.find(b => b.label === 'Bedtime Routine');
    msg += `*${label}:* `;
    const parts = [];
    if (dropoff)  parts.push(`🚗 *${dropoff.who}*`);
    if (pickup)   parts.push(`🏫 *${pickup.who}*`);
    if (bedtime)  parts.push(`🌙 *${bedtime.who}*`);
    msg += parts.join(' · ') + '\n';
    if (d.parentActivities.length > 0) {
      for (const a of d.parentActivities) {
        msg += `  ⚠️ *${a.who}* out — *${a.soloParent}* solo\n`;
      }
    }
  }

  msg += `\nIf everything looks good, open the app and tap *Confirm Week* ✅`;
  return msg;
}

module.exports = { sendWhatsAppMessage, sendToAllParents, buildEveningReminder, buildScheduleCheckMessage };
