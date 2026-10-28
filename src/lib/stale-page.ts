/*
 * Browser-side guard for desk forms that outlive a deploy.
 *
 * A Server Action is called by an ID that the build bakes into the page's
 * JavaScript, a bit like a mangled symbol name. Each save commits, Vercel
 * rebuilds, and the new build can give every action a new ID. A desk tab
 * opened before that still holds the old IDs, so its next post names an
 * action the server no longer has. Next rejects the call with an
 * UnrecognizedActionError. Uncaught, that reaches app/error.tsx, whose
 * "Try again" re-renders the same stale page and fails again.
 *
 * The session cookie is not the problem: it is keyed by STUDIO_PASSWORD,
 * not by the build. Signing in again only seemed to help because it loads
 * a fresh page. NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (see README) keeps the
 * IDs stable across builds. This guard covers a tab left over from before
 * that was set, or a renamed action.
 *
 * withStaleCheck wraps an action the way a decorator wraps a function: same
 * arguments, same result, but that one error becomes a form message. Other
 * errors are rethrown. That includes redirect(), which reaches the browser
 * as a rejected promise that Next itself handles.
 * unstable_ means Next may rename this export in a later version.
 */
import { unstable_isUnrecognizedActionError } from "next/navigation";
import type { DeskFormState } from "@/app/curate/actions";

export const STALE_PAGE_MESSAGE =
  "The site was updated while this page was open, so this page is out of date and could not send that. Reload the page, then try again. Anything typed here since the page opened will need to be entered again.";

type FormAction = (state: DeskFormState, formData: FormData) => Promise<DeskFormState>;

export function withStaleCheck(action: FormAction): FormAction {
  return async (state, formData) => {
    try {
      return await action(state, formData);
    } catch (error) {
      if (unstable_isUnrecognizedActionError(error)) return { error: STALE_PAGE_MESSAGE, stale: true };
      throw error;
    }
  };
}
