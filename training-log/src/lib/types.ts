export const WORKOUT_TYPES = [
  "long",
  "threshold",
  "easy",
  "strength",
  "strides",
  "cross",
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export function isWorkoutType(v: unknown): v is WorkoutType {
  return typeof v === "string" && (WORKOUT_TYPES as readonly string[]).includes(v);
}

/**
 * A session belongs to a WEEK, not a day. You plan "one long run and one
 * threshold this week" and tick them off whenever you actually get them done —
 * which is the only way a training week survives contact with a newborn.
 */
export type Workout = {
  id: string;
  /** Monday of the week this session belongs to, `YYYY-MM-DD`. */
  weekStart: string;
  type: WorkoutType;
  title: string;
  detail: string;
  /** Strides tacked onto this session — they usually ride along with an easy run. */
  strides: boolean;
  done: boolean;
  /** When it got ticked off. Recorded, but never something you have to plan. */
  doneAt: string | null;
  position: number;
};

export type NewWorkout = Omit<Workout, "id" | "doneAt"> & Partial<Pick<Workout, "id">>;

export type WorkoutPatch = Partial<Omit<Workout, "id">>;

/** `min` is the week's commitment, `stretch` is the good-week number. */
export type Goal = { min: number; stretch: number };
export type Goals = Record<WorkoutType, Goal>;

export type TemplateItem = {
  id: string;
  type: WorkoutType;
  title: string;
  detail: string;
  strides: boolean;
};

export type Settings = {
  goals: Goals;
  template: TemplateItem[];
};

export const DEFAULT_GOALS: Goals = {
  long: { min: 1, stretch: 1 },
  threshold: { min: 1, stretch: 2 },
  easy: { min: 1, stretch: 2 },
  strength: { min: 2, stretch: 3 },
  strides: { min: 1, stretch: 2 },
  cross: { min: 0, stretch: 0 },
};

export const DEFAULT_TEMPLATE: TemplateItem[] = [
  { id: "t1", type: "long", title: "Long run", detail: "", strides: false },
  { id: "t2", type: "threshold", title: "Threshold", detail: "", strides: false },
  { id: "t3", type: "easy", title: "Easy run", detail: "", strides: true },
  { id: "t4", type: "easy", title: "Easy run", detail: "", strides: false },
  { id: "t5", type: "strength", title: "Strength", detail: "Bands — upper body", strides: false },
  { id: "t6", type: "strength", title: "Strength", detail: "Bands — upper body", strides: false },
];

export const DEFAULT_SETTINGS: Settings = {
  goals: DEFAULT_GOALS,
  template: DEFAULT_TEMPLATE,
};
