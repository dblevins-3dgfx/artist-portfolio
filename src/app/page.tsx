import Image from "next/image";
import Link from "next/link";
import { WorkCard } from "@/components/work-card";
import { buttonVariants } from "@/components/ui/button";
import { site, workAlt } from "@/lib/site";
import { getWorks } from "@/lib/works";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const works = getWorks();
  const featured = works.find((work) => work.featured) ?? works[0];
  const selected = works.filter((work) => work.slug !== featured?.slug).slice(0, 6);

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
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            {site.intro}
          </p>
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
        {featured ? (
          <Link href={`/work/${featured.slug}`} className="group block">
            <Image
              src={featured.image}
              alt={workAlt(featured)}
              width={featured.imageWidth}
              height={featured.imageHeight}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full border border-border bg-card"
            />
            <p className="mt-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-heading text-xl italic group-hover:underline">
                {featured.title}
              </span>
              <span className="text-muted-foreground">{featured.year}</span>
            </p>
          </Link>
        ) : (
          <div className="border border-border bg-card p-8">
            <h2 className="font-heading text-3xl italic">No pictures yet</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Photographs of the work are added from a private folder, then reduced and
              watermarked before they appear here.
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">At the easel</p>
          <h2 className="mt-3 font-heading text-3xl italic">A painting in progress</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Thomasene paints outdoors. This photograph shows one landscape while it was
            still on the easel. Stand-in pictures in the catalog are marked. The others
            are her paintings.
          </p>
          <Link href="/about" className="mt-6 inline-block text-sm underline-offset-4 hover:underline">
            About Thomasene
          </Link>
        </div>
        <figure>
          <Image
            src="/studio/plein-air.jpg"
            alt="A landscape painting in progress on an easel outdoors, with a palette of oil paint."
            width={1050}
            height={1400}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="h-auto w-full border border-border bg-card"
          />
        </figure>
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

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="border-t border-border pt-10 font-heading text-3xl italic">
          What is published
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          <li>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">01</p>
            <h3 className="mt-2 font-heading text-2xl italic">A catalog</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Each picture has a title, a year, and the medium. Open one for a closer look
              and a short note.
            </p>
          </li>
          <li>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">02</p>
            <h3 className="mt-2 font-heading text-2xl italic">A preview</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The image is reduced and watermarked, and the camera data is removed. The
              full photograph stays with the studio.
            </p>
          </li>
          <li>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">03</p>
            <h3 className="mt-2 font-heading text-2xl italic">A way to write</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The about page carries the studio’s line, and an email for a note.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
