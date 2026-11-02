"use client";

/*
 * A painting's edit page (/curate/<slug>, CurateEditor) and the add page
 * (/curate/new, CurateAdd), with their forms. The shared form machinery is
 * in form.tsx and the fields in painting-fields.tsx.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useDeskFilter } from "@/components/desk/filter-store";
import {
  Field,
  FormError,
  PendingButtons,
  checkPhotoSize,
  useDeskForm,
  useLeaveGuard,
  type LeaveGuard,
} from "@/components/desk/form";
import { PaintingBadges, PublishingNote } from "@/components/desk/list";
import { PaintingFields } from "@/components/desk/painting-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stepThrough, type DeskWork, type Publishing } from "@/lib/desk";
import { cn } from "@/lib/utils";

function WorkForm({
  work,
  canSave,
  guard,
  onCancel,
}: {
  work: DeskWork;
  canSave: boolean;
  guard: LeaveGuard;
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
        {/* The thumbnail is cropped to fit; the link shows the whole preview
            in a new tab, so the form and any unsaved edits stay put. */}
        <a
          href={work.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the whole image in a new tab"
          tabIndex={-1}
          aria-hidden
        >
          <Image
            src={work.previewUrl}
            alt={work.title}
            width={work.imageWidth || 160}
            height={work.imageHeight || 160}
            unoptimized
            className="aspect-[4/5] w-full border border-border object-cover"
          />
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          Preview{work.imageWidth ? `, ${work.imageWidth} × ${work.imageHeight}` : ""}.{" "}
          <a href={work.previewUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            View uncropped
          </a>
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
      </div>
    </form>
  );
}

// The add page tracks changes only so leaving can ask first; its button
// does not wait for a change, and the browser requires a photograph.
function NewWorkForm({
  canSave,
  guard,
  onCancel,
}: {
  canSave: boolean;
  guard: LeaveGuard;
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
      <PaintingFields idPrefix="new" />
      <FormError state={state} />
      <PendingButtons
        pending={pending}
        canSave={canSave}
        saveLabel="Add to the catalog"
        pendingLabel="Adding…"
        allowRemove={false}
        onCancel={onCancel}
      />
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
    <Link href={`/curate/${href}`} aria-label={label} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      {children}
    </Link>
  );
}

export function CurateEditor({
  work,
  works,
  justSaved,
  publishing,
}: {
  work: DeskWork;
  works: DeskWork[];
  justSaved: boolean;
  publishing: Publishing;
}) {
  // Right after a save, going back shows the painting's Saved badge on the
  // list, the same way a save used to land there.
  const back = justSaved ? `/curate?saved=1&at=${encodeURIComponent(work.slug)}` : `/curate#${work.slug}`;
  const { changed, guard, leave, guardLink } = useLeaveGuard(
    `Discard your changes to “${work.title}”? Choose OK to discard them, or Cancel to keep editing.`,
  );
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
        <Link href={back} onClick={guardLink} className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
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
          canSave={publishing !== "missing"}
          guard={guard}
          onCancel={() => leave(back)}
        />
      </div>
    </div>
  );
}

export function CurateAdd({ publishing }: { publishing: Publishing }) {
  const { guard, leave, guardLink } = useLeaveGuard(
    "Discard this new painting? Nothing has been saved. Choose OK to discard it, or Cancel to keep editing.",
  );
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href="/curate" onClick={guardLink} className="underline underline-offset-4">
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
        <NewWorkForm canSave={publishing !== "missing"} guard={guard} onCancel={() => leave("/curate")} />
      </div>
    </div>
  );
}
