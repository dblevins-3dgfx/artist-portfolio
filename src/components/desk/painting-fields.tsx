/*
 * The fields every painting form shows: title through availability. The
 * edit page fills them from the painting; the add page leaves them at
 * their defaults. Uncontrolled inputs (defaultValue), read on submit as
 * FormData; see work-form.ts for how the server reads them.
 */
import { Field } from "@/components/desk/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DeskWork } from "@/lib/desk";
import { SUBJECTS } from "@/lib/subjects";

export function PaintingFields({
  idPrefix,
  work,
}: {
  idPrefix: string;
  work?: DeskWork;
}) {
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
      {/*
        Desk-only. Nothing in this section reaches the public pages. The
        hidden field tells the server the section was on the form, so a tab
        from before it existed cannot reset a painting's availability.
        "in-studio" is the stored value for Available.
      */}
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
            className="size-4 accent-current"
          />
          Prints offered
        </label>
      </fieldset>
    </div>
  );
}

const ORIGINAL_CHOICES = [
  { value: "not-for-sale", label: "Not for sale" },
  { value: "in-studio", label: "Available" },
  { value: "sold", label: "Sold" },
] as const;
