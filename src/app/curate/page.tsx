/*
 * /curate, the private desk. force-dynamic means "do not cache this HTML":
 * the password check and the catalog must run per request. runtime nodejs
 * is required because saving uses sharp and the filesystem. maxDuration is
 * the serverless time limit, in seconds, for an upload.
 *
 * searchParams is a Promise here. The query string (?saved=1) is how a server
 * action tells this page that the last save finished. redirect() cannot
 * return a value to the form the way a C function returns a struct.
 */
import type { Metadata } from "next";
import { CurateDesk } from "@/components/curate-desk";
import { CurateLogin } from "@/components/curate-login";
import { loadCatalog, publishingMode, toDeskWorks } from "@/lib/catalog-store";
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
  searchParams: Promise<{ saved?: string; removed?: string }>;
}) {
  if (!studioPassword()) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
        <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed">
          The desk is not switched on yet. In the Vercel project, set a long{" "}
          <span className="font-medium">STUDIO_PASSWORD</span>, and set{" "}
          <span className="font-medium">STUDIO_GITHUB_TOKEN</span> to a token that can update this
          repository. Redeploy, then open this page again.
        </p>
      </div>
    );
  }

  if (!(await isSignedIn())) {
    return <CurateLogin />;
  }

  const query = await searchParams;
  const notice = query.saved === "1" ? "saved" : query.removed === "1" ? "removed" : null;
  let works: Awaited<ReturnType<typeof toDeskWorks>> = [];
  let loadError = "";
  try {
    works = toDeskWorks(await loadCatalog());
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The catalog could not be read.";
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-heading text-5xl italic">Studio desk</h1>
        <p role="alert" className="mt-6 max-w-prose text-sm leading-relaxed">
          {loadError}
        </p>
      </div>
    );
  }

  return <CurateDesk works={works} publishing={publishingMode()} notice={notice} />;
}
