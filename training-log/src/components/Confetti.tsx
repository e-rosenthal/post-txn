"use client";

import { useEffect, useRef } from "react";

/**
 * A one-shot confetti burst for finishing a week. Draws on a throwaway canvas
 * above the page, then calls `onDone` so the caller can unmount it — there is no
 * idle loop left running. Honours prefers-reduced-motion by skipping the whole
 * thing; the toast beside it still carries the news.
 */

const DURATION = 2100;
const FADE = 650;
const GRAVITY = 0.34;
const DRAG = 0.992;
const COUNT = 90;

const SERIES = [
  "--type-long",
  "--type-threshold",
  "--type-easy",
  "--type-strength",
  "--type-strides",
  "--good",
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
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

    // The confetti is the workout palette, so the burst still reads as this app.
    const styles = getComputedStyle(document.documentElement);
    const colors = SERIES.map((name) => styles.getPropertyValue(name).trim()).filter(Boolean);
    const palette = colors.length > 0 ? colors : ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

    const originX = width / 2;
    const originY = height * 0.38;
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: originX + between(-40, 40),
      y: originY + between(-16, 16),
      vx: between(-6, 6),
      vy: between(-14, -5),
      w: between(5, 10),
      h: between(8, 15),
      rot: between(0, Math.PI * 2),
      vr: between(-0.26, 0.26),
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    let frame = 0;
    const started = performance.now();

    const draw = (now: number) => {
      const elapsed = now - started;
      context.clearRect(0, 0, width, height);
      const alpha = elapsed > DURATION - FADE ? Math.max(0, (DURATION - elapsed) / FADE) : 1;

      for (const p of particles) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        context.save();
        context.globalAlpha = alpha;
        context.translate(p.x, p.y);
        context.rotate(p.rot);
        context.fillStyle = p.color;
        context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
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
