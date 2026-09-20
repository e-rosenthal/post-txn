"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TYPE_META } from "@/lib/workoutMeta";
import type { WorkoutType } from "@/lib/types";

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export type IconName = keyof typeof PATHS;

const PATHS = {
  check: <polyline points="20 6 9 17 4 12" />,
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  left: <polyline points="15 18 9 12 15 6" />,
  right: <polyline points="9 18 15 12 9 6" />,
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  spark: <path d="M12 3l2.1 5.4L19.5 10l-5.4 2.1L12 17.5l-2.1-5.4L4.5 10l5.4-1.6L12 3z" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </>
  ),
  chart: <path d="M4 19V5M4 19h16M8 19v-6M13 19V9M18 19v-3" />,
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";

export function Button({ variant = "outline", size = "md", className = "", ...props }: ButtonProps) {
  const sizing = size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm";
  const looks = {
    primary: "bg-ink text-plane hover:opacity-85",
    outline: "border border-hair-2 text-ink hover:bg-sunken",
    ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  }[variant];
  return <button className={`${BUTTON_BASE} ${sizing} ${looks} ${className}`} {...props} />;
}

export function TypeDot({ type, size = 8 }: { type: WorkoutType; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block flex-none rounded-full"
      style={{ width: size, height: size, background: TYPE_META[type].color }}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">{children}</h2>
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </div>
  );
}

/** Selected state uses a ring + tinted wash so the label never sits on a saturated fill. */
export function TypeChip({
  type,
  selected,
  onClick,
}: {
  type: WorkoutType;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = TYPE_META[type];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-colors"
      style={
        selected
          ? {
              border: `1.5px solid ${meta.color}`,
              background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
              color: "var(--ink)",
              fontWeight: 600,
            }
          : {
              border: "1px solid var(--hairline-strong)",
              color: "var(--ink-secondary)",
            }
      }
    >
      <TypeDot type={type} />
      {meta.label}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-hair px-3 py-2.5 text-left transition-colors hover:bg-sunken"
    >
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-3">{hint}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className="relative h-5 w-9 flex-none rounded-full transition-colors"
        style={{ background: checked ? "var(--good)" : "var(--axis)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
      style={{ border: "1px solid color-mix(in srgb, #d03b3b 40%, transparent)", color: "var(--ink)" }}
      role="status"
    >
      <span aria-hidden="true" style={{ color: "#d03b3b" }}>
        <Icon name="close" className="mt-0.5 h-4 w-4" />
      </span>
      <span>{children}</span>
    </div>
  );
}
