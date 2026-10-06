import type { WorkFields } from "@/lib/desk";
import { isCatalogSlug } from "@/lib/catalog";
import { parseSubject } from "@/lib/subjects";

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function textField(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

function inches(value: string) {
  if (!value) return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 200) return null;
  return number;
}

export function readWorkForm(
  formData: FormData,
):
  | { error: string }
  | { intent: "delete"; existingSlug: string }
  | { intent: "save"; existingSlug: string; fields: WorkFields } {
  const existingSlug = textField(formData, "existingSlug", 80);
  if (existingSlug && !isCatalogSlug(existingSlug)) {
    return { error: "That painting’s web name is not valid. Reload the page." };
  }
  const intent = formData.get("intent") === "delete" ? "delete" : "save";
  if (intent === "delete") {
    if (!existingSlug) return { error: "Choose a painting already in the catalog." };
    return { intent: "delete" as const, existingSlug };
  }

  const title = textField(formData, "title", 120).replace(/\s+/g, " ").trim();
  if (!title) return { error: "Give the painting a title." };
  const yearText = textField(formData, "year", 4);
  if (!/^\d{4}$/.test(yearText)) return { error: "Enter the year as four digits." };
  const year = Number(yearText);
  if (year < 1800 || year > 2100) return { error: "Enter a year between 1800 and 2100." };
  const medium = textField(formData, "medium", 80).replace(/\s+/g, " ").trim();
  const surface = textField(formData, "surface", 80).replace(/\s+/g, " ").trim();
  const widthIn = inches(textField(formData, "widthIn", 8));
  const heightIn = inches(textField(formData, "heightIn", 8));
  if (widthIn === null || heightIn === null) {
    return { error: "Enter the size in inches, or leave both blank." };
  }
  const statement = textField(formData, "statement", 2000);
  const requested = textField(formData, "slug", 80);
  const slug = requested || slugify(title);
  if (!isCatalogSlug(slug)) {
    return { error: "The web name needs letters or numbers. You can leave it blank and it will be taken from the title." };
  }
  const fields: WorkFields = {
    slug,
    title,
    year,
    medium,
    surface,
    widthIn,
    heightIn,
    statement,
    subject: parseSubject(textField(formData, "subject", 40)),
    featured: formData.get("featured") === "on",
  };
  return { intent: "save" as const, existingSlug, fields };
}

export async function imageFromForm(
  formData: FormData,
): Promise<{ error: string } | { bytes: Buffer | null }> {
  const value = formData.get("image");
  if (!(value instanceof File) || value.size === 0) return { bytes: null as Buffer | null };
  if (value.size > 20 * 1024 * 1024) {
    return { error: "That photograph is over 20 MB. Export a smaller file and try again." };
  }
  return { bytes: Buffer.from(await value.arrayBuffer()) };
}
