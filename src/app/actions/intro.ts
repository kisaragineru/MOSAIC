"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { saveIntro } from "@/server/services/intro";
import { attempt, str } from "./util";

export async function saveIntroAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("intro.save", () => saveIntro(uid, str(form, "intro")));
  redirect(r.ok ? "/me?ok=saved#intro" : `/me?e=${r.error}#intro`);
}
