import { getT } from "@/lib/i18n/server";
import { currentUserId } from "@/server/auth/session";
import { Landing } from "./landing";

// The card a QR / link invitation shows when it's sent in a chat app (no names: the link itself is private).
export const metadata = {
  title: "MOSAICでつながりましょう",
  description: "招待リンクです。開くと、MOSAICで相手とつながれます。つながっただけでは何も共有されません。",
  // A page's own openGraph/twitter replace the site's, so the site card image is named again here.
  openGraph: { type: "website", siteName: "MOSAIC", title: "MOSAICでつながりましょう", description: "招待リンクです。開くと、MOSAICで相手とつながれます。つながっただけでは何も共有されません。", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MOSAIC" }] },
  twitter: { card: "summary_large_image", title: "MOSAICでつながりましょう", description: "招待リンクです。開くと、MOSAICで相手とつながれます。", images: ["/opengraph-image"] },
};

export default async function ShareLandingPage() {
  const { t } = await getT();
  const signedIn = !!(await currentUserId());
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <div className="text-center">
        <div className="mosaic-mark mx-auto mb-2 h-10 w-10 rounded-xl" aria-hidden />
        <h1 className="text-xl font-semibold">{t.landing.title}</h1>
      </div>
      <Landing
        signedIn={signedIn}
        tx={{
          title: t.landing.title,
          loginFirst: t.landing.loginFirst,
          login: t.auth.submitLogin,
          register: t.auth.submitRegister,
          invitedBy: t.landing.invitedBy("{name}"),
          explain: t.landing.explain,
          start: t.landing.start,
          checking: t.landing.checking,
          own: t.landing.own,
          errors: t.errors,
        }}
      />
    </main>
  );
}
