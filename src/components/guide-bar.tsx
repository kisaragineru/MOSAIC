"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { finishOnboardingAction } from "@/app/actions/onboarding";
import { ConfirmButton } from "./confirm-button";

/**
 * While the welcome guide isn't finished: on every page (but the guide itself), a slim bar that
 * says so, with the way back to where it left off and a way to end it.
 */
export function GuideBar({ step, labels }: { step: number; labels: { bar: string; back: string; end: string; confirm: string } }) {
  const path = usePathname();
  if (path.startsWith("/welcome")) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-teal-50 px-4 py-2 text-xs text-teal-950 ring-1 ring-teal-100 print:hidden" data-testid="guide-bar">
      <span className="font-semibold">{labels.bar}</span>
      <Link href={`/welcome?step=${step}`} className="rounded-full bg-teal-700 px-3 py-1 font-semibold text-white hover:bg-teal-800">{labels.back} →</Link>
      <form action={finishOnboardingAction}>
        <input type="hidden" name="next" value={path} />
        <ConfirmButton bare message={labels.confirm} className="text-teal-800 underline underline-offset-2">{labels.end}</ConfirmButton>
      </form>
    </div>
  );
}
