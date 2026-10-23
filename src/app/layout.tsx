import type { Metadata, Viewport } from "next";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOSAIC — A lifetime, piece by piece.",
  description: "A private, long-term personal database for your life and the people you care about.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
