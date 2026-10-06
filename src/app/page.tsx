/*
 * Front page. Checked paintings stay up. Open spots are a daily pick from
 * front-page.ts. `connection()` tells Next not to freeze this page at build
 * time, so the date is read when someone asks for the page. The GitHub Pages
 * export has no request, so that build keeps whatever day it ran.
 */
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { WorkCard } from "@/components/work-card";
import { buttonVariants } from "@/components/ui/button";
import { frontPageDateKey, selectFrontPage } from "@/lib/front-page";
import { site, workAlt } from "@/lib/site";
import { getWorks } from "@/lib/works";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  if (process.env.GITHUB_PAGES !== "1") {
    await connection();
  }
  const { lead, selected } = selectFrontPage(getWorks(), frontPageDateKey());

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Original work
          </p>
          <h1 className="mt-3 font-heading text-5xl italic leading-[1.05] sm:text-6xl">
            {site.artistName}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed">{site.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/work" className={cn(buttonVariants(), "inline-flex h-11 px-4")}>
              Browse the work
            </Link>
            <Link
              href="/about"
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex h-11 bg-card px-4")}
            >
              About the studio
            </Link>
          </div>
        </div>
        {lead ? (
          <Link href={`/work/${lead.slug}`} className="group block">
            <Image
              src={lead.image}
              alt={workAlt(lead)}
              width={lead.imageWidth}
              height={lead.imageHeight}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full border border-border bg-card"
            />
            <p className="mt-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-heading text-xl italic group-hover:underline">
                {lead.title}
              </span>
              <span className="text-muted-foreground">{lead.year}</span>
            </p>
          </Link>
        ) : (
          <div className="border border-border bg-card p-8">
            <h2 className="font-heading text-3xl italic">No pictures yet</h2>
          </div>
        )}
      </section>

      {selected.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pb-4">
          <div className="flex items-end justify-between gap-4 border-t border-border pt-10">
            <h2 className="font-heading text-3xl italic">Selected pictures</h2>
            <Link href="/work" className="text-sm underline-offset-4 hover:underline">
              All work
            </Link>
          </div>
          <div className="mt-8 columns-1 gap-x-8 sm:columns-2 lg:columns-3">
            {selected.map((work) => (
              <WorkCard key={work.slug} work={work} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
