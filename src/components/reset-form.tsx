"use client";
import { useActionState, useSyncExternalStore } from "react";
import { resetAction } from "@/app/actions/password";
import { Button, Field, Input, Notice } from "./ui";

const onHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
/** The link's token, after "#t=" (never sent to the server's logs; the form carries it). */
const fromHash = () => /(?:^|[#&])t=([A-Za-z0-9_-]{20,100})/.exec(window.location.hash)?.[1] ?? "";

export function ResetForm({ text }: { text: { password: string; hint: string; submit: string; noLink: string; errors: Record<string, string> } }) {
  const token = useSyncExternalStore(onHash, fromHash, () => "");
  const [state, action, pending] = useActionState(resetAction, { error: null });
  if (!token) return <Notice kind="error">{text.noLink}</Notice>;
  return (
    <form action={action} className="space-y-3">
      {state.error && <Notice kind="error">{text.errors[state.error] ?? text.errors.generic}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label={text.password} hint={text.hint}>
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>{text.submit}</Button>
    </form>
  );
}
