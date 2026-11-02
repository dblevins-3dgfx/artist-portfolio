/*
 * The fields every painting form shows: title through availability. The
 * edit page fills them from the painting; the add page leaves them at
 * their defaults. Uncontrolled inputs (defaultValue), read on submit as
 * FormData; see work-form.ts for how the server reads them.
 *
 * The only state is the Original choice and the Prints offered box, so
 * "Original shown at" appears only while the original is Available, and
 * "Prints shown at" only while prints are offered (#104). Hidden, they
 * are not sent, and the save clears them.
 */
import { useState } from "react";
import { Field } from "@/components/desk/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DeskWork } from "@/lib/desk";
import { SUBJECTS } from "@/lib/subjects";
import type { OriginalStatus } from "@/lib/types";
import type { Venue } from "@/lib/venues";

export function PaintingFields({
  idPrefix,
  work,
  venues,
}: {
  idPrefix: string;
  work?: DeskWork;
  venues: Venue[];
}) {
  const [originalStatus, setOriginalStatus] = useState<OriginalStatus>(work?.originalStatus ?? "not-for-sale");
  const [printsOffered, setPrintsOffered] = useState(work ? work.printsAvailable : true);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${idPrefix}-title`} label="Title" className="sm:col-span-2">
        <Input id={`${idPrefix}-title`} name="title" defaultValue={work?.title || ""} required maxLength={120} />
      </Field>
      <Field id={`${idPrefix}-year`} label="Year">
        <Input
          id={`${idPrefix}-year`}
          name="year"
          inputMode="numeric"
          defaultValue={work ? String(work.year) : String(new Date().getFullYear())}
          required
          maxLength={4}
        />
      </Field>
      <Field id={`${idPrefix}-medium`} label="Medium">
        <Input id={`${idPrefix}-medium`} name="medium" defaultValue={work?.medium || ""} maxLength={80} placeholder="Oil" />
      </Field>
      <Field id={`${idPrefix}-surface`} label="Surface">
        <Input id={`${idPrefix}-surface`} name="surface" defaultValue={work?.surface || ""} maxLength={80} placeholder="linen" />
      </Field>
      <Field id={`${idPrefix}-slug`} label="Web name">
        <Input
          id={`${idPrefix}-slug`}
          name="slug"
          defaultValue={work?.slug || ""}
          maxLength={80}
          placeholder="Taken from the title if left blank"
          spellCheck={false}
        />
      </Field>
      <Field id={`${idPrefix}-width`} label="Width (inches)">
        <Input
          id={`${idPrefix}-width`}
          name="widthIn"
          inputMode="decimal"
          defaultValue={work?.widthIn ? String(work.widthIn) : ""}
          maxLength={8}
        />
      </Field>
      <Field id={`${idPrefix}-height`} label="Height (inches)">
        <Input
          id={`${idPrefix}-height`}
          name="heightIn"
          inputMode="decimal"
          defaultValue={work?.heightIn ? String(work.heightIn) : ""}
          maxLength={8}
        />
      </Field>
      {/*
        One checkbox per subject, all sharing the name "subjects", so the form
        sends every checked id. A fieldset with a legend is the HTML way to
        label a group of inputs; a single <label htmlFor> can only point at one.
        Leave all unchecked to keep the painting out of the groups.
      */}
      <fieldset className="sm:col-span-2">
        <legend className="text-sm leading-none font-medium">Subjects</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {SUBJECTS.map((subject) => (
            <label key={subject.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="subjects"
                value={subject.id}
                defaultChecked={work?.subjects.includes(subject.id) || false}
                className="size-4 accent-current"
              />
              {subject.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id={`${idPrefix}-statement`} label="Note" className="sm:col-span-2">
        <Textarea
          id={`${idPrefix}-statement`}
          name="statement"
          defaultValue={work?.statement || ""}
          maxLength={2000}
          rows={4}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={work?.featured || false}
          className="size-4 accent-current"
        />
        Show on the front page
      </label>
      <AvailabilityFields
        idPrefix={idPrefix}
        work={work}
        onOriginalStatus={setOriginalStatus}
        onPrintsOffered={setPrintsOffered}
      />
      <ShowingsFields
        idPrefix={idPrefix}
        work={work}
        venues={venues}
        originalAvailable={originalStatus === "in-studio"}
        printsOffered={printsOffered}
      />
    </div>
  );
}

// Desk-only. Nothing in this section reaches the public pages. The hidden
// field tells the server the section was on the form, so a tab from before
// it existed cannot reset a painting's availability. "in-studio" is the
// stored value for Available. The Original choice and the Prints offered
// box are reported up, so the Showings section can hide what does not
// apply.
function AvailabilityFields({
  idPrefix,
  work,
  onOriginalStatus,
  onPrintsOffered,
}: {
  idPrefix: string;
  work?: DeskWork;
  onOriginalStatus: (status: OriginalStatus) => void;
  onPrintsOffered: (offered: boolean) => void;
}) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="sr-only">Availability</legend>
      <input type="hidden" name="availability" value="1" />
      <fieldset>
        <legend className="text-sm leading-none font-medium">Original</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {ORIGINAL_CHOICES.map((choice) => (
            <label key={choice.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="originalStatus"
                value={choice.value}
                defaultChecked={(work?.originalStatus ?? "not-for-sale") === choice.value}
                onChange={() => onOriginalStatus(choice.value)}
                className="size-4 accent-current"
              />
              {choice.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id={`${idPrefix}-price`} label="Price of the original (US dollars)">
        <Input
          id={`${idPrefix}-price`}
          name="originalPrice"
          inputMode="numeric"
          defaultValue={work?.originalPrice ? String(work.originalPrice) : ""}
          maxLength={12}
          placeholder="Needed when Available"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="printsAvailable"
          defaultChecked={work ? work.printsAvailable : true}
          onChange={(event) => onPrintsOffered(event.target.checked)}
          className="size-4 accent-current"
        />
        Prints offered
      </label>
    </fieldset>
  );
}

// Where the painting is on display (#104). Desk-only, like Availability,
// with its own hidden field for the same reason. Venues are kept on the
// Venues page; ids are what the form sends.
function ShowingsFields({
  idPrefix,
  work,
  venues,
  originalAvailable,
  printsOffered,
}: {
  idPrefix: string;
  work?: DeskWork;
  venues: Venue[];
  originalAvailable: boolean;
  printsOffered: boolean;
}) {
  const place = (venue: Venue) => (venue.city ? `${venue.name}, ${venue.city}` : venue.name);
  return (
    <fieldset className="grid gap-4 border-t border-border pt-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="sr-only">Showings</legend>
      <input type="hidden" name="showings" value="1" />
      {venues.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          No venues yet. Add the galleries and shops that show your work on the desk’s Venues page.
        </p>
      ) : (
        <>
          {originalAvailable ? (
            <Field id={`${idPrefix}-original-shown`} label="Original shown at">
              <select
                id={`${idPrefix}-original-shown`}
                name="originalShownAt"
                defaultValue={work?.originalShownAt ?? ""}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Not on display</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {place(venue)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {!originalAvailable && !printsOffered ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Mark the original Available, or offer prints, to choose where it is shown.
            </p>
          ) : null}
          {printsOffered ? (
            <fieldset className={originalAvailable ? "" : "sm:col-span-2"}>
              <legend className="text-sm leading-none font-medium">Prints shown at</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {venues.map((venue) => (
                  <label key={venue.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="printsShownAt"
                      value={venue.id}
                      defaultChecked={work?.printsShownAt.includes(venue.id) || false}
                      className="size-4 accent-current"
                    />
                    {place(venue)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </>
      )}
    </fieldset>
  );
}

const ORIGINAL_CHOICES = [
  { value: "not-for-sale", label: "Not for sale" },
  { value: "in-studio", label: "Available" },
  { value: "sold", label: "Sold" },
] as const;
