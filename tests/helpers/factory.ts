import { randomUUID } from "node:crypto";
import { register } from "@/server/services/account";

export async function makeUser(name = "Tester") {
  const email = `u-${randomUUID()}@example.test`;
  const password = "correct horse battery staple";
  const session = await register({ email, password, displayName: name, locale: "en" }, `ip-${randomUUID()}`);
  return { ...session, email, password };
}
