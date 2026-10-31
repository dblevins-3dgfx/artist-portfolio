/*
 * /curate, the private desk: the list of paintings. Each one opens its own
 * edit page at /curate/<slug>. force-dynamic means "do not cache this HTML":
 * the password check and the catalog must run per request. runtime nodejs
 * is required because saving uses sharp and the filesystem. maxDuration is
 * the serverless time limit, in seconds, for an upload.
 *
 * searchParams is a Promise here. The query string (?saved=1) is how a server
 * action tells this page that the last save finished. redirect() cannot
 * return a value to the form the way a C function returns a struct.
 * Optional `at` is the painting slug to scroll back to after that reload.
 */
import type { Metadata } from "next";
import { CurateDesk } from "@/components/curate-desk";
import { CurateLogin } from "@/components/curate-login";
import { DeskLoadError, DeskSwitchedOff } from "@/components/desk-messages";
import { isCatalogSlug } from "@/lib/catalog";
import { loadCatalog, publishingMode, toDeskWorks } from "@/lib/catalog-store";
import { catalogLikeness, type LikenessMember } from "@/lib/duplicates";
import { isSignedIn, studioPassword } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default async function CuratePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; removed?: string; at?: string }>;
}) {
  if (!studioPassword()) return <DeskSwitchedOff />;

  if (!(await isSignedIn())) {
    return <CurateLogin />;
  }

  const query = await searchParams;
  const notice = query.saved === "1" ? "saved" : query.removed === "1" ? "removed" : null;
  const focusSlug = notice === "saved" && query.at && isCatalogSlug(query.at) ? query.at : null;
  let works: Awaited<ReturnType<typeof toDeskWorks>> = [];
  let duplicateGroups: LikenessMember[][] = [];
  let loadError = "";
  try {
    const catalog = await loadCatalog();
    works = toDeskWorks(catalog);
    duplicateGroups = catalogLikeness(catalog.works, catalog.manifest).groups;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The catalog could not be read.";
  }

  if (loadError) return <DeskLoadError message={loadError} />;

  return (
    <CurateDesk
      works={works}
      publishing={publishingMode()}
      notice={notice}
      focusSlug={focusSlug}
      duplicateGroups={duplicateGroups}
    />
  );
}
