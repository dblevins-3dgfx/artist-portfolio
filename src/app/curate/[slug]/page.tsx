/*
 * /curate/<slug>, one painting's edit form. Same gate and settings as the
 * list at /curate: sign-in check, no caching, Node runtime for sharp, and
 * the upload time limit. A save comes back here with ?saved=1; a remove
 * redirects to the list (see curate/actions.ts). The whole catalog is
 * passed down so Previous/Next can follow the list's filter.
 *
 * An unknown slug, such as a painting removed in another tab, gets a
 * message and a link back rather than the public 404 page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CurateEditor } from "@/components/curate-desk";
import { CurateLogin } from "@/components/curate-login";
import { DeskLoadError, DeskSwitchedOff } from "@/components/desk-messages";
import { isCatalogSlug } from "@/lib/catalog";
import { loadCatalog, publishingMode, toDeskWorks } from "@/lib/catalog-store";
import { isSignedIn, studioPassword } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default async function CuratePaintingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!studioPassword()) return <DeskSwitchedOff />;

  if (!(await isSignedIn())) {
    return <CurateLogin />;
  }

  const { slug } = await params;
  let works: Awaited<ReturnType<typeof toDeskWorks>> = [];
  let loadError = "";
  try {
    works = toDeskWorks(await loadCatalog());
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The catalog could not be read.";
  }

  if (loadError) return <DeskLoadError message={loadError} />;

  const work = isCatalogSlug(slug) ? works.find((entry) => entry.slug === slug) : undefined;
  if (!work) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-heading text-5xl italic">Studio desk</h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed">
          That painting is not in the catalog. It may have been removed or given a new web name.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/curate" className="underline underline-offset-4">
            Back to all paintings
          </Link>
        </p>
      </div>
    );
  }

  const { saved } = await searchParams;
  // The key remounts the editor whenever the saved painting changes, so
  // after a save the form, its unsaved-changes snapshot, and the leave
  // check all start again from what was just saved.
  return (
    <CurateEditor
      key={JSON.stringify(work)}
      work={work}
      works={works}
      justSaved={saved === "1"}
      publishing={publishingMode()}
    />
  );
}
