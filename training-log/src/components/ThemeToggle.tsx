"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./ui";

const KEY = "cadence-theme";
type Theme = "light" | "dark";

/**
 * The theme lives outside React — in localStorage, in the OS setting, and on
 * the <html> element (set before first paint by a script in the layout). So it's
 * read as an external store rather than mirrored into state.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  // Another tab may have changed the preference.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Private browsing: fall through to the OS preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Nothing to show server-side; the icon appears once the client knows the theme.
const getServerSnapshot = (): Theme | null => null;

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // The theme just won't stick between visits.
  }
  emit();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
    >
      {theme ? <Icon name={theme === "dark" ? "sun" : "moon"} /> : <span className="h-4 w-4" />}
    </button>
  );
}
