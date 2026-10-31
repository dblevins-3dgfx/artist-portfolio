/*
 * /work. The list is grouped by subject in Gallery, which is a Client
 * Component because the search box and the filter buttons need browser state.
 * This file stays on the server and only hands the catalog down as props.
 */
import type { Metadata } from "next";
import { Gallery } from "@/components/gallery";
import { toCatalogWork } from "@/lib/catalog";
import { getWorks } from "@/lib/works";

export const metadata: Metadata = {
  title: "Work",
  description: "A catalog of original paintings.",
};

export default function WorkPage() {
  const works = getWorks().map(toCatalogWork);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Catalog</p>
      <h1 className="mt-3 font-heading text-5xl italic">The work</h1>
      {works.length === 0 ? (
        <p className="mt-12 max-w-md text-lg">
          No paintings have been published yet. They appear after the studio processes
          photographs into previews.
        </p>
      ) : (
        <div className="mt-10">
          <Gallery works={works} />
        </div>
      )}
    </div>
  );
}
