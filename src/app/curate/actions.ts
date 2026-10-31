"use server";

/*
 * Server Actions: functions the browser may call, which always run on the
 * server. "use server" at the top of the file marks every export that way.
 * They are not HTTP routes you write by hand. A <form action={saveWork}>
 * posts straight to saveWork.
 *
 * Return `{ error }` to show a message on the form. `stale` is set only in
 * the browser, by withStaleCheck (lib/stale-page.ts), when the page is from
 * an older build; it adds a Reload button. redirect() ends the
 * action and loads another URL; code after it does not run.
 * revalidatePath drops cached HTML for those URLs so the next view sees
 * the catalog that was just saved.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePainting, savePainting, savePrintPrices } from "@/lib/catalog-store";
import { checkPrintPrices } from "@/lib/print-prices";
import { imageFromForm, readWorkForm } from "@/lib/work-form";
import { isSignedIn, signIn, signOut } from "@/lib/studio-auth";

export type DeskFormState = { error: string; stale?: boolean } | null;

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
  const slug = encodeURIComponent(parsed.fields.slug);
  // An edit stays on the painting's page (under its new web name, if that
  // changed), so Previous/Next are one click away. A new painting lands on
  // the list at that painting; `at` scrolls there, since hash fragments are
  // unreliable on redirects.
  if (parsed.existingSlug) redirect(`/curate/${slug}?saved=1`);
  redirect(`/curate?saved=1&at=${slug}`);
}

// The price grid arrives as one JSON field, because its rows and columns
// are named by the artist and can be added or removed. checkPrintPrices is
// the gate: anything it does not accept never reaches the commit.
export async function savePrintPriceList(_state: DeskFormState, formData: FormData): Promise<DeskFormState> {
  if (!(await isSignedIn())) return { error: "Sign in again to change the price list." };
  const text = formData.get("priceList");
  if (typeof text !== "string" || text.length > 50_000) {
    return { error: "The price list did not arrive. Reload the page and try again." };
  }
  let sent: unknown;
  try {
    sent = JSON.parse(text);
  } catch {
    return { error: "The price list did not arrive. Reload the page and try again." };
  }
  const list = checkPrintPrices(sent);
  if ("error" in list) return list;
  const saved = await savePrintPrices(list);
  if ("error" in saved) return saved;
  revalidatePath("/curate/prices");
  redirect("/curate/prices?saved=1");
}
