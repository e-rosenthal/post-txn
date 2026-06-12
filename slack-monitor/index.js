require("dotenv").config();
const { App } = require("@slack/bolt");

const REQUIRED_ENV = [
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
  "SLACK_MONITOR_CHANNEL",
  "KEYWORDS",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    console.error("Copy .env.example to .env and fill in the values.");
    process.exit(1);
  }
}

const keywords = process.env.KEYWORDS.split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (keywords.length === 0) {
  console.error("KEYWORDS is empty — add at least one keyword to watch for.");
  process.exit(1);
}

const monitorChannel = process.env.SLACK_MONITOR_CHANNEL.replace(/^#/, "");
const alertChannel = (process.env.SLACK_ALERT_CHANNEL || monitorChannel).replace(/^#/, "");
const alertOnly = process.env.ALERT_ONLY === "true";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Resolve a channel name to its ID, or return the value if it looks like an ID already
async function resolveChannelId(client, nameOrId) {
  if (/^[A-Z0-9]{9,}$/.test(nameOrId)) return nameOrId;

  let cursor;
  do {
    const res = await client.conversations.list({
      types: "public_channel,private_channel",
      limit: 200,
      cursor,
    });
    const match = res.channels.find((c) => c.name === nameOrId);
    if (match) return match.id;
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  throw new Error(`Channel not found: ${nameOrId}`);
}

let monitorChannelId;
let alertChannelId;

app.message(async ({ message, client, logger }) => {
  // Only process messages from the monitored channel
  if (message.channel !== monitorChannelId) return;
  // Skip bot messages and message edits/deletes
  if (message.subtype) return;

  const text = message.text || "";
  const matched = keywords.filter((kw) =>
    text.toLowerCase().includes(kw.toLowerCase())
  );

  if (matched.length === 0) return;

  const label = matched.length === 1 ? `keyword` : `keywords`;
  const matchList = matched.map((k) => `*${k}*`).join(", ");
  const alertText = `:bell: Keyword match in <#${monitorChannelId}>: ${matchList}`;

  logger.info(`Match found — keywords: ${matched.join(", ")} | user: ${message.user}`);

  if (alertOnly || alertChannel !== monitorChannel) {
    // Post a standalone alert (to a separate channel or as a top-level message)
    await client.chat.postMessage({
      channel: alertChannelId,
      text: alertText,
      unfurl_links: false,
    });
  } else {
    // Reply in the same thread so the original message gets context
    await client.chat.postMessage({
      channel: monitorChannelId,
      thread_ts: message.thread_ts || message.ts,
      text: `:bell: This message matched ${label}: ${matchList}`,
      unfurl_links: false,
    });
  }
});

(async () => {
  await app.start();

  const { client } = app;
  monitorChannelId = await resolveChannelId(client, monitorChannel);
  alertChannelId = await resolveChannelId(client, alertChannel);

  console.log(`Slack monitor running`);
  console.log(`  Watching : #${monitorChannel} (${monitorChannelId})`);
  console.log(`  Alerting : #${alertChannel} (${alertChannelId})`);
  console.log(`  Keywords : ${keywords.join(", ")}`);
  console.log(`  Mode     : ${alertOnly ? "alert-only" : "thread reply"}`);
})();
