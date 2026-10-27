import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c, Noto_Emoji } from "next/font/google";
import { Suspense } from "react";
import { FormMessages } from "@/components/form-messages";
import { NavProgress } from "@/components/nav-progress";
import { getLocale, dictFor } from "@/lib/i18n/server";
import "./globals.css";

// A rounded face for a softer feel; covers Japanese, Vietnamese diacritics and Latin. Self-hosted by next/font.
const rounded = M_PLUS_Rounded_1c({ weight: ["400", "500", "700"], subsets: ["latin", "vietnamese"], display: "swap", preload: false, variable: "--font-rounded" });
// Every emoji the app itself uses as an icon, drawn as one flat colour (the text's own). What
// people write keeps their colour emoji: see .emoji-color in globals.css.
const emoji = Noto_Emoji({ weight: "variable", subsets: ["emoji"], display: "swap", preload: false, variable: "--font-emoji" });

const SITE = "MOSAIC";
const TITLE = "MOSAIC — A lifetime, piece by piece.";
const DESCRIPTION = "あなたの記録と、大切な人のことを、一生ぶん少しずつ。 A private, long-term personal database for your life and the people you care about.";

export const metadata: Metadata = {
  // Absolute links in the share card (og:image etc.) need the site's origin.
  metadataBase: new URL(process.env.APP_ORIGIN ?? "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: SITE,
  robots: { index: false, follow: false },
  // What LINE, X, Facebook, Slack… show when a MOSAIC link is shared. The image is opengraph-image.tsx.
  openGraph: { type: "website", siteName: SITE, title: TITLE, description: DESCRIPTION, locale: "ja_JP", alternateLocale: ["en_US", "vi_VN"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// "resizes-content": when the on-screen keyboard opens, the page itself gets shorter (Android
// Chrome), so sheets and the chat box sit above the keyboard instead of behind it.
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf8f5", interactiveWidget: "resizes-content" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${rounded.variable} ${emoji.variable} font-app min-h-dvh`}>
        <Suspense fallback={null}>
          <NavProgress label={dictFor(locale).common.loading} />
        </Suspense>
        {/* The browser's form bubbles in the app's language, not the device's. */}
        <FormMessages text={dictFor(locale).form} />
        {children}
      </body>
    </html>
  );
}
