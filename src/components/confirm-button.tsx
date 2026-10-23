"use client";
import type { ComponentProps } from "react";

/** Submit button that asks for confirmation before destructive actions. */
export function ConfirmButton({ message, className = "", ...props }: ComponentProps<"button"> & { message: string }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 ${className}`}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
