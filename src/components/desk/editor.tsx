"use client";

/*
 * A painting's edit page (/curate/<slug>, CurateEditor) and the add page
 * (/curate/new, CurateAdd), with their forms. The shared form machinery is
 * in form.tsx and the fields in painting-fields.tsx.
 */
import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useState, type MouseEvent, type ReactNode } from "react";
import { saveDuplicateMark, type DeskFormState } from "@/app/curate/actions";
import { useDeskFilter } from "@/components/desk/filter-store";
import {
  Field,
  FormError,
  PendingButtons,
  checkPhotoSize,
  useDeskForm,
  LeavePrompt,
  useLeaveGuard,
  type LeaveGuard,
  type LeavePromptState,
} from "@/components/desk/form";
import { PaintingBadges, PublishingNote } from "@/components/desk/list";
import { PaintingFields } from "@/components/desk/painting-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listSeparator, stepThrough, type DeskWork, type Publishing } from "@/lib/desk";
import { cn } from "@/lib/utils";
import { seriesNames } from "@/lib/series";
import { withStaleCheck } from "@/lib/stale-page";
import type { Venue } from "@/lib/venues";

// See lib/stale-page.ts: a page left open across a deploy is stale.
const saveMarkFromDesk = withStaleCheck(saveDuplicateMark);

// The thumbnail is cropped to fit the form. Clicking it shows the whole
// preview over the page, as the public painting page does; the form and any
// unsaved edits stay underneath. A click, Escape, or the X closes it.
function UncroppedPreview({ work }: { work: DeskWork }) {
  const [open, setOpen] = useState(false);
  const width = work.imageWidth || 160;
  const height = work.imageHeight || 160;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`View ${work.title} uncropped`}
      >
        <Image
          src={work.previewUrl}
          alt={work.title}
          width={width}
          height={height}
          unoptimized
          className="aspect-[4/5] w-full border border-border object-cover"
        />
      </DialogTrigger>
      <DialogContent
        onClick={() => setOpen(false)}
        className="flex h-dvh w-screen max-w-none cursor-zoom-out items-center justify-center rounded-none bg-black/95 p-4 text-white ring-0 sm:max-w-none sm:p-8"
      >
        <DialogTitle className="sr-only">{work.title}</DialogTitle>
        <Image
          src={work.previewUrl}
          alt={work.title}
          width={width}
          height={height}
          unoptimized
          className="h-full w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

// "Possible duplicate of A and B." with each name linking to that
// painting's edit page. With unsaved changes, following one asks first, as
// "All paintings" does (guardLink), with the question under the note.
//
// Each look-alike also gets a "Not a duplicate of …" button, and each pair
// already marked that way an Undo (#116). They save straight away and come
// back to this page, so they wait while the form has unsaved changes. They
// sit inside the edit form, which cannot hold a second form, so they call
// the action themselves instead of submitting.
function LookalikeNote({
  work,
  guardLink,
  leavePrompt,
  changed,
  canSave,
}: {
  work: DeskWork;
  guardLink: (event: MouseEvent<HTMLAnchorElement>) => void;
  leavePrompt: LeavePromptState;
  changed: boolean;
  canSave: boolean;
}) {
  const [state, action, pending] = useActionState(saveMarkFromDesk, null as DeskFormState);
  if (work.lookalikes.length === 0 && work.notDuplicates.length === 0) return null;
  const mark = (otherSlug: string, different: boolean) => {
    const formData = new FormData();
    formData.set("slug", work.slug);
    formData.set("otherSlug", otherSlug);
    formData.set("different", different ? "1" : "0");
    startTransition(() => action(formData));
  };
  const disabled = pending || changed || !canSave;
  return (
    <div className="mt-2 grid gap-2 text-sm leading-relaxed">
      {work.lookalikes.length > 0 ? (
        <p>
          Possible duplicate of{" "}
          {work.lookalikes.map((other, index) => (
            <span key={other.slug}>
              {listSeparator(index, work.lookalikes.length)}
              <Link href={`/curate/${other.slug}`} onClick={guardLink} className="underline underline-offset-4">
                {other.title}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}
      <LeavePrompt prompt={leavePrompt} at="lookalike" />
      {work.lookalikes.map((other) => (
        <Button
          key={other.slug}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto justify-start py-1 text-left whitespace-normal"
          disabled={disabled}
          onClick={() => mark(other.slug, true)}
        >
          Not a duplicate of {other.title}
        </Button>
      ))}
      {work.notDuplicates.map((other) => (
        <p key={other.slug} className="text-muted-foreground">
          Marked as not a duplicate of {other.title}.{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 align-baseline"
            disabled={disabled}
            onClick={() => mark(other.slug, false)}
          >
            Undo
          </Button>
        </p>
      ))}
      {changed ? <p className="text-muted-foreground">Save or cancel your changes first.</p> : null}
      {pending ? <p className="text-muted-foreground">Saving…</p> : null}
      <FormError state={state} />
    </div>
  );
}

function WorkForm({
  work,
  venues,
  canSave,
  guard,
  guardLink,
  leavePrompt,
  seriesOptions,
  onCancel,
}: {
  work: DeskWork;
  venues: Venue[];
  seriesOptions: string[];
  canSave: boolean;
  guard: LeaveGuard;
  guardLink: (at: string) => (event: MouseEvent<HTMLAnchorElement>) => void;
  leavePrompt: LeavePromptState;
  onCancel: () => void;
}) {
  const { state, pending, onSubmit, formRef, onEdit, changed } = useDeskForm({ trackChanges: true, guard });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={onEdit}
      onChange={onEdit}
      className="grid gap-6 border border-border bg-card p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-5"
    >
      <input type="hidden" name="existingSlug" value={work.slug} />
      <div>
        <UncroppedPreview work={work} />
        <p className="mt-2 text-xs text-muted-foreground">
          Preview{work.imageWidth ? `, ${work.imageWidth} × ${work.imageHeight}` : ""}. Click it to see it uncropped.
        </p>
        <LookalikeNote
          work={work}
          guardLink={guardLink("lookalike")}
          leavePrompt={leavePrompt}
          changed={changed}
          canSave={canSave}
        />
      </div>
      <div className="grid gap-4">
        <PaintingFields idPrefix={work.slug} work={work} venues={venues} seriesOptions={seriesOptions} />
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
          Leave the file empty to keep the current preview. A new photograph is reduced and watermarked. The original is
          not kept.
        </p>
        <FormError state={state} />
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {changed ? "Unsaved changes." : "No changes to save."}
        </p>
        <PendingButtons
          pending={pending}
          canSave={canSave}
          hasChanges={changed}
          saveLabel="Save"
          pendingLabel="Saving…"
          allowRemove
          onCancel={onCancel}
        />
        <LeavePrompt prompt={leavePrompt} at="cancel" />
      </div>
    </form>
  );
}

// The add page tracks changes only so leaving can ask first; its button
// does not wait for a change, and the browser requires a photograph.
function NewWorkForm({
  venues,
  canSave,
  guard,
  leavePrompt,
  seriesOptions,
  onCancel,
}: {
  venues: Venue[];
  canSave: boolean;
  guard: LeaveGuard;
  leavePrompt: LeavePromptState;
  seriesOptions: string[];
  onCancel: () => void;
}) {
  const { state, pending, onSubmit, formRef, onEdit } = useDeskForm({ trackChanges: true, guard });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={onEdit}
      onChange={onEdit}
      className="grid gap-4 border border-border bg-card p-4 sm:p-5"
    >
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
      <PaintingFields idPrefix="new" venues={venues} seriesOptions={seriesOptions} />
      <FormError state={state} />
      <PendingButtons
        pending={pending}
        canSave={canSave}
        saveLabel="Add to the catalog"
        pendingLabel="Adding…"
        allowRemove={false}
        onCancel={onCancel}
      />
      <LeavePrompt prompt={leavePrompt} at="cancel" />
    </form>
  );
}

// Previous / Next, or a disabled stand-in when there is nowhere to go or
// the form has unsaved changes.
function StepButton({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  if (!href) {
    return (
      <Button type="button" variant="outline" size="sm" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Link
      href={`/curate/${href}`}
      aria-label={label}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {children}
    </Link>
  );
}

export function CurateEditor({
  work,
  works,
  venues,
  justSaved,
  publishing,
}: {
  work: DeskWork;
  works: DeskWork[];
  venues: Venue[];
  justSaved: boolean;
  publishing: Publishing;
}) {
  // Right after a save, going back shows the painting's Saved badge on the
  // list, the same way a save used to land there.
  const back = justSaved ? `/curate?saved=1&at=${encodeURIComponent(work.slug)}` : `/curate#${work.slug}`;
  const { changed, guard, leave, guardLink, prompt } = useLeaveGuard(`Discard your changes to “${work.title}”?`);
  // The list's filter, remembered for this tab (see filter-store.ts), so
  // Previous/Next step through the same paintings the list shows.
  const filter = useDeskFilter();
  const step = stepThrough(works, work.slug, filter.id);
  const where =
    filter.id === "all"
      ? `${step.position} of ${step.total}`
      : step.matches
        ? `${step.position} of ${step.total} in “${filter.label}”`
        : `Not in “${filter.label}” now`;
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href={back} onClick={guardLink("back")} className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
      <LeavePrompt prompt={prompt} at="back" className="mt-3 max-w-md" />
      <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio desk</p>
      <h1 className="mt-3 font-heading text-5xl italic">{work.title}</h1>
      <PaintingBadges work={work} className="mt-4" />
      {justSaved ? (
        <p role="status" className="mt-4 text-sm">
          Saved.
        </p>
      ) : null}
      <nav aria-label="Other paintings" className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <StepButton href={changed ? undefined : step.previous} label="Previous painting">
          ← Previous
        </StepButton>
        <span className="text-muted-foreground">{where}</span>
        <StepButton href={changed ? undefined : step.next} label="Next painting">
          Next →
        </StepButton>
        {changed ? <span className="text-muted-foreground">Save or cancel your changes first.</span> : null}
      </nav>
      <PublishingNote publishing={publishing} />
      <div className="mt-10">
        <WorkForm
          work={work}
          venues={venues}
          canSave={publishing !== "missing"}
          guard={guard}
          guardLink={guardLink}
          leavePrompt={prompt}
          seriesOptions={seriesNames(works)}
          onCancel={() => leave(back, "cancel")}
        />
      </div>
    </div>
  );
}

export function CurateAdd({
  publishing,
  venues,
  seriesOptions,
}: {
  publishing: Publishing;
  venues: Venue[];
  seriesOptions: string[];
}) {
  const { guard, leave, guardLink, prompt } = useLeaveGuard("Discard this new painting? Nothing has been saved.");
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href="/curate" onClick={guardLink("back")} className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
      <LeavePrompt prompt={prompt} at="back" className="mt-3 max-w-md" />
      <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio desk</p>
      <h1 className="mt-3 font-heading text-5xl italic">Add a painting</h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        Choose one photograph. It is reduced, stripped of camera information, and watermarked before it is saved.
      </p>
      <PublishingNote publishing={publishing} />
      <div className="mt-10">
        <NewWorkForm
          venues={venues}
          canSave={publishing !== "missing"}
          guard={guard}
          leavePrompt={prompt}
          seriesOptions={seriesOptions}
          onCancel={() => leave("/curate", "cancel")}
        />
      </div>
    </div>
  );
}
