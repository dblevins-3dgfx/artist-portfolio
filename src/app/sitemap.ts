/*
 * /sitemap.xml, built from the same catalog reader as the pages.
 * Empty until content/studio.json has a siteUrl. lastModified is the build
 * time, because the catalog file has no per-painting timestamp.
 */
import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getWorks } from "@/lib/works";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.siteUrl) return [];
  const base = site.siteUrl.replace(/\/$/, "");
  const paths = ["", "/work", "/about", ...getWorks().map((work) => `/work/${work.slug}`)];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
