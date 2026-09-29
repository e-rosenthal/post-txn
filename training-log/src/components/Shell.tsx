"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

const TABS = [
  { href: "/", label: "This week" },
  { href: "/plan", label: "Plan" },
  { href: "/stats", label: "Stats" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-hair bg-plane/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 text-ink">
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">Cadence</span>
          </Link>

          <nav className="ml-auto flex items-center gap-0.5" aria-label="Sections">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                    active ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 pb-20">{children}</main>
    </div>
  );
}

/** Three ascending bars — the same shape the weekly chart draws. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="13" width="5" height="8" rx="2" fill="var(--type-long)" />
      <rect x="10" y="8" width="5" height="13" rx="2" fill="var(--type-threshold)" />
      <rect x="17" y="3" width="5" height="18" rx="2" fill="var(--type-easy)" />
    </svg>
  );
}
