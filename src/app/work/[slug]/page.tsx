/*
 * One painting, at /work/<slug>. The [slug] folder is a path parameter, like
 * a route argument. generateStaticParams lists every slug to prebuild.
 * dynamicParams = false makes any other slug a 404 instead of rendering on demand.
 *
 * `params` is a Promise in this version of Next. Await it before reading slug.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaintingViewer } from "@/components/painting-viewer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { neighbours } from "@/lib/neighbours";
import { emailIsPublic, formatInches, formatMaterials, site, workAlt } from "@/lib/site";
import { subjectLabel } from "@/lib/subjects";
import { getWork, getWorks } from "@/lib/works";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return getWorks().map((work) => ({ slug: work.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) return { title: "Painting" };
  return {
    title: work.title,
    description: work.statement || `${work.title}, ${work.year}.`,
    openGraph: {
      images: [
        {
          url: work.image,
          width: work.imageWidth,
          height: work.imageHeight,
          alt: workAlt(work),
        },
      ],
    },
  };
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();

  const inches = formatInches(work.widthIn, work.heightIn);
  const materials = formatMaterials(work);
  const subjects = work.subjects.map(subjectLabel);
  // "More like this": paintings that share any subject come first.
  const rest = getWorks().filter((entry) => entry.slug !== work.slug);
  const sharesSubject = (entry: (typeof rest)[number]) => entry.subjects.some((id) => work.subjects.includes(id));
  const others = [...rest.filter(sharesSubject), ...rest.filter((entry) => !sharesSubject(entry))].slice(0, 3);
  const { previous, next, subject } = neighbours(getWorks(), work.slug);
  const previousHref = previous ? `/work/${previous.slug}` : undefined;
  const nextHref = next ? `/work/${next.slug}` : undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <Link href="/work" className="underline-offset-4 hover:underline">
          The work
        </Link>
        {previous && next ? (
          // rel="prev"/"next" tells browsers and search engines these pages
          // form a sequence. The arrow keys do the same as these two links.
          <nav aria-label={subject ? `${subjectLabel(subject)} paintings` : "Paintings"} className="flex gap-5">
            <Link href={`/work/${previous.slug}`} rel="prev" className="underline-offset-4 hover:underline">
              <span aria-hidden="true">← </span>
              Previous<span className="sr-only">: {previous.title}</span>
            </Link>
            <Link href={`/work/${next.slug}`} rel="next" className="underline-offset-4 hover:underline">
              Next<span className="sr-only">: {next.title}</span>
              <span aria-hidden="true"> →</span>
            </Link>
          </nav>
        ) : null}
      </div>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:items-start">
        <PaintingViewer
          title={work.title}
          image={work.image}
          alt={workAlt(work)}
          width={work.imageWidth}
          height={work.imageHeight}
          previousHref={previousHref}
          nextHref={nextHref}
        />
        <div className="lg:sticky lg:top-24">
          <div className="flex flex-wrap gap-2">
            {subjects.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
            {work.medium.trim() ? <Badge variant="secondary">{work.medium.trim()}</Badge> : null}
          </div>
          <h1 className="mt-4 font-heading text-5xl italic leading-tight">{work.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {work.year}
            {materials ? ` · ${materials}` : ""}
            {inches ? ` · ${inches}` : ""}
          </p>
          {work.statement ? <p className="mt-6 max-w-prose leading-relaxed">{work.statement}</p> : null}
          {emailIsPublic() ? (
            <a
              className={cn(buttonVariants({ variant: "outline" }), "mt-8 inline-flex h-11 bg-card px-4")}
              href={`mailto:${site.email}?subject=${encodeURIComponent(`About ${work.title}`)}`}
            >
              Write about this painting
            </a>
          ) : null}
        </div>
      </div>
      {others.length > 0 ? (
        <div className="mt-16 border-t border-border pt-8">
          <h2 className="font-heading text-2xl italic">More paintings</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/work/${entry.slug}`} className="underline-offset-4 hover:underline">
                  {entry.title}
                </Link>
                <span className="text-muted-foreground"> · {entry.year}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
