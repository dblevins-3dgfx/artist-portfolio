import type { Metadata } from "next";
import { Gallery } from "@/components/gallery";
import { getWorks } from "@/lib/works";

export const metadata: Metadata = {
  title: "Work",
  description: "Browse original pictures and request a fine-art print.",
};

export default function WorkPage() {
  const works = getWorks();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Catalog</p>
      <h1 className="mt-3 font-heading text-5xl italic">The work</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Every picture here is a reduced, watermarked preview. Open one to see the print
        sizes. The painting, when it is still in the studio, is noted separately from the
        print.
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
