/*
 * Painting records. These are type aliases, not classes: no constructor,
 * no vtable, no ownership. `Work` is the full catalog record. `CatalogWork`
 * is the narrower view public pages receive, so the desk-only fields stay
 * off the gallery.
 *
 * OriginalStatus is a closed set of string tags, closer to an enum class
 * than to a free-form char*.
 */
export type OriginalStatus = "in-studio" | "sold" | "not-for-sale";

export type CatalogWork = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  subject: string;
  statement: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
};

export type Work = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  subject: string;
  featured: boolean;
  originalStatus: OriginalStatus;
  printsAvailable: boolean;
  image: string;
  imageWidth: number;
  imageHeight: number;
};
