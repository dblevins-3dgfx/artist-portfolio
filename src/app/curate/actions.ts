"use server";

/*
 * Server Actions: functions the browser may call, which always run on the
 * server. "use server" at the top of the file marks every export that way.
 * They are not HTTP routes you write by hand. A <form action={saveWork}>
 * posts straight to saveWork.
 *
 * Return `{ error }` to show a message on the form. redirect() ends the
 * action and loads another URL; code after it does not run.
 * revalidatePath drops cached HTML for those URLs so the next view sees
 * the catalog that was just saved.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePainting, savePainting } from "@/lib/catalog-store";
import { imageFromForm, readWorkForm } from "@/lib/work-form";
import { isSignedIn, signIn, signOut } from "@/lib/studio-auth";

export type DeskFormState = { error: string } | null;

async function refreshCatalog() {
  revalidatePath("/curate");
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/about");
}

export async function login(_state: DeskFormState, formData: FormData): Promise<DeskFormState> {
  const attempt = String(formData.get("password") || "");
  const result = await signIn(attempt);
  if ("error" in result) return result;
  redirect("/curate");
}

export async function logout() {
  await signOut();
  redirect("/curate");
}

export async function saveWork(_state: DeskFormState, formData: FormData): Promise<DeskFormState> {
  if (!(await isSignedIn())) return { error: "Sign in again to change the catalog." };
  const parsed = readWorkForm(formData);
  if ("error" in parsed) return parsed;

  if (parsed.intent === "delete") {
    const removed = await removePainting(parsed.existingSlug);
    if ("error" in removed) return removed;
    await refreshCatalog();
    redirect("/curate?removed=1");
  }

  const image = await imageFromForm(formData);
  if ("error" in image) return image;
  const saved = await savePainting(parsed.existingSlug, parsed.fields, image.bytes);
  if ("error" in saved) return saved;
  await refreshCatalog();
  // `at` brings the desk back to this painting after the reload; hash
  // fragments are unreliable on redirects, so the slug is a query param.
  redirect(`/curate?saved=1&at=${encodeURIComponent(parsed.fields.slug)}`);
}
