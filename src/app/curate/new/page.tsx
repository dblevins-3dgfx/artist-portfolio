/*
 * /curate/new, the form for adding a painting. Same gate and settings as
 * the list at /curate. This static segment wins over /curate/[slug], which
 * is why work-form.ts refuses "new" as a web name. A save redirects to the
 * list at the new painting (see curate/actions.ts), so this page only ever
 * shows a form error.
 */
import type { Metadata } from "next";
import { CurateAdd } from "@/components/desk/editor";
import { CurateLogin } from "@/components/curate-login";
import { DeskLoadError, DeskSwitchedOff } from "@/components/desk-messages";
import { loadVenues, publishingMode } from "@/lib/catalog-store";
import type { Venue } from "@/lib/venues";
import { isSignedIn, studioPassword } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default async function CurateAddPage() {
  if (!studioPassword()) return <DeskSwitchedOff />;

  if (!(await isSignedIn())) {
    return <CurateLogin />;
  }

  let venues: Venue[];
  try {
    venues = await loadVenues();
  } catch (error) {
    return <DeskLoadError message={error instanceof Error ? error.message : "The venue list could not be read."} />;
  }
  return <CurateAdd publishing={publishingMode()} venues={venues} />;
}
