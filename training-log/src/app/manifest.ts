import type { MetadataRoute } from "next";

/**
 * Lets the app be added to a phone's home screen and open without browser
 * chrome — which is how it actually gets used, one-handed, early.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cadence — training log",
    short_name: "Cadence",
    description: "Plan your running week, tick off what you actually did.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f9f7",
    theme_color: "#f9f9f7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Padded art, so a launcher can crop it to any shape without clipping.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
