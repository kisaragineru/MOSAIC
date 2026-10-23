import { redirect } from "next/navigation";
import { currentUserId } from "@/server/auth/session";

export default async function Root() {
  redirect((await currentUserId()) ? "/home" : "/login");
}
