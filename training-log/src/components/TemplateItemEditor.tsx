"use client";

import { useEffect, useRef, useState } from "react";
import { DAY_NAMES_LONG } from "@/lib/dates";
import { WORKOUT_TYPES, type TemplateItem } from "@/lib/types";
import { TYPE_META } from "@/lib/workoutMeta";
import { Button, Icon, Toggle, TypeChip } from "./ui";

/** Mounted only while an item is open; see the note on WorkoutEditor. */
export function TemplateItemEditor({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: TemplateItem;
  onClose: () => void;
  onSave: (item: TemplateItem) => void;
  onDelete: (item: TemplateItem) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<TemplateItem>(item);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const meta = TYPE_META[draft.type];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-hair bg-surface p-0 text-ink"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...draft, title: draft.title.trim() || meta.defaultTitle });
        }}
        className="flex flex-col gap-4 p-5"
      >
        <header className="flex items-start justify-between">
          <h2 className="text-base font-semibold">Template session</h2>
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
                selected={draft.type === type}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    type,
                    strides: TYPE_META[type].canCarryStrides ? prev.strides : false,
                  }))
                }
              />
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Day</span>
          <select
            value={draft.day}
            onChange={(event) => setDraft({ ...draft, day: Number(event.target.value) })}
          >
            {DAY_NAMES_LONG.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Name</span>
          <input
            type="text"
            value={draft.title}
            placeholder={meta.defaultTitle}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">
            The workout <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <textarea
            rows={2}
            value={draft.detail}
            onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
          />
        </label>

        {meta.canCarryStrides ? (
          <Toggle
            checked={draft.strides}
            onChange={(strides) => setDraft({ ...draft, strides })}
            label="Strides on this run"
          />
        ) : null}

        <footer className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item)}>
            <Icon name="trash" />
            Remove
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
