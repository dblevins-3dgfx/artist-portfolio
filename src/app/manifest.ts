/*
 * /manifest.webmanifest. Like robots.ts, the file name makes this module a
 * route: Next.js calls the function at build time, serves the object as JSON,
 * and adds <link rel="manifest"> to every page's <head>.
 *
 * A web app manifest is roughly a resource file for "the site as an app": the
 * name and icon a phone uses when someone adds the site to their home screen.
 * Android/Chrome read it. iPhones mostly ignore it and look for
 * <link rel="apple-touch-icon"> instead, which Next.js emits for
 * src/app/apple-icon.png (180×180, the size iOS wants). Without that link iOS
 * draws the first letter of the page title, which is the plain "T" you saw.
 *
 * The PNGs (apple-icon.png, public/icon-192.png, public/icon-512.png) are
 * rasterised copies of src/app/icon.svg, the browser-tab icon, with an opaque
 * background because iOS fills transparent pixels with black. If you change
 * icon.svg, re-render them with sharp (already a dependency), e.g.
 *   sharp("src/app/icon.svg", { density: 72 * 512 / 32 }).resize(512, 512).png()
 * Files in public/ are served as-is from the site root, so public/icon-192.png
 * is /icon-192.png.
 */
import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.artistName,
    short_name: site.artistName,
    description: site.tagline,
    start_url: "/",
    display: "browser",
    background_color: "#f3efe6",
    theme_color: "#f3efe6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
