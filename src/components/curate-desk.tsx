"use client";

import Image from "next/image";
import { useActionState, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { logout, saveWork, type DeskFormState } from "@/app/curate/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DeskWork, Publishing } from "@/lib/desk";

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

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
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
  const [state, action] = useActionState(saveWork, null as DeskFormState);
  return (
    <form action={action} className="grid gap-6 border border-border bg-card p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-5">
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
      </div>
      <div className="grid gap-4">
        <PaintingFields idPrefix={work.slug} work={work} />
        <Field id={`${work.slug}-image`} label="Replace the photograph">
          <Input
            id={`${work.slug}-image`}
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff"
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          Leave the file empty to keep the current preview. A new photograph is reduced and watermarked. The original is not kept.
        </p>
        <FormError error={state?.error} />
        <PendingButtons canSave={canSave} saveLabel="Save" pendingLabel="Saving…" allowRemove />
      </div>
    </form>
  );
}

function NewWorkForm({ canSave }: { canSave: boolean }) {
  const [state, action] = useActionState(saveWork, null as DeskFormState);
  return (
    <form action={action} className="grid gap-4 border border-border bg-card p-4 sm:p-5">
      <input type="hidden" name="existingSlug" value="" />
      <div>
        <h2 className="font-heading text-3xl italic">Add a painting</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Choose one photograph. It is reduced, stripped of camera information, and watermarked before it is saved.
        </p>
      </div>
      <Field id="new-image" label="Photograph">
        <Input
          id="new-image"
          name="image"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff"
        />
      </Field>
      <PaintingFields idPrefix="new" />
      <FormError error={state?.error} />
      <PendingButtons canSave={canSave} saveLabel="Add to the catalog" pendingLabel="Adding…" allowRemove={false} />
    </form>
  );
}

export function CurateDesk({
  works,
  publishing,
  notice,
}: {
  works: DeskWork[];
  publishing: Publishing;
  notice: "saved" | "removed" | null;
}) {
  const canSave = publishing !== "missing";

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
          <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Lock the desk
          </Button>
        </form>
      </div>

      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        Add a painting, rewrite its note, or take it down. Photographs are reduced and watermarked before they are saved. The full-size file is not kept on the site.
      </p>

      {publishing === "github" ? (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Saving publishes the change. The public catalog updates when the next build finishes. Adding a large batch is still faster by running the photograph folder on a computer.
        </p>
      ) : null}
      {publishing === "local" ? (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
          This copy saves into the project on this computer. Nothing is published until those files are committed.
        </p>
      ) : null}
      {publishing === "missing" ? (
        <p role="status" className="mt-4 max-w-prose text-sm leading-relaxed">
          The desk can open, but it cannot save yet. Add <span className="font-medium">STUDIO_GITHUB_TOKEN</span> in the Vercel project, then redeploy.
        </p>
      ) : null}
      {notice === "saved" ? <p className="mt-4 text-sm">Saved.</p> : null}
      {notice === "removed" ? <p className="mt-4 text-sm">That painting was removed.</p> : null}

      <div className="mt-10">
        <NewWorkForm canSave={canSave} />
      </div>

      <h2 className="mt-14 font-heading text-3xl italic">In the catalog</h2>
      {works.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing is in the catalog yet.</p>
      ) : (
        <div className="mt-6 grid gap-6">
          {works.map((work) => (
            <WorkForm key={work.slug} work={work} canSave={canSave} />
          ))}
        </div>
      )}
    </div>
  );
}
