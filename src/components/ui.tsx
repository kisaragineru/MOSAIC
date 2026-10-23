import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Page({ title, children, back, actions }: { title: string; children: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <div className="mb-4 flex items-center gap-3">
        {back && (
          <Link href={back} className="rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label="Back">
            ←
          </Link>
        )}
        <h1 className="flex-1 text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </main>
  );
}

export function Card({ children, className = "", title }: { children: ReactNode; className?: string; title?: ReactNode }) {
  return (
    <section className={`rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_-14px_rgba(110,80,50,0.22)] backdrop-blur-sm ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold text-stone-800">{title}</h2>}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "border border-stone-200 bg-white/90 text-stone-800 hover:bg-stone-50",
    danger: "bg-rose-700 text-white hover:bg-rose-800",
    ghost: "text-stone-600 hover:bg-stone-100",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function LinkButton({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const styles = variant === "primary" ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-stone-200 bg-white/90 text-stone-800 hover:bg-stone-50";
  return (
    <Link href={href} className={`inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition active:scale-[0.98] ${styles}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-stone-200 bg-white/90 px-3.5 py-2 text-base text-stone-900 placeholder:text-stone-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={4} {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm text-stone-700">
      <input type="checkbox" {...props} className="mt-1 h-4 w-4 accent-teal-700" />
      <span>{label}</span>
    </label>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "teal" | "amber" | "rose" | "violet" }) {
  const styles = {
    stone: "bg-stone-100 text-stone-700",
    teal: "bg-teal-50 text-teal-800",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-800",
    violet: "bg-violet-50 text-violet-800",
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{children}</p>;
}

/** Two or more sibling views shown as one switch, e.g. "Today | History". Plain links, so it works without JS. */
export function SegmentedTabs({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav className="flex rounded-full bg-stone-200/70 p-1 text-sm">
      {items.map((it) => {
        const active = it.href === current;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center transition-all ${active ? "bg-white font-semibold text-teal-800 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
