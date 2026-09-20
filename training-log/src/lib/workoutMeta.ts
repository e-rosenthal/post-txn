import type { WorkoutType } from "./types";

export type TypeMeta = {
  label: string;
  /** Legend / axis abbreviation. */
  short: string;
  /** CSS custom property holding this type's categorical slot colour. */
  color: string;
  defaultTitle: string;
  defaultDetail: string;
  /** Running sessions can carry strides; strength/cross can't. */
  canCarryStrides: boolean;
  blurb: string;
};

/**
 * Colour slots come from the validated categorical order (blue, orange, aqua,
 * yellow, magenta, green). The order below is also the stacking order in the
 * history chart, so adjacent pairs are the ones the palette was validated on.
 */
export const TYPE_META: Record<WorkoutType, TypeMeta> = {
  long: {
    label: "Long run",
    short: "Long",
    color: "var(--type-long)",
    defaultTitle: "Long run",
    defaultDetail: "",
    canCarryStrides: true,
    blurb: "The week's anchor",
  },
  threshold: {
    label: "Threshold",
    short: "Thresh",
    color: "var(--type-threshold)",
    defaultTitle: "Threshold",
    defaultDetail: "",
    canCarryStrides: true,
    blurb: "Hard but repeatable",
  },
  easy: {
    label: "Easy run",
    short: "Easy",
    color: "var(--type-easy)",
    defaultTitle: "Easy run",
    defaultDetail: "",
    canCarryStrides: true,
    blurb: "Conversational",
  },
  strength: {
    label: "Strength",
    short: "Strength",
    color: "var(--type-strength)",
    defaultTitle: "Strength",
    defaultDetail: "",
    canCarryStrides: false,
    blurb: "Lift, hinge, carry",
  },
  strides: {
    label: "Strides",
    short: "Strides",
    color: "var(--type-strides)",
    defaultTitle: "Strides",
    defaultDetail: "6 x 20s",
    canCarryStrides: false,
    blurb: "Standalone or tacked onto a run",
  },
  cross: {
    label: "Cross-train",
    short: "Cross",
    color: "var(--type-cross)",
    defaultTitle: "Cross-train",
    defaultDetail: "",
    canCarryStrides: false,
    blurb: "Bike, swim, walk, stroller laps",
  },
};

/** Stacking + legend order. Matches the validated adjacent-pair ordering. */
export const TYPE_ORDER: WorkoutType[] = [
  "long",
  "threshold",
  "easy",
  "strength",
  "strides",
  "cross",
];
