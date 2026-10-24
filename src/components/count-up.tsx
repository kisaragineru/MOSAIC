"use client";
import { useLayoutEffect, useRef } from "react";

/**
 * A number that counts up to its value when it appears. The server renders the final value
 * (so it is right without script); the count only replays it, and not with reduced motion.
 */
export function CountUp({ value, ms = 700, className }: { value: number; ms?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      el.textContent = String(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <span ref={ref} className={className}>{value}</span>;
}
