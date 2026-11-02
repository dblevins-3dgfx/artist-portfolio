"use client";

/*
 * Browser half of /work. "use client" must stay the first statement. This
 * module, and the components it imports, are shipped to the browser.
 * useState is component memory: it survives re-renders of this function,
 * it is not a global, and it resets on a full page load.
 * The catalog itself was already parsed on the server and passed in as props.
 */
import { useMemo, useState } from "react";
import { WorkCard } from "@/components/work-card";
import { Input } from "@/components/ui/input";
import { SUBJECTS, subjectLabel } from "@/lib/subjects";
import type { CatalogWork } from "@/lib/types";
import { cn } from "@/lib/utils";

function matchesQuery(work: CatalogWork, needle: string) {
  if (!needle) return true;
  return [work.title, work.medium, work.statement, ...work.subjects.map(subjectLabel), String(work.year)]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function Gallery({ works }: { works: CatalogWork[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const groups = useMemo(
    () => SUBJECTS.filter((entry) => works.some((work) => work.subjects.includes(entry.id))),
    [works],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return works.filter((work) => {
      // includes() takes a SubjectId, and this state is a plain string, so
      // compare with some() instead of casting.
      if (subject !== "all" && !work.subjects.some((id) => id === subject)) return false;
      return matchesQuery(work, needle);
    });
  }, [works, query, subject]);

  // The grouped view lists each painting once, under its first subject.
  // The filter buttons above still find it under every subject it has.
  const sections = useMemo(() => {
    if (subject !== "all" || query.trim()) return null;
    const named: { id: string; label: string; works: CatalogWork[] }[] = groups
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        works: filtered.filter((work) => work.subjects[0] === entry.id),
      }))
      .filter((entry) => entry.works.length > 0);
    if (named.length === 0) return null;
    const rest = filtered.filter((work) => work.subjects.length === 0);
    if (rest.length > 0) {
      named.push({ id: "other", label: "Other paintings", works: rest });
    }
    return named;
  }, [filtered, groups, query, subject]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {groups.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by subject">
            <FilterButton active={subject === "all"} onClick={() => setSubject("all")}>
              All
            </FilterButton>
            {groups.map((entry) => (
              <FilterButton key={entry.id} active={subject === entry.id} onClick={() => setSubject(entry.id)}>
                {entry.label}
              </FilterButton>
            ))}
          </div>
        ) : (
          <div />
        )}
        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">Search paintings</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles"
            className="h-11 bg-card px-3"
          />
        </label>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {filtered.length === 1 ? "1 painting" : `${filtered.length} paintings`}
      </p>
      {filtered.length === 0 ? (
        <p className="mt-10 max-w-md text-lg">No paintings match that search.</p>
      ) : sections ? (
        <div className="mt-10 grid gap-14">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="font-heading text-3xl italic">{section.label}</h2>
              <CardGrid works={section.works} />
            </section>
          ))}
        </div>
      ) : (
        <CardGrid works={filtered} />
      )}
    </div>
  );
}

function CardGrid({ works }: { works: CatalogWork[] }) {
  return (
    <div className="mt-8 columns-1 gap-x-8 sm:columns-2 lg:columns-3">
      {works.map((work) => (
        <WorkCard key={work.slug} work={work} />
      ))}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 text-sm",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}
