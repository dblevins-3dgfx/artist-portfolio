/*
 * Painting records. These are type aliases, not classes: no constructor,
 * no vtable, no ownership. `Work` is the full catalog record. `CatalogWork`
 * is the narrower view public pages receive, so the desk-only fields stay
 * off the gallery.
 *
 * OriginalStatus is a closed set of string tags, closer to an enum class
 * than to a free-form char*. "in-studio" is what the desk labels Available.
 * originalPrice is whole US dollars, 0 for no price. It, originalStatus and
 * printsAvailable are desk-only: CatalogWork leaves them out.
 *
 * originalShownAt and printsShownAt are where the painting is on display
 * (#104): venue ids from content/venues.json (see lib/venues.ts). The
 * original is at one venue or none (""); prints can be at several. Also
 * desk-only.
 *
 * subjects is a list (a JavaScript array, like a std::vector) because a
 * painting can be in more than one group, say Portraits and Commissioned
 * Works. It is kept in SUBJECTS order, so subjects[0] is the main one.
 */
import type { SubjectId } from "@/lib/subjects";

export type OriginalStatus = "in-studio" | "sold" | "not-for-sale";

export type CatalogWork = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  subjects: SubjectId[];
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
  subjects: SubjectId[];
  featured: boolean;
  originalStatus: OriginalStatus;
  originalPrice: number;
  printsAvailable: boolean;
  originalShownAt: string;
  printsShownAt: string[];
  image: string;
  imageWidth: number;
  imageHeight: number;
};
