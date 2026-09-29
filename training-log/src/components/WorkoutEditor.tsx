"use client";

import { useEffect, useRef, useState } from "react";
import { WORKOUT_TYPES, type Workout, type WorkoutType } from "@/lib/types";
import { TYPE_META } from "@/lib/workoutMeta";
import { Button, Icon, Toggle, TypeChip } from "./ui";

export type EditorTarget = { mode: "create" } | { mode: "edit"; workout: Workout };

export type EditorValues = {
  type: WorkoutType;
  title: string;
  detail: string;
  strides: boolean;
  done: boolean;
};

function initialValues(target: EditorTarget): EditorValues {
  if (target.mode === "edit") {
    const { type, title, detail, strides, done } = target.workout;
    return { type, title, detail, strides, done };
  }
  return { type: "easy", title: "", detail: "", strides: false, done: false };
}

/**
 * Mounted only while something is being edited, and keyed on the target by the
 * caller — so the form state comes from the initial props and never has to be
 * re-synced from an effect. There is no day picker: sessions belong to a week.
 */
export function WorkoutEditor({
  target,
  weekLabel,
  onClose,
  onSave,
  onDelete,
}: {
  target: EditorTarget;
  weekLabel: string;
  onClose: () => void;
  onSave: (values: EditorValues) => void;
  onDelete?: (workout: Workout) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<EditorValues>(() => initialValues(target));

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const meta = TYPE_META[values.type];
  const set = <K extends keyof EditorValues>(key: K, value: EditorValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-hair bg-surface p-0 text-ink backdrop:backdrop-blur-[2px]"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...values, title: values.title.trim() || meta.defaultTitle });
        }}
        className="flex flex-col gap-4 p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {target.mode === "edit" ? "Edit session" : "Add a session"}
            </h2>
            <p className="text-xs text-ink-3">{weekLabel}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </Button>
        </header>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-2">Type</legend>
          <div className="flex flex-wrap gap-1.5">
            {WORKOUT_TYPES.map((type) => (
              <TypeChip
                key={type}
                type={type}
                selected={values.type === type}
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    type,
                    strides: TYPE_META[type].canCarryStrides ? prev.strides : false,
                    detail: prev.detail || TYPE_META[type].defaultDetail,
                  }))
                }
              />
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Name</span>
          <input
            type="text"
            value={values.title}
            placeholder={meta.defaultTitle}
            onChange={(event) => set("title", event.target.value)}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">
            The workout <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <textarea
            rows={2}
            value={values.detail}
            placeholder="e.g. 4 x 6 min @ threshold, 2 min float"
            onChange={(event) => set("detail", event.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2">
          {meta.canCarryStrides ? (
            <Toggle
              checked={values.strides}
              onChange={(v) => set("strides", v)}
              label="Strides on this run"
              hint="Counts toward your weekly strides goal too"
            />
          ) : null}
          <Toggle
            checked={values.done}
            onChange={(v) => set("done", v)}
            label="Already done"
            hint="Log something you've finished"
          />
        </div>

        <footer className="flex items-center justify-between gap-2 pt-1">
          {target.mode === "edit" && onDelete ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(target.workout)}>
              <Icon name="trash" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {target.mode === "edit" ? "Save" : "Add"}
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
