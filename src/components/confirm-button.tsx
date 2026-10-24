"use client";
import type { ComponentProps } from "react";

/** Submit button that asks for confirmation before destructive actions. */
export function ConfirmButton({ message, className = "", quiet = false, bare = false, ...props }: ComponentProps<"button"> & { message: string; quiet?: boolean; bare?: boolean }) {
  // quiet: for a routine delete beside other actions (outlined, not a big red block).
  const look = quiet ? "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50" : "bg-rose-700 text-white hover:bg-rose-800";
  return (
    <button
      {...props}
      // bare: only the given classes (e.g. a small text link).
      className={bare ? className : `inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ${look} ${className}`}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
