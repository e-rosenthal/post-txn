const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const { readSchedule, writeSchedule, getTodaySchedule, getWeekSchedule, buildDaySchedule } = require('./scheduleStore');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory conversation history keyed by sender phone number
const conversationHistories = new Map();
const MAX_HISTORY = 20; // 10 turn pairs

const CHAT_SYSTEM = `You are the Rosenthal family's scheduling assistant — warm, sharp, and WhatsApp-native.
The family: *Elliot* and *Naomi* (parents), two kids in school in Skokie, Illinois.
Tone: friendly, concise. Use emojis. Bold names with *asterisks*. Keep replies under 150 words for simple queries.

You have tools to read and make limited updates to the family schedule:
- READ: today's schedule, any date's schedule, this or next week's schedule
- WRITE (limited): add/remove parent evening activities, add/remove extra tasks, override a single day's drop-off/pickup/bedtime assignment, confirm next week

Rules:
1. Always read before writing — confirm what's already there before making changes.
2. After every write, confirm exactly what you did: date, what changed.
3. soloParent is always the other parent — you set it automatically.
4. You CANNOT change the weekly rotation (base assignments), settings, WhatsApp numbers, or global times. If asked, explain politely that those changes must be made in the app.
5. Today's date and timezone are America/Chicago. If the user says "tomorrow" or "Friday", figure out the YYYY-MM-DD date before calling tools.
6. If an activity or task doesn't exist, say so clearly rather than guessing.`;

const TOOL_DEFINITIONS = [
  {
    name: 'get_today_schedule',
    description: "Get today's full schedule — all blocks, extra tasks, and parent activities.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_week_schedule',
    description: 'Get the schedule for this week or next week (Mon–Sun).',
    input_schema: {
      type: 'object',
      properties: {
        which: {
          type: 'string',
          enum: ['this', 'next'],
          description: 'Which week — "this" for the current week, "next" for next week.',
        },
      },
      required: ['which'],
    },
  },
  {
    name: 'get_schedule_for_date',
    description: 'Get the full schedule for a specific date.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format.' },
      },
      required: ['date'],
    },
  },
  {
    name: 'add_parent_activity',
    description:
      'Add a parent evening activity for a specific date. soloParent is automatically set to the other parent.',
    input_schema: {
      type: 'object',
      properties: {
        date:        { type: 'string', description: 'YYYY-MM-DD' },
        who:         { type: 'string', enum: ['Elliot', 'Naomi'], description: 'The parent who is out.' },
        time:        { type: 'string', description: 'Time in HH:MM 24-hour format.' },
        activity:    { type: 'string', description: 'Name of the activity.' },
        emoji:       { type: 'string', description: 'A relevant emoji.' },
        soloParent:  { type: 'string', enum: ['Elliot', 'Naomi'], description: 'The parent staying home. Always set this to the other parent.' },
      },
      required: ['date', 'who', 'time', 'activity', 'soloParent'],
    },
  },
  {
    name: 'remove_parent_activity',
    description: 'Remove a parent evening activity by its ID.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        id:   { type: 'string', description: 'The UUID of the activity to remove.' },
      },
      required: ['date', 'id'],
    },
  },
  {
    name: 'add_extra_task',
    description: 'Add an extra one-off task to a specific date.',
    input_schema: {
      type: 'object',
      properties: {
        date:  { type: 'string', description: 'YYYY-MM-DD' },
        time:  { type: 'string', description: 'HH:MM 24-hour format.' },
        who:   { type: 'string', enum: ['Elliot', 'Naomi', 'both'] },
        task:  { type: 'string', description: 'Task description.' },
        emoji: { type: 'string', description: 'A relevant emoji.' },
      },
      required: ['date', 'time', 'who', 'task'],
    },
  },
  {
    name: 'remove_extra_task',
    description: 'Remove an extra task by its ID.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        id:   { type: 'string', description: 'The UUID of the task to remove.' },
      },
      required: ['date', 'id'],
    },
  },
  {
    name: 'set_day_override',
    description: 'Override the drop-off, pickup, or bedtime assignment for a specific date only.',
    input_schema: {
      type: 'object',
      properties: {
        date:  { type: 'string', description: 'YYYY-MM-DD' },
        field: { type: 'string', enum: ['dropoff', 'pickup', 'bedtime'] },
        value: { type: 'string', description: 'Elliot, Naomi, both, or null to clear the override.' },
      },
      required: ['date', 'field', 'value'],
    },
  },
  {
    name: 'set_meal',
    description: "Set what's for dinner on a specific date and who is cooking.",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        meal: { type: 'string', description: "What's for dinner (e.g. 'Roast chicken')." },
        cook: { type: 'string', enum: ['Elliot', 'Naomi', 'both'], description: 'Who is cooking.' },
      },
      required: ['date', 'meal', 'cook'],
    },
  },
  {
    name: 'confirm_week',
    description:
      "Mark the upcoming week as confirmed so Saturday/Sunday reminder messages won't fire. Provide the Monday date of the week to confirm.",
    input_schema: {
      type: 'object',
      properties: {
        monday: { type: 'string', description: 'YYYY-MM-DD date of the Monday of the week to confirm.' },
      },
      required: ['monday'],
    },
  },
];

function dispatchTool(name, input) {
  try {
    switch (name) {
      case 'get_today_schedule':
        return getTodaySchedule();

      case 'get_week_schedule': {
        const which = input.which || 'this';
        return getWeekSchedule(which);
      }

      case 'get_schedule_for_date': {
        const schedule = readSchedule();
        return buildDaySchedule(schedule, input.date);
      }

      case 'add_parent_activity': {
        const schedule = readSchedule();
        if (!schedule.overrides[input.date]) schedule.overrides[input.date] = {};
        if (!schedule.overrides[input.date].parentActivities) {
          schedule.overrides[input.date].parentActivities = [];
        }
        const id = uuidv4();
        schedule.overrides[input.date].parentActivities.push({
          id,
          who: input.who,
          time: input.time,
          activity: input.activity,
          emoji: input.emoji || '🗓️',
          soloParent: input.soloParent,
        });
        writeSchedule(schedule);
        return { ok: true, id, date: input.date };
      }

      case 'remove_parent_activity': {
        const schedule = readSchedule();
        const activities = schedule.overrides?.[input.date]?.parentActivities;
        if (!activities) return { ok: false, error: 'No activities found for that date.' };
        const before = activities.length;
        schedule.overrides[input.date].parentActivities = activities.filter(a => a.id !== input.id);
        if (schedule.overrides[input.date].parentActivities.length === before) {
          return { ok: false, error: 'Activity ID not found.' };
        }
        writeSchedule(schedule);
        return { ok: true };
      }

      case 'add_extra_task': {
        const schedule = readSchedule();
        if (!schedule.overrides[input.date]) schedule.overrides[input.date] = {};
        if (!schedule.overrides[input.date].extraTasks) {
          schedule.overrides[input.date].extraTasks = [];
        }
        const id = uuidv4();
        schedule.overrides[input.date].extraTasks.push({
          id,
          time: input.time,
          who: input.who,
          task: input.task,
          emoji: input.emoji || '📌',
        });
        writeSchedule(schedule);
        return { ok: true, id, date: input.date };
      }

      case 'remove_extra_task': {
        const schedule = readSchedule();
        const tasks = schedule.overrides?.[input.date]?.extraTasks;
        if (!tasks) return { ok: false, error: 'No extra tasks found for that date.' };
        const before = tasks.length;
        schedule.overrides[input.date].extraTasks = tasks.filter(t => t.id !== input.id);
        if (schedule.overrides[input.date].extraTasks.length === before) {
          return { ok: false, error: 'Task ID not found.' };
        }
        writeSchedule(schedule);
        return { ok: true };
      }

      case 'set_day_override': {
        const schedule = readSchedule();
        if (!schedule.overrides[input.date]) schedule.overrides[input.date] = {};
        schedule.overrides[input.date][input.field] = input.value === 'null' ? null : input.value;
        writeSchedule(schedule);
        return { ok: true, date: input.date, field: input.field, value: input.value };
      }

      case 'set_meal': {
        const schedule = readSchedule();
        if (!schedule.meals) schedule.meals = {};
        schedule.meals[input.date] = { meal: input.meal, cook: input.cook };
        writeSchedule(schedule);
        return { ok: true, date: input.date, meal: input.meal, cook: input.cook };
      }

      case 'confirm_week': {
        const schedule = readSchedule();
        if (!schedule.settings.weekConfirmed) schedule.settings.weekConfirmed = {};
        schedule.settings.weekConfirmed[input.monday] = true;
        writeSchedule(schedule);
        return { ok: true, weekConfirmed: input.monday };
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`[chatAgent] Tool ${name} error:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function handleMessage(from, text) {
  try {
    if (!conversationHistories.has(from)) conversationHistories.set(from, []);
    const history = conversationHistories.get(from);

    history.push({ role: 'user', content: text });

    // Agentic tool-use loop
    let loopMessages = [...history];
    let finalReply = "Sorry, I couldn't process that. Please try again.";

    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: CHAT_SYSTEM,
        tools: TOOL_DEFINITIONS,
        messages: loopMessages,
      });

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text');
        finalReply = textBlock?.text ?? 'Done.';
        loopMessages.push({ role: 'assistant', content: response.content });
        break;
      }

      if (response.stop_reason === 'tool_use') {
        loopMessages.push({ role: 'assistant', content: response.content });

        const toolResults = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          console.log(`[chatAgent] Tool call: ${block.name}`, block.input);
          const result = dispatchTool(block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
        loopMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unexpected stop reason
      break;
    }

    // Update persistent history with only the final user+assistant turn pair
    history.push({ role: 'assistant', content: finalReply });
    // Trim to max 20 messages
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    return finalReply;
  } catch (err) {
    console.error('[chatAgent] handleMessage error:', err.message);
    return "Sorry, something went wrong. Please try again in a moment. 🙏";
  }
}

module.exports = { handleMessage };
