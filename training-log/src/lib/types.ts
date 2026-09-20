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

export type Workout = {
  id: string;
  /** Local calendar day, `YYYY-MM-DD`. Never a timestamp — no timezone math. */
  date: string;
  type: WorkoutType;
  title: string;
  detail: string;
  /** Strides tacked onto this session (they usually ride along with an easy run). */
  strides: boolean;
  done: boolean;
  doneAt: string | null;
  position: number;
};

export type NewWorkout = Omit<Workout, "id" | "doneAt"> & Partial<Pick<Workout, "id">>;

export type WorkoutPatch = Partial<Omit<Workout, "id">>;

/** `min` is the week's commitment, `stretch` is the good-week bonus. */
export type Goal = { min: number; stretch: number };
export type Goals = Record<WorkoutType, Goal>;

export type TemplateItem = {
  id: string;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  type: WorkoutType;
  title: string;
  detail: string;
  strides: boolean;
};

export type Settings = {
  athlete: string;
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
  { id: "t1", day: 0, type: "strength", title: "Strength", detail: "Lower body + core", strides: false },
  { id: "t2", day: 1, type: "threshold", title: "Threshold", detail: "4 x 6 min @ threshold, 2 min float", strides: false },
  { id: "t3", day: 2, type: "easy", title: "Easy run", detail: "Conversational", strides: true },
  { id: "t4", day: 3, type: "strength", title: "Strength", detail: "Upper body + hips", strides: false },
  { id: "t5", day: 4, type: "easy", title: "Easy run", detail: "Conversational", strides: false },
  { id: "t6", day: 5, type: "long", title: "Long run", detail: "Steady, all easy", strides: false },
];

export const DEFAULT_SETTINGS: Settings = {
  athlete: "",
  goals: DEFAULT_GOALS,
  template: DEFAULT_TEMPLATE,
};
