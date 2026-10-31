"use client";

/*
 * Desk UI. CurateDesk is the list at /curate: one compact row per painting.
 * CurateEditor is one painting's form at /curate/<slug>, and CurateAdd is
 * the form for a new painting at /curate/new.
 * Forms post to saveWork / logout, which are Server Actions: the
 * browser calls those functions on the server rather than a URL you named.
 * useActionState keeps the last `{ error }` beside the form that produced it.
 * useFormStatus is how the submit button knows the post is still in flight.
 *
 * next/image normally runs pictures through the image optimizer. Desk
 * previews pass unoptimized because our custom loader ignores width, and
 * these URLs are either local files or raw GitHub bytes.
 */
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { logout, saveWork, type DeskFormState } from "@/app/curate/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { missingDetails, type DeskWork, type Publishing } from "@/lib/desk";
import { withStaleCheck } from "@/lib/stale-page";
import { SUBJECTS } from "@/lib/subjects";
import { cn } from "@/lib/utils";

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// Wrapped once, at load, rather than on every render. Both forms share it.
const saveFromDesk = withStaleCheck(saveWork);

// A stale page (see lib/stale-page.ts) cannot recover by itself: its
// JavaScript still names the old actions, so only a full reload helps.
// window.location.reload() is the same as pressing the browser's reload.
function FormError({ state }: { state: DeskFormState }) {
  if (!state?.error) return null;
  return (
    <div role="alert" className="grid justify-items-start gap-3 text-sm text-destructive">
      <p>{state.error}</p>
      {state.stale ? (
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      ) : null}
    </div>
  );
}

// Vercel turns away a request over 4.5 MB before the server action runs, so
// the server's own size message would never show. Keep in step with
// imageFromForm in work-form.ts.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

// An oversized file is cleared so not even Remove (which skips validation)
// sends it. The custom validity message blocks Save until a new file is chosen.
function checkPhotoSize(event: ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (file && file.size > MAX_PHOTO_BYTES) {
    input.value = "";
    input.setCustomValidity("That photograph is over 4 MB. Export a smaller JPEG and try again.");
    input.reportValidity();
  } else {
    input.setCustomValidity("");
  }
}

function PendingButtons({
  canSave,
  saveLabel,
  pendingLabel,
  allowRemove,
}: {
  canSave: boolean;
  saveLabel: string;
  pendingLabel: string;
  allowRemove: boolean;
}) {
  const { pending } = useFormStatus();
  // The button's name/value is not a reliable submit intent with this button
  // primitive. A hidden field, set before the post, is what the server reads.
  const setIntent = (event: MouseEvent<HTMLButtonElement>, intent: "save" | "delete") => {
    const field = event.currentTarget.form?.elements.namedItem("intent");
    if (field instanceof HTMLInputElement) field.value = intent;
  };
  return (
    <div className="flex flex-wrap gap-3">
      <input type="hidden" name="intent" defaultValue="save" />
      <Button
        type="submit"
        disabled={pending || !canSave}
        onClick={(event) => setIntent(event, "save")}
      >
        {pending ? pendingLabel : saveLabel}
      </Button>
      {allowRemove ? (
        <Button
          type="submit"
          variant="destructive"
          formNoValidate
          disabled={pending || !canSave}
          onClick={(event) => {
            setIntent(event, "delete");
            if (
              !window.confirm(
                "Take this painting off the site? The preview is removed. A photograph you still have at home is not affected.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
}

function PaintingFields({
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
    </div>
  );
}

function WorkForm({ work, canSave }: { work: DeskWork; canSave: boolean }) {
  const [state, action] = useActionState(saveFromDesk, null as DeskFormState);
  return (
    <form
      action={action}
      className="grid gap-6 border border-border bg-card p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-5"
    >
      <input type="hidden" name="existingSlug" value={work.slug} />
      <div>
        <Image
          src={work.previewUrl}
          alt={work.title}
          width={work.imageWidth || 160}
          height={work.imageHeight || 160}
          unoptimized
          className="aspect-[4/5] w-full border border-border object-cover"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Preview{work.imageWidth ? `, ${work.imageWidth} × ${work.imageHeight}` : ""}
        </p>
        {work.duplicateOf ? <p className="mt-2 text-sm leading-relaxed">{work.duplicateOf}</p> : null}
      </div>
      <div className="grid gap-4">
        <PaintingFields idPrefix={work.slug} work={work} />
        <Field id={`${work.slug}-image`} label="Replace the photograph">
          <Input
            id={`${work.slug}-image`}
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff"
            onChange={checkPhotoSize}
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          Leave the file empty to keep the current preview. A new photograph is reduced and watermarked. The original is not kept.
        </p>
        <FormError state={state} />
        <PendingButtons canSave={canSave} saveLabel="Save" pendingLabel="Saving…" allowRemove />
      </div>
    </form>
  );
}

function NewWorkForm({ canSave }: { canSave: boolean }) {
  const [state, action] = useActionState(saveFromDesk, null as DeskFormState);
  return (
    <form action={action} className="grid gap-4 border border-border bg-card p-4 sm:p-5">
      <input type="hidden" name="existingSlug" value="" />
      <Field id="new-image" label="Photograph">
        <Input
          id="new-image"
          name="image"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff"
          onChange={checkPhotoSize}
        />
      </Field>
      <PaintingFields idPrefix="new" />
      <FormError state={state} />
      <PendingButtons canSave={canSave} saveLabel="Add to the catalog" pendingLabel="Adding…" allowRemove={false} />
    </form>
  );
}

function PublishingNote({ publishing }: { publishing: Publishing }) {
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
function PaintingBadges({ work, justSaved = false, className }: { work: DeskWork; justSaved?: boolean; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1.5 empty:hidden", className)}>
      {justSaved ? <Badge>Saved</Badge> : null}
      {work.featured ? <Badge variant="secondary">Front page</Badge> : null}
      {work.duplicateOf ? <Badge variant="outline">Possible duplicate</Badge> : null}
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
  useEffect(() => {
    if (!focusSlug) return;
    const painting = document.getElementById(focusSlug);
    if (!painting) return;
    painting.scrollIntoView({ block: "start" });
  }, [focusSlug]);

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
          <p className="mt-2 text-sm text-muted-foreground">
            {works.length === 1 ? "1 painting" : `${works.length} paintings`}. Choose one to edit it.
          </p>
          <ul className="mt-6 grid gap-2">
            {works.map((work) => (
              <PaintingRow key={work.slug} work={work} justSaved={focusSlug === work.slug} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function CurateEditor({ work, publishing }: { work: DeskWork; publishing: Publishing }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href={`/curate#${work.slug}`} className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
      <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio desk</p>
      <h1 className="mt-3 font-heading text-5xl italic">{work.title}</h1>
      <PaintingBadges work={work} className="mt-4" />
      <PublishingNote publishing={publishing} />
      <div className="mt-10">
        <WorkForm work={work} canSave={publishing !== "missing"} />
      </div>
    </div>
  );
}

export function CurateAdd({ publishing }: { publishing: Publishing }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href="/curate" className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
      <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio desk</p>
      <h1 className="mt-3 font-heading text-5xl italic">Add a painting</h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        Choose one photograph. It is reduced, stripped of camera information, and watermarked before it is saved.
      </p>
      <PublishingNote publishing={publishing} />
      <div className="mt-10">
        <NewWorkForm canSave={publishing !== "missing"} />
      </div>
    </div>
  );
}
