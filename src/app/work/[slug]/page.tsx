import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintPicker } from "@/components/print-picker";
import { Badge } from "@/components/ui/badge";
import { formatInches, originalStatusLabel, site, workAlt } from "@/lib/site";
import { getWork, getWorks } from "@/lib/works";

export function generateStaticParams() {
  return getWorks().map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) return { title: "Picture" };
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

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();

  const inches = formatInches(work.widthIn, work.heightIn);
  const others = getWorks().filter((entry) => entry.slug !== work.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
      <p className="text-sm text-muted-foreground">
        <Link href="/work" className="underline-offset-4 hover:underline">
          The work
        </Link>
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:items-start">
        <figure>
          <Image
            src={work.image}
            alt={workAlt(work)}
            width={work.imageWidth}
            height={work.imageHeight}
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="h-auto w-full border border-border bg-card"
          />
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Reduced preview, watermarked. This is not the file a print is made from.
          </figcaption>
        </figure>
        <div className="lg:sticky lg:top-24">
          <div className="flex flex-wrap gap-2">
            {work.sample ? <Badge variant="outline">Sample</Badge> : null}
            <Badge variant="secondary">{work.medium}</Badge>
          </div>
          <h1 className="mt-4 font-heading text-5xl italic leading-tight">{work.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {work.year}
            {work.surface ? ` · ${work.medium} on ${work.surface}` : ` · ${work.medium}`}
            {inches ? ` · ${inches}` : ""}
          </p>
          {work.statement ? (
            <p className="mt-6 max-w-prose leading-relaxed">{work.statement}</p>
          ) : null}
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {originalStatusLabel(work.originalStatus)}. A print is a separate object, made
            after you request it.
            {work.originalStatus === "in-studio"
              ? " If you want to ask about the painting itself, say so in the note."
              : ""}
          </p>
          {work.printsAvailable ? (
            <PrintPicker slug={work.slug} title={work.title} sizes={site.prints} />
          ) : (
            <p className="mt-8 border border-border bg-card p-5 text-sm leading-relaxed">
              Prints of this picture are not being made right now.
            </p>
          )}
        </div>
      </div>
      {others.length > 0 ? (
        <div className="mt-16 border-t border-border pt-8">
          <h2 className="font-heading text-2xl italic">More pictures</h2>
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
