"use client";
import { useEffect, useRef } from "react";

const COLORS = ["#fcd34d", "#fda4af", "#bae6fd", "#ffffff", "#99f6e4", "#ddd6fe", "#fde68a", "#fecdd3"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Confetti that drifts down over its parent, each piece on its own: where it starts, its size and
 * shape, how fast it falls, how it sways and spins. Drawn once with the Web Animations API (styles
 * set from script, which the content security policy allows); nothing at all for reduced motion.
 */
export function Confetti({ count = 70 }: { count?: number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      const size = rand(5, 11);
      const shape = Math.random();
      p.style.position = "absolute";
      p.style.left = "0";
      p.style.top = "0";
      p.style.width = `${shape < 0.3 ? size * 0.7 : size}px`;
      p.style.height = `${shape < 0.3 ? size * 0.7 : shape < 0.7 ? size * 0.45 : size}px`;
      p.style.borderRadius = shape < 0.3 ? "9999px" : "2px";
      p.style.background = COLORS[i % COLORS.length]!;
      p.style.opacity = "0";
      el.appendChild(p);
      pieces.push(p);
      // A fall with a sway: a few points side to side while it turns over.
      const x = rand(-0.05, 1.05) * w;
      const sway = rand(12, 40) * (Math.random() < 0.5 ? -1 : 1);
      const drift = rand(-30, 30);
      const spin = rand(240, 900) * (Math.random() < 0.5 ? -1 : 1);
      const flip = rand(0.2, 1);
      const steps = 5;
      const frames: Keyframe[] = Array.from({ length: steps + 1 }, (_, k) => {
        const t = k / steps;
        const dx = x + drift * t + (k % 2 ? sway : -sway) * (k === 0 || k === steps ? 0.4 : 1);
        return {
          transform: `translate(${dx}px, ${-20 + (h + 40) * t}px) rotate(${spin * t}deg) rotateX(${180 * flip * k}deg)`,
          opacity: k === 0 ? 0 : k === steps ? 0 : 1,
          offset: t,
        };
      });
      const a = p.animate(frames, { duration: rand(2600, 5200), delay: rand(0, 2200) + (i < count / 3 ? 0 : rand(600, 1800)), easing: "linear", fill: "both" });
      a.onfinish = () => p.remove();
    }
    return () => pieces.forEach((p) => p.remove());
  }, [count]);
  return <div ref={box} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden [perspective:600px]" />;
}
