"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { lookupShareAction, openComparisonAction } from "@/app/actions/sharing";

const KEY = "mosaic_share_token";

export interface LandingText {
  title: string;
  loginFirst: string;
  login: string;
  register: string;
  invitedBy: string; // contains {name}
  explain: string;
  start: string;
  checking: string;
  own: string;
  errors: Record<string, string>;
}

/**
 * The share token lives in the URL fragment (#...), which browsers never send to the server
 * or leak via Referer. It is moved to sessionStorage (so it survives sign-in) and removed
 * from the address bar immediately.
 */
export function Landing({ tx, signedIn }: { tx: LandingText; signedIn: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<{ owner?: string; own?: boolean; error?: string; busy?: boolean }>({});

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (fromHash) {
      sessionStorage.setItem(KEY, fromHash);
      history.replaceState(null, "", window.location.pathname);
    }
    setToken(sessionStorage.getItem(KEY));
  }, []);

  useEffect(() => {
    if (!signedIn || !token) return;
    lookupShareAction(token).then((r) => {
      if ("error" in r) {
        setState({ error: r.error });
        sessionStorage.removeItem(KEY);
      } else setState({ owner: r.ownerDisplayName, own: r.isOwn });
    });
  }, [signedIn, token]);

  const box = "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3";
  if (!token) return <div className={box}><p role="alert">{tx.errors.share_unavailable}</p></div>;
  if (!signedIn) {
    return (
      <div className={box}>
        <p>{tx.loginFirst}</p>
        <div className="flex gap-2">
          <a className="rounded-xl bg-teal-700 px-4 py-2 text-sm text-white" href="/login?next=/s">{tx.login}</a>
          <a className="rounded-xl border border-stone-300 px-4 py-2 text-sm" href="/register?next=/s">{tx.register}</a>
        </div>
      </div>
    );
  }
  if (state.error) return <div className={box}><p role="alert">{tx.errors[state.error] ?? tx.errors.generic}</p></div>;
  if (!state.owner) return <div className={box}><p>{tx.checking}</p></div>;
  if (state.own) return <div className={box}><p>{tx.own}</p></div>;
  return (
    <div className={box}>
      <p className="text-lg font-medium">{tx.invitedBy.replace("{name}", state.owner)}</p>
      <p className="text-sm text-stone-600">{tx.explain}</p>
      <button
        disabled={state.busy}
        className="min-h-10 w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={async () => {
          setState((s) => ({ ...s, busy: true }));
          const r = await openComparisonAction(token);
          sessionStorage.removeItem(KEY);
          if ("error" in r) setState({ error: r.error });
          else router.push(`/compare/${r.id}`);
        }}
      >
        {tx.start}
      </button>
    </div>
  );
}
