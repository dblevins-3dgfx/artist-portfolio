import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { workAlt } from "@/lib/site";
import type { CatalogWork } from "@/lib/types";

export function WorkCard({ work }: { work: CatalogWork }) {
  return (
    <Link href={`/work/${work.slug}`} className="group mb-10 block break-inside-avoid">
      <Image
        src={work.image}
        alt={workAlt(work)}
        width={work.imageWidth}
        height={work.imageHeight}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
        className="h-auto w-full border border-border bg-card"
      />
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl italic group-hover:underline">{work.title}</h2>
        <span className="shrink-0 text-xs tracking-wide text-muted-foreground">{work.year}</span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{work.medium}</span>
        {work.sample ? <Badge variant="outline">Sample</Badge> : null}
      </p>
    </Link>
  );
}
