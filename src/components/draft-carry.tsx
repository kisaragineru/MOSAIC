"use client";
import { useEffect } from "react";
import { takeDraft } from "@/lib/draft-carry";

/** On the full form: the text written in the quick composer, if it was just carried here (an empty box only). */
export function DraftCarry() {
  useEffect(() => {
    const body = takeDraft();
    const box = document.querySelector<HTMLTextAreaElement>("form.memory-form textarea[name=body]");
    if (body && box && !box.value.trim()) {
      box.value = body;
      box.focus();
      box.setSelectionRange(body.length, body.length);
    }
  }, []);
  return null;
}
