"use client";

/*
 * The desk list at /curate: one compact row per painting, the badges, and
 * the filter buttons. PublishingNote and PaintingBadges are also used on
 * the edit page and the print price page.
 *
 * next/image normally runs pictures through the image optimizer. Desk
 * previews pass unoptimized because our custom loader ignores width, and
 * these URLs are either local files or raw GitHub bytes.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { logout } from "@/app/curate/actions";
import { chooseFilter, useDeskFilter, useHydrated } from "@/components/desk/filter-store";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DESK_FILTERS, missingDetails, type DeskWork, type Publishing } from "@/lib/desk";
import { cn } from "@/lib/utils";

export function PublishingNote({ publishing }: { publishing: Publishing }) {
  if (publishing === "github") {
    return (
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Saving publishes the change. The public catalog updates when the next build finishes. Adding a large batch is still faster by running the photograph folder on a computer.
      </p>
    );
  }
  if (publishing === "local") {
    return (
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
        This copy saves into the project on this computer. Nothing is published until those files are committed.
      </p>
    );
  }
  return (
    <p role="status" className="mt-4 max-w-prose text-sm leading-relaxed">
      The desk can open, but it cannot save yet. Add <span className="font-medium">STUDIO_GITHUB_TOKEN</span> in the Vercel project, then redeploy.
    </p>
  );
}

// The same badges on a list row and on the painting's edit page. Saved is
// only ever true on the list, right after the redirect from a save.
export function PaintingBadges({ work, justSaved = false, className }: { work: DeskWork; justSaved?: boolean; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1.5 empty:hidden", className)}>
      {justSaved ? <Badge>Saved</Badge> : null}
      {work.featured ? <Badge variant="secondary">Front page</Badge> : null}
      {work.lookalikes.length > 0 ? <Badge variant="outline">Possible duplicate</Badge> : null}
      {missingDetails(work).map((detail) => (
        <Badge key={detail} variant="outline">
          {detail}
        </Badge>
      ))}
    </span>
  );
}

// One line of the list. The id is what ?at=<slug> scrolls to after a save.
// next/image loads lazily unless told otherwise, so only rows near the
// screen fetch their thumbnails.
function PaintingRow({ work, justSaved }: { work: DeskWork; justSaved: boolean }) {
  return (
    <li id={work.slug} className="scroll-mt-24">
      <Link
        href={`/curate/${work.slug}`}
        className="flex items-center gap-4 border border-border bg-card p-2 pr-4 hover:bg-muted"
      >
        <Image
          src={work.previewUrl}
          alt=""
          width={work.imageWidth || 160}
          height={work.imageHeight || 160}
          unoptimized
          className="size-14 shrink-0 border border-border object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{work.title}</span>
          <span className="block text-sm text-muted-foreground">{work.year}</span>
          {/* Under the title, so a row with several badges wraps them
              instead of squeezing the title on a narrow screen. */}
          <PaintingBadges work={work} justSaved={justSaved} className="mt-1.5" />
        </span>
      </Link>
    </li>
  );
}

export function CurateDesk({
  works,
  publishing,
  notice,
  focusSlug,
}: {
  works: DeskWork[];
  publishing: Publishing;
  notice: "saved" | "removed" | null;
  focusSlug: string | null;
}) {
  const active = useDeskFilter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!focusSlug || !hydrated) return;
    const painting = document.getElementById(focusSlug);
    if (!painting) return;
    painting.scrollIntoView({ block: "start" });
  }, [focusSlug, hydrated]);

  const counts = new Map(DESK_FILTERS.map((filter) => [filter.id, works.filter(filter.matches).length]));
  const matching = counts.get(active.id) ?? 0;
  // A filter with nothing in it is hidden, unless it is the one in use: after
  // fixing the last painting in a queue, the button stays so the empty result
  // makes sense.
  const offered = DESK_FILTERS.filter(
    (filter) => filter.id === "all" || filter.id === "needs-work" || filter.id === active.id || (counts.get(filter.id) ?? 0) > 0,
  );
  // The painting just saved stays in view, with its Saved badge, even if the
  // fix took it out of the filter. It drops out on the next visit.
  const shown = works.filter((work) => active.matches(work) || work.slug === focusSlug);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
          <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/curate/new" className={buttonVariants()}>
            Add a painting
          </Link>
          <Link href="/curate/prices" className={cn(buttonVariants({ variant: "outline" }))}>
            Print prices
          </Link>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Lock the desk
            </Button>
          </form>
        </div>
      </div>

      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        Add a painting, rewrite its note, or take it down. Photographs are reduced and watermarked before they are saved. The full-size file is not kept on the site.
      </p>

      <PublishingNote publishing={publishing} />
      {notice === "saved" && !focusSlug ? <p className="mt-4 text-sm">Saved.</p> : null}
      {notice === "removed" ? <p className="mt-4 text-sm">That painting was removed.</p> : null}

      <h2 className="mt-14 font-heading text-3xl italic">In the catalog</h2>
      {works.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing is in the catalog yet.</p>
      ) : (
        <>
          <div role="group" aria-label="Show paintings" className="mt-6 flex flex-wrap gap-2">
            {offered.map((filter) => {
              const chosen = filter.id === active.id;
              return (
                <Button
                  key={filter.id}
                  type="button"
                  size="sm"
                  variant={chosen ? "default" : "outline"}
                  aria-pressed={chosen}
                  onClick={() => chooseFilter(filter.id)}
                >
                  {filter.label}
                  <span className="tabular-nums opacity-75">{counts.get(filter.id)}</span>
                </Button>
              );
            })}
          </div>
          <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
            {active.id === "all"
              ? `${works.length === 1 ? "1 painting" : `${works.length} paintings`}. Choose one to edit it.`
              : matching === 0
                ? active.id === "needs-work"
                  ? "Every painting has its details."
                  : `No painting shows “${active.label}” now.`
                : `${matching} of ${works.length} paintings. Choose one to edit it.`}
          </p>
          <ul className="mt-6 grid gap-2">
            {shown.map((work) => (
              <PaintingRow key={work.slug} work={work} justSaved={focusSlug === work.slug} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
