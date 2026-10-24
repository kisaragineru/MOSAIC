import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { Suspense } from "react";
import { NavProgress } from "@/components/nav-progress";
import { getLocale, dictFor } from "@/lib/i18n/server";
import "./globals.css";

// A rounded face for a softer feel; covers Japanese, Vietnamese diacritics and Latin. Self-hosted by next/font.
const rounded = M_PLUS_Rounded_1c({ weight: ["400", "500", "700"], subsets: ["latin", "vietnamese"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "MOSAIC — A lifetime, piece by piece.",
  description: "A private, long-term personal database for your life and the people you care about.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf8f5" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${rounded.className} min-h-dvh`}>
        <Suspense fallback={null}>
          <NavProgress label={dictFor(locale).common.loading} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
