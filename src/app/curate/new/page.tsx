/*
 * /curate/new, the form for adding a painting. Same gate and settings as
 * the list at /curate. This static segment wins over /curate/[slug], which
 * is why work-form.ts refuses "new" as a web name. A save redirects to the
 * list at the new painting (see curate/actions.ts), so this page only ever
 * shows a form error.
 */
import type { Metadata } from "next";
import { CurateAdd } from "@/components/curate-desk";
import { CurateLogin } from "@/components/curate-login";
import { DeskSwitchedOff } from "@/components/desk-messages";
import { publishingMode } from "@/lib/catalog-store";
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

  return <CurateAdd publishing={publishingMode()} />;
}
