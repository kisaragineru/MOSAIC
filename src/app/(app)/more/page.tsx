import { redirect } from "next/navigation";

// Everything that used to live under "More" is now a tab, a header button or on the profile page.
export default function MorePage() {
  redirect("/me");
}
