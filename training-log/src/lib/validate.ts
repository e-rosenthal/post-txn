import {
  DEFAULT_SETTINGS,
  WORKOUT_TYPES,
  isWorkoutType,
  type Goals,
  type NewWorkout,
  type Settings,
  type TemplateItem,
  type WorkoutPatch,
} from "./types";

export class BadRequest extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDate(value: unknown, field = "date"): string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new BadRequest(`${field} must be a YYYY-MM-DD string`);
  }
  return value;
}

function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parseNewWorkout(body: unknown): NewWorkout {
  if (typeof body !== "object" || body === null) throw new BadRequest("expected an object");
  const b = body as Record<string, unknown>;
  if (!isWorkoutType(b.type)) throw new BadRequest("unknown workout type");
  return {
    date: assertDate(b.date),
    type: b.type,
    title: str(b.title, 120),
    detail: str(b.detail, 1000),
    strides: Boolean(b.strides),
    done: Boolean(b.done),
    position: int(b.position, 0, 0, 999),
  };
}

export function parsePatch(body: unknown): WorkoutPatch {
  if (typeof body !== "object" || body === null) throw new BadRequest("expected an object");
  const b = body as Record<string, unknown>;
  const patch: WorkoutPatch = {};
  if (b.date !== undefined) patch.date = assertDate(b.date);
  if (b.type !== undefined) {
    if (!isWorkoutType(b.type)) throw new BadRequest("unknown workout type");
    patch.type = b.type;
  }
  if (b.title !== undefined) patch.title = str(b.title, 120);
  if (b.detail !== undefined) patch.detail = str(b.detail, 1000);
  if (b.strides !== undefined) patch.strides = Boolean(b.strides);
  if (b.done !== undefined) patch.done = Boolean(b.done);
  if (b.position !== undefined) patch.position = int(b.position, 0, 0, 999);
  return patch;
}

function parseGoals(value: unknown): Goals {
  const source = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const goals = {} as Goals;
  for (const type of WORKOUT_TYPES) {
    const raw = (source[type] ?? {}) as Record<string, unknown>;
    const fallback = DEFAULT_SETTINGS.goals[type];
    const min = int(raw.min, fallback.min, 0, 14);
    goals[type] = { min, stretch: Math.max(min, int(raw.stretch, fallback.stretch, 0, 14)) };
  }
  return goals;
}

function parseTemplate(value: unknown): TemplateItem[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.template;
  return value.slice(0, 40).flatMap((raw, i): TemplateItem[] => {
    if (typeof raw !== "object" || raw === null) return [];
    const item = raw as Record<string, unknown>;
    if (!isWorkoutType(item.type)) return [];
    return [
      {
        id: str(item.id, 40) || `t${i}`,
        day: int(item.day, 0, 0, 6),
        type: item.type,
        title: str(item.title, 120),
        detail: str(item.detail, 1000),
        strides: Boolean(item.strides),
      },
    ];
  });
}

export function parseSettings(body: unknown): Settings {
  if (typeof body !== "object" || body === null) throw new BadRequest("expected an object");
  const b = body as Record<string, unknown>;
  return {
    athlete: str(b.athlete, 60),
    goals: parseGoals(b.goals),
    template: parseTemplate(b.template),
  };
}
