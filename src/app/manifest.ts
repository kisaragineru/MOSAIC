import type { MetadataRoute } from "next";

/** Lets MOSAIC be added to the home screen (on iPhone, push notifications need that). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MOSAIC",
    short_name: "MOSAIC",
    // The brand line stays in English in every language.
    description: "A lifetime, piece by piece.",
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
