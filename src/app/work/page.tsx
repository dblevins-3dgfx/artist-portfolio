import type { Metadata } from "next";
import { Gallery } from "@/components/gallery";
import type { CatalogWork } from "@/lib/types";
import { getWorks } from "@/lib/works";

function catalogWorks(): CatalogWork[] {
  return getWorks().map((work) => ({
    slug: work.slug,
    title: work.title,
    year: work.year,
    medium: work.medium,
    surface: work.surface,
    statement: work.statement,
    image: work.image,
    imageWidth: work.imageWidth,
    imageHeight: work.imageHeight,
  }));
}

export const metadata: Metadata = {
  title: "Work",
  description: "A catalog of original pictures.",
};

export default function WorkPage() {
  const works = catalogWorks();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Catalog</p>
      <h1 className="mt-3 font-heading text-5xl italic">The work</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Every picture here is a reduced, watermarked preview. Open one to read the title,
        the year, and a short note.
      </p>
      {works.length === 0 ? (
        <p className="mt-12 max-w-md text-lg">
          No pictures have been published yet. They appear after the studio processes
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
