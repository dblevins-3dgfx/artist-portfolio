"use client";

/*
 * The machinery the desk's painting forms share: submitting without React
 * resetting the form, tracking unsaved changes, asking before leaving, the
 * Save / Cancel / Remove row, and form error messages. Forms post to
 * saveWork, a Server Action: the browser calls that function on the
 * server rather than a URL you named. useActionState keeps the last
 * `{ error }` beside the form that produced it, and its pending flag is how
 * the buttons know a save is still in flight.
 */
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { saveWork, type DeskFormState } from "@/app/curate/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formSignature } from "@/lib/desk";
import { withStaleCheck } from "@/lib/stale-page";

export function Field({
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

// What a page's leave check and its form share. The form reports whether
// it has unsaved changes; the page records when the artist has chosen to
// discard them. Each page mount makes a fresh one (useLeaveGuard).
export type LeaveGuard = {
  setChanged: (changed: boolean) => void;
  discarding: RefObject<boolean>;
};

// React 19 resets a <form action={…}> once the action finishes, even when it
// returned an error, which emptied every field and the chosen photograph.
// Submitting from onSubmit avoids that: preventDefault stops the browser's
// own post, and startTransition runs the action the way <form action> would,
// so redirect() after a save and the pending flag still work. The browser's
// own checks (required fields, the photo size) still run before onSubmit.
//
// trackChanges compares the form with a snapshot taken when it first
// rendered, and `changed` says whether anything differs. On the edit page
// that decides whether Save has anything to send. Putting a field back the
// way it was makes the form unchanged again. A failed save keeps the form
// as typed, so it stays changed. While there are unsaved changes, closing
// or reloading the tab asks first (beforeunload); leaving through the
// desk's own Cancel and "All paintings" asks through useLeaveGuard, which
// hears about changes through guard.setChanged.
//
// Once the artist has chosen to discard and leave, guard.discarding is set.
// The form's close-tab warning stays registered until the next page
// replaces it, a moment later; checking the flag keeps it from asking again
// in that moment.
export function useDeskForm({ trackChanges = false, guard }: { trackChanges?: boolean; guard?: LeaveGuard } = {}) {
  const [state, action, pending] = useActionState(saveFromDesk, null as DeskFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const loaded = useRef<string | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (trackChanges && formRef.current) loaded.current = formSignature(new FormData(formRef.current));
  }, [trackChanges]);

  useEffect(() => {
    if (!changed) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!guard?.discarding.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed, guard]);

  const onEdit = () => {
    if (!formRef.current || loaded.current === null) return;
    const next = formSignature(new FormData(formRef.current)) !== loaded.current;
    setChanged(next);
    guard?.setChanged(next);
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
  return { state, pending, onSubmit, formRef, onEdit, changed };
}

// Leaving a desk form page through Cancel or "All paintings". With unsaved
// changes it asks first; without, it just goes. confirmLeave returns false
// when the artist chooses to keep editing. The browser's own confirm box
// shows OK and Cancel, so the question is worded to fit those buttons.
// The guard it returns is handed to the page's form (useDeskForm).
export function useLeaveGuard(question: string) {
  const router = useRouter();
  const [changed, setChanged] = useState(false);
  const discarding = useRef(false);
  const confirmLeave = () => {
    if (!changed) return true;
    discarding.current = window.confirm(question);
    return discarding.current;
  };
  const leave = (href: string) => {
    if (confirmLeave()) router.push(href);
  };
  const guardLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!confirmLeave()) event.preventDefault();
  };
  // Both parts are stable across renders, so the form's close-tab listener
  // is not re-registered every time the page re-renders.
  const guard = useMemo<LeaveGuard>(() => ({ setChanged, discarding }), []);
  return { changed, guard, leave, guardLink };
}

// A stale page (see lib/stale-page.ts) cannot recover by itself: its
// JavaScript still names the old actions, so only a full reload helps.
// window.location.reload() is the same as pressing the browser's reload.
export function FormError({ state }: { state: DeskFormState }) {
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
export function checkPhotoSize(event: ChangeEvent<HTMLInputElement>) {
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

export function PendingButtons({
  pending,
  canSave,
  hasChanges = true,
  saveLabel,
  pendingLabel,
  allowRemove,
  onCancel,
}: {
  pending: boolean;
  canSave: boolean;
  hasChanges?: boolean;
  saveLabel: string;
  pendingLabel: string;
  allowRemove: boolean;
  onCancel: () => void;
}) {
  // The button's name/value is not a reliable submit intent with this button
  // primitive. A hidden field, set before the post, is what the server reads.
  const setIntent = (event: MouseEvent<HTMLButtonElement>, intent: "save" | "delete") => {
    const field = event.currentTarget.form?.elements.namedItem("intent");
    if (field instanceof HTMLInputElement) field.value = intent;
  };
  return (
    <div className="flex flex-wrap gap-3">
      <input type="hidden" name="intent" defaultValue="save" />
      <Button type="submit" disabled={pending || !canSave || !hasChanges} onClick={(event) => setIntent(event, "save")}>
        {pending ? pendingLabel : saveLabel}
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
        Cancel
      </Button>
      {/* Remove sits apart from Save and Cancel, at the far end of the row. */}
      {allowRemove ? (
        <Button
          type="submit"
          variant="destructive"
          formNoValidate
          className="ml-auto"
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
