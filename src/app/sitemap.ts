import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getWorks } from "@/lib/works";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.siteUrl) return [];
  const base = site.siteUrl.replace(/\/$/, "");
  const paths = ["", "/work", "/prints", "/about", "/request", ...getWorks().map((work) => `/work/${work.slug}`)];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
