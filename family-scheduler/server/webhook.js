const express = require('express');
const { readSchedule } = require('./scheduleStore');
const { sendWhatsAppMessage } = require('./whatsapp');
const { handleMessage } = require('./chatAgent');

const router = express.Router();

// Tracks Meta message IDs we've already processed to prevent duplicate delivery
const processedMessageIds = new Set();

// GET /api/whatsapp/webhook — Meta webhook verification handshake
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[webhook] Verification accepted');
    return res.status(200).send(challenge);
  }
  console.warn('[webhook] Verification failed — token mismatch');
  res.sendStatus(403);
});

// POST /api/whatsapp/webhook — incoming messages from Meta
router.post('/webhook', (req, res) => {
  // Acknowledge immediately — Meta requires a fast response to avoid retries
  res.sendStatus(200);
  processIncomingAsync(req.body);
});

async function processIncomingAsync(body) {
  try {
    const changes = body?.entry?.[0]?.changes?.[0]?.value;
    if (!changes?.messages) return; // status updates, etc.

    const schedule = readSchedule();
    const authorizedNumbers = new Set(
      Object.values(schedule.family?.whatsapp || {}).map(n => normalizePhone(n))
    );

    for (const message of changes.messages) {
      if (message.type !== 'text') continue;
      if (processedMessageIds.has(message.id)) continue;
      processedMessageIds.add(message.id);

      const from = normalizePhone(message.from);
      const text = message.text?.body?.trim();

      if (!text) continue;

      if (!authorizedNumbers.has(from)) {
        console.warn(`[webhook] Unauthorized sender: ${from}`);
        continue;
      }

      console.log(`[webhook] Message from ${from}: "${text.slice(0, 80)}"`);
      const reply = await handleMessage(from, text);
      await sendWhatsAppMessage(message.from, reply);
    }
  } catch (err) {
    console.error('[webhook] processIncomingAsync error:', err.message);
  }
}

// Normalize phone to E.164 digits-only for comparison
// Meta delivers numbers without the +, family.whatsapp stores them with +
function normalizePhone(number) {
  return (number || '').replace(/\D/g, '');
}

module.exports = router;
