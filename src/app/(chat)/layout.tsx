import { requireUser } from "@/server/auth/session";

/** Full-screen conversations: their own header and composer, no tab bar. */
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
