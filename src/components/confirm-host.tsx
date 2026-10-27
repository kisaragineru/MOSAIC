"use client";

import { useEffect, useRef, useState } from "react";
import { setConfirm } from "@/lib/confirm";

/** The app's "are you sure?" dialog, one for every page, its buttons in the reader's language. */
export function ConfirmHost({ ok, cancel }: { ok: string; cancel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const done = useRef<((v: boolean) => void) | null>(null);

  useEffect(() => {
    setConfirm(
      (msg) =>
        new Promise<boolean>((resolve) => {
          done.current?.(false);
          done.current = resolve;
          setMessage(msg);
          ref.current?.showModal();
        }),
    );
    return () => setConfirm(null);
  }, []);

  const finish = (v: boolean) => {
    const r = done.current;
    done.current = null;
    if (ref.current?.open) ref.current.close();
    r?.(v);
  };

  return (
    <dialog
      ref={ref}
      onClose={() => finish(false)}
      aria-label={message}
      data-testid="confirm"
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="space-y-5 p-5">
        <p className="whitespace-pre-line text-[15px] leading-7">{message}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => finish(false)} className="min-h-11 flex-1 rounded-full bg-white text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50" data-testid="confirm-cancel">
            {cancel}
          </button>
          <button type="button" autoFocus onClick={() => finish(true)} className="min-h-11 flex-1 rounded-full bg-rose-700 text-sm font-bold text-white hover:bg-rose-800" data-testid="confirm-ok">
            {ok}
          </button>
        </div>
      </div>
    </dialog>
  );
}
