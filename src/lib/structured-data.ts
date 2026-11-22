/*
 * Structured data for search engines (#45): schema.org JSON-LD that says a
 * painting page is an artwork and who made it, and that the About page is
 * about the artist. Search engines read it from a <script> tag the visitor
 * never sees (see components/json-ld.tsx).
 *
 * The artist is named by her first name, "Thomasene" (site.firstName), with
 * the studio, "Thomasene Art", as her brand. Addresses must be absolute,
 * so nothing is produced until content/studio.json has a siteUrl.
 *
 * Plain functions of the catalog entry and the studio details, so they can
 * be tested without rendering a page (structured-data.test.ts).
 */
import type { CatalogWork } from "@/lib/types";

type Studio = {
  firstName: string;
  artistName: string;
  location: string;
  siteUrl: string;
};

type Painting = Pick<CatalogWork, "slug" | "title" | "year" | "medium" | "surface" | "statement" | "image"> & {
  widthIn: number;
  heightIn: number;
};

function base(studio: Studio) {
  return studio.siteUrl.replace(/\/$/, "");
}

// The artist, as both the About page's subject and each painting's creator.
function person(studio: Studio) {
  return {
    "@type": "Person",
    name: studio.firstName,
    url: `${base(studio)}/about/`,
    brand: { "@type": "Brand", name: studio.artistName },
  };
}

function inches(value: number) {
  return { "@type": "QuantitativeValue", value, unitCode: "INH" };
}

// A painting page. Fields the catalog leaves blank (no surface, no size,
// no note) are left out rather than sent empty.
export function artworkJsonLd(work: Painting, studio: Studio) {
  if (!studio.siteUrl) return null;
  const medium = work.medium.trim();
  const surface = work.surface.trim();
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: work.title,
    url: `${base(studio)}/work/${work.slug}/`,
    image: `${base(studio)}${work.image}`,
    creator: person(studio),
    artform: "Painting",
    ...(medium ? { artMedium: medium } : {}),
    ...(surface ? { artworkSurface: surface } : {}),
    ...(work.widthIn && work.heightIn ? { width: inches(work.widthIn), height: inches(work.heightIn) } : {}),
    ...(work.year ? { dateCreated: String(work.year) } : {}),
    ...(work.statement.trim() ? { description: work.statement.trim() } : {}),
  };
}

// The About page. "Coeur d’Alene, Idaho" becomes the town and the state.
export function artistJsonLd(studio: Studio, portrait: string) {
  if (!studio.siteUrl) return null;
  const [locality, region] = studio.location.split(",").map((part) => part.trim());
  return {
    "@context": "https://schema.org",
    ...person(studio),
    jobTitle: "Painter",
    image: `${base(studio)}${portrait}`,
    ...(locality
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: locality,
            ...(region ? { addressRegion: region } : {}),
          },
        }
      : {}),
  };
}

// The text for the <script> tag. JSON.stringify does not escape "<", so a
// note containing "</script>" could end the tag early; "<" is the same
// character to a JSON reader and harmless to the HTML parser.
export function jsonLdText(data: object) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
