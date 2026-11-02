"use client";

/*
 * The venue list at /curate/venues: the galleries and shops that have
 * paintings on display (#104). Each venue has a name, city, contact and
 * notes. Paintings name venues by id, so a rename keeps them; removing a
 * venue takes it off those paintings when the list is saved.
 *
 * Each row has a client-only key; a venue already saved also carries its
 * id, and a new one is sent with an empty id for the server to fill in.
 * The server checks everything again (checkVenues). Like the price grid,
 * the form submits from onSubmit, so a refused save keeps what was typed.
 */
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveVenueList, type DeskFormState } from "@/app/curate/actions";
import { FormError } from "@/components/desk/form";
import { PublishingNote } from "@/components/desk/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Publishing } from "@/lib/desk";
import type { Venue } from "@/lib/venues";
import { withStaleCheck } from "@/lib/stale-page";

const saveFromDesk = withStaleCheck(saveVenueList);

type Row = Venue & { key: string };

let nextKey = 0;
const newKey = () => `venue-${(nextKey += 1)}`;

function paintingCount(count: number) {
  if (count === 0) return "No paintings shown here.";
  return count === 1 ? "1 painting shown here." : `${count} paintings shown here.`;
}

export function VenuesEditor({
  venues,
  shownCounts,
  publishing,
  saved,
}: {
  venues: Venue[];
  shownCounts: Record<string, number>;
  publishing: Publishing;
  saved: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => venues.map((venue) => ({ ...venue, key: newKey() })));
  const [state, action, pending] = useActionState(saveFromDesk, null as DeskFormState);
  const canSave = publishing !== "missing";

  const change = (key: string, field: keyof Venue, value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set(
      "venueList",
      JSON.stringify({ venues: rows.map(({ id, name, city, contact, notes }) => ({ id, name, city, contact, notes })) }),
    );
    startTransition(() => action(formData));
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href="/curate" className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
      <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio desk</p>
      <h1 className="mt-3 font-heading text-5xl italic">Venues</h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        The galleries and shops that have paintings on display. Choose where each painting is shown on its own page.
        Removing a venue here also takes it off those paintings.
      </p>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
        The public site does not show venues. They are saved in the catalog’s repository, which anyone can read on GitHub.
      </p>
      <PublishingNote publishing={publishing} />
      {saved ? <p className="mt-4 text-sm">Saved.</p> : null}

      <form onSubmit={onSubmit} className="mt-10 grid gap-6 border border-border bg-card p-4 sm:p-5">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No venues yet. Add one to start.</p> : null}
        {rows.map((row, index) => {
          const label = row.name || `venue ${index + 1}`;
          return (
            <fieldset key={row.key} className="grid gap-3 border-b border-border pb-6 sm:grid-cols-3">
              <legend className="sr-only">{label}</legend>
              <label className="grid gap-1.5 text-sm font-medium">
                Name
                <Input
                  value={row.name}
                  onChange={(event) => change(row.key, "name", event.target.value)}
                  maxLength={80}
                  required
                  placeholder="Blue Door Gallery"
                  className="font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                City
                <Input
                  value={row.city}
                  onChange={(event) => change(row.key, "city", event.target.value)}
                  maxLength={80}
                  className="font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Contact
                <Input
                  value={row.contact}
                  onChange={(event) => change(row.key, "contact", event.target.value)}
                  maxLength={200}
                  placeholder="Name, phone, or email"
                  className="font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium sm:col-span-3">
                Notes
                <Textarea
                  value={row.notes}
                  onChange={(event) => change(row.key, "notes", event.target.value)}
                  maxLength={1000}
                  rows={2}
                  className="font-normal"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
                <p className="text-sm text-muted-foreground">
                  {row.id ? paintingCount(shownCounts[row.id] ?? 0) : "New venue."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRows((current) => current.filter((other) => other.key !== row.key))}
                >
                  Remove {label}
                </Button>
              </div>
            </fieldset>
          );
        })}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows((current) => [...current, { key: newKey(), id: "", name: "", city: "", contact: "", notes: "" }])
            }
          >
            Add a venue
          </Button>
        </div>
        <FormError state={state} />
        <div>
          <Button type="submit" disabled={pending || !canSave}>
            {pending ? "Saving…" : "Save venues"}
          </Button>
        </div>
      </form>
    </div>
  );
}
