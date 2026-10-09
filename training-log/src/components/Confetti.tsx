"use client";

import { useEffect, useRef } from "react";

/**
 * A slow fall of confetti for finishing a week — drifting down from above the
 * viewport rather than bursting, so it reads as a gentle shower you can watch
 * instead of a bang. Draws on a throwaway canvas and calls `onDone` so the caller
 * can unmount it; nothing is left running. Skipped entirely under
 * prefers-reduced-motion, where the toast still carries the news.
 */

const DURATION = 5200;
const FADE = 1100;
const COUNT = 110;
/** Frame deltas are normalised against 60fps so speed doesn't track refresh rate. */
const FRAME = 1000 / 60;

const SERIES = [
  "--type-long",
  "--type-threshold",
  "--type-easy",
  "--type-strength",
  "--type-strides",
  "--good",
];

type Flake = {
  x: number;
  y: number;
  fall: number;
  drift: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  color: string;
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

export function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canvas || !context || reduced) {
      const timer = window.setTimeout(onDone, 0);
      return () => window.clearTimeout(timer);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(ratio, ratio);

    // The confetti is the workout palette, so the shower still reads as this app.
    const styles = getComputedStyle(document.documentElement);
    const colors = SERIES.map((name) => styles.getPropertyValue(name).trim()).filter(Boolean);
    const palette = colors.length > 0 ? colors : ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

    // Start them stacked well above the fold so they arrive staggered rather than
    // as one sheet, and keep falling for most of the duration.
    const flakes: Flake[] = Array.from({ length: COUNT }, () => ({
      x: between(-20, width + 20),
      y: between(-height * 1.15, -20),
      fall: between(1.1, 2.4),
      drift: between(-0.3, 0.3),
      sway: between(0.5, 1.5),
      swaySpeed: between(0.0012, 0.0026),
      phase: between(0, Math.PI * 2),
      w: between(5, 9),
      h: between(8, 13),
      rot: between(0, Math.PI * 2),
      spin: between(-0.035, 0.035),
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    let frame = 0;
    const started = performance.now();
    let previous = started;

    const draw = (now: number) => {
      const elapsed = now - started;
      const delta = Math.min((now - previous) / FRAME, 3);
      previous = now;

      context.clearRect(0, 0, width, height);
      const alpha = elapsed > DURATION - FADE ? Math.max(0, (DURATION - elapsed) / FADE) : 1;

      for (const f of flakes) {
        f.y += f.fall * delta;
        // A little side-to-side so each piece flutters instead of dropping straight.
        f.x += (f.drift + Math.sin(elapsed * f.swaySpeed + f.phase) * f.sway * 0.4) * delta;
        f.rot += f.spin * delta;

        if (f.y > height + 20) continue;

        context.save();
        context.globalAlpha = alpha;
        context.translate(f.x, f.y);
        context.rotate(f.rot);
        context.fillStyle = f.color;
        context.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
        context.restore();
      }

      if (elapsed < DURATION) frame = requestAnimationFrame(draw);
      else onDone();
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
