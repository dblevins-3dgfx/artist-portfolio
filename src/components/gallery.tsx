"use client";

import { useMemo, useState } from "react";
import { WorkCard } from "@/components/work-card";
import { Input } from "@/components/ui/input";
import { listMediums } from "@/lib/works";
import type { Work } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Gallery({ works }: { works: Work[] }) {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState("all");
  const mediums = useMemo(() => listMediums(works), [works]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return works.filter((work) => {
      if (medium !== "all" && work.medium !== medium) return false;
      if (!needle) return true;
      return [work.title, work.medium, work.statement, String(work.year)]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [works, query, medium]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by medium">
          <FilterButton active={medium === "all"} onClick={() => setMedium("all")}>
            All
          </FilterButton>
          {mediums.map((entry) => (
            <FilterButton
              key={entry}
              active={medium === entry}
              onClick={() => setMedium(entry)}
            >
              {entry}
            </FilterButton>
          ))}
        </div>
        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">Search pictures</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles"
            className="h-11 bg-card px-3"
          />
        </label>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {filtered.length === 1 ? "1 picture" : `${filtered.length} pictures`}
      </p>
      {filtered.length === 0 ? (
        <p className="mt-10 max-w-md text-lg">No pictures match that search.</p>
      ) : (
        <div className="mt-8 columns-1 gap-x-8 sm:columns-2 lg:columns-3">
          {filtered.map((work) => (
            <WorkCard key={work.slug} work={work} />
          ))}
        </div>
      )}
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
