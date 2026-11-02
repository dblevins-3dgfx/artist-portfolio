/*
 * /curate/venues, the galleries and shops that have paintings on display
 * (#104). Same gate and settings as the other desk pages. This static
 * segment wins over /curate/[slug], which is why work-form.ts refuses
 * "venues" as a web name. A save redirects back here with ?saved=1.
 */
import type { Metadata } from "next";
import { CurateLogin } from "@/components/curate-login";
import { DeskLoadError, DeskSwitchedOff } from "@/components/desk-messages";
import { VenuesEditor } from "@/components/venues-editor";
import { loadCatalog, loadVenues, publishingMode } from "@/lib/catalog-store";
import type { Venue } from "@/lib/venues";
import { isSignedIn, studioPassword } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Venues",
  robots: { index: false, follow: false },
};

export default async function CurateVenuesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  if (!studioPassword()) return <DeskSwitchedOff />;

  if (!(await isSignedIn())) {
    return <CurateLogin />;
  }

  let venues: Venue[] | null = null;
  // How many paintings each venue has, original or prints, so removing one
  // in use is not a surprise.
  const shownCounts: Record<string, number> = {};
  let loadError = "";
  try {
    const [list, catalog] = await Promise.all([loadVenues(), loadCatalog()]);
    venues = list;
    for (const work of catalog.works) {
      for (const id of new Set([work.originalShownAt, ...work.printsShownAt].filter(Boolean))) {
        shownCounts[id] = (shownCounts[id] ?? 0) + 1;
      }
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The venue list could not be read.";
  }
  if (!venues) return <DeskLoadError message={loadError} />;

  const { saved } = await searchParams;
  return <VenuesEditor venues={venues} shownCounts={shownCounts} publishing={publishingMode()} saved={saved === "1"} />;
}
