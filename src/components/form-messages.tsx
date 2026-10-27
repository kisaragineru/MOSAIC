"use client";

import { useEffect } from "react";

export interface FormMessageText {
  required: string;
  email: string;
  url: string;
  tooShort: string;
  tooLong: string;
  pattern: string;
  range: string;
  bad: string;
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * The browser's own "please fill in this field" bubbles come in the device's language. This
 * swaps them for the app's: when a field is found invalid, its message is set in the reader's
 * language, and cleared again as soon as it changes. Messages set on purpose elsewhere are kept.
 */
export function FormMessages({ text }: { text: FormMessageText }) {
  useEffect(() => {
    const ours = new WeakSet<Field>();
    const onInvalid = (e: Event) => {
      const el = e.target as Field;
      if (!("validity" in el)) return;
      const v = el.validity;
      if (v.customError && !ours.has(el)) return;
      const msg = v.valueMissing
        ? text.required
        : v.typeMismatch
          ? (el as HTMLInputElement).type === "email"
            ? text.email
            : text.url
          : v.tooShort
            ? text.tooShort
            : v.tooLong
              ? text.tooLong
              : v.patternMismatch
                ? text.pattern
                : v.rangeUnderflow || v.rangeOverflow || v.stepMismatch
                  ? text.range
                  : v.badInput
                    ? text.bad
                    : "";
      if (!msg) return;
      ours.add(el);
      el.setCustomValidity(msg);
    };
    const onChange = (e: Event) => {
      const el = e.target as Field;
      if (ours.has(el)) {
        el.setCustomValidity("");
        ours.delete(el);
      }
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onChange, true);
    document.addEventListener("change", onChange, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onChange, true);
      document.removeEventListener("change", onChange, true);
    };
  }, [text]);
  return null;
}
