/*
 * /curate/manifest.webmanifest, the desk's own web app manifest (#131).
 * The site-wide one (app/manifest.ts) starts at "/", and recent iPhones open
 * a Home Screen icon at the manifest's start_url rather than the page it was
 * added from, so a desk icon opened the front page. This copy starts at the
 * desk and is named for it. curate/layout.tsx points the desk pages here.
 *
 * Only app/manifest.ts is a metadata file convention, so this one is an
 * ordinary route handler that returns the same object with a few changes.
 */
import siteManifest from "@/app/manifest";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      ...siteManifest(),
      name: "Studio desk",
      short_name: "Studio desk",
      start_url: "/curate/",
      scope: "/curate/",
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
