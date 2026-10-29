import type { MetadataRoute } from "next";
import { getT } from "@/lib/i18n/server";

/**
 * Lets MOSAIC be added to the home screen (on iPhone, push notifications need that). The browser
 * fetches this without cookies, so the description follows its Accept-Language.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t, locale } = await getT();
  return {
    name: "MOSAIC",
    short_name: "MOSAIC",
    // The opening film's line is the translated one (empty in English, where the brand line is used).
    description: t.film.tagline || t.common.tagline,
    lang: locale,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#faf8f5",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      // Android crops this one to its own shape (circle, squircle…); the artwork sits in the safe zone.
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
