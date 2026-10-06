/*
 * /robots.txt. Special file name: this module is the route, not a page.
 * force-static so the export can emit the file. /curate is disallowed.
 */
import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/curate", "/curate/"],
    },
    ...(site.siteUrl ? { sitemap: `${site.siteUrl.replace(/\/$/, "")}/sitemap.xml` } : {}),
  };
}
