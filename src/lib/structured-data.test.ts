import assert from "node:assert/strict";
import { test } from "node:test";
import { artistJsonLd, artworkJsonLd, jsonLdText } from "@/lib/structured-data";

const studio = {
  firstName: "Thomasene",
  artistName: "Thomasene Art",
  location: "Coeur d’Alene, Idaho",
  siteUrl: "https://thomasene.art",
};

const painting = {
  slug: "brotherly-love",
  title: "Brotherly Love",
  year: 2026,
  medium: "Oil",
  surface: "Canvas",
  widthIn: 12,
  heightIn: 12,
  statement: "These sweet boys caught my attention.",
  image: "/art/brotherly-love.jpg",
};

test("a painting page describes the artwork, with Thomasene as its creator", () => {
  assert.deepEqual(artworkJsonLd(painting, studio), {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: "Brotherly Love",
    url: "https://thomasene.art/work/brotherly-love/",
    image: "https://thomasene.art/art/brotherly-love.jpg",
    creator: {
      "@type": "Person",
      name: "Thomasene",
      url: "https://thomasene.art/about/",
      brand: { "@type": "Brand", name: "Thomasene Art" },
    },
    artform: "Painting",
    artMedium: "Oil",
    artworkSurface: "Canvas",
    width: { "@type": "QuantitativeValue", value: 12, unitCode: "INH" },
    height: { "@type": "QuantitativeValue", value: 12, unitCode: "INH" },
    dateCreated: "2026",
    description: "These sweet boys caught my attention.",
  });
});

test("blank catalog fields are left out, not sent empty", () => {
  const sparse = artworkJsonLd({ ...painting, surface: " ", widthIn: 0, statement: "", year: 0 }, studio);
  assert.ok(sparse);
  for (const key of ["artworkSurface", "width", "height", "description", "dateCreated"]) {
    assert.equal(key in sparse, false, key);
  }
  assert.equal(sparse.artMedium, "Oil");
});

test("the About page describes Thomasene, her studio as the brand, and her town", () => {
  assert.deepEqual(artistJsonLd(studio, "/studio/thomasene.jpg"), {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Thomasene",
    url: "https://thomasene.art/about/",
    brand: { "@type": "Brand", name: "Thomasene Art" },
    jobTitle: "Painter",
    image: "https://thomasene.art/studio/thomasene.jpg",
    address: { "@type": "PostalAddress", addressLocality: "Coeur d’Alene", addressRegion: "Idaho" },
  });
  const noState = artistJsonLd({ ...studio, location: "Coeur d’Alene" }, "/p.jpg");
  assert.deepEqual(noState?.address, { "@type": "PostalAddress", addressLocality: "Coeur d’Alene" });
  assert.equal("address" in (artistJsonLd({ ...studio, location: "" }, "/p.jpg") ?? {}), false);
});

test("nothing is produced until the site has an address, and a trailing slash is ignored", () => {
  assert.equal(artworkJsonLd(painting, { ...studio, siteUrl: "" }), null);
  assert.equal(artistJsonLd({ ...studio, siteUrl: "" }, "/p.jpg"), null);
  assert.equal(
    artworkJsonLd(painting, { ...studio, siteUrl: "https://thomasene.art/" })?.url,
    "https://thomasene.art/work/brotherly-love/",
  );
});

test("text that could close the script tag is escaped", () => {
  const text = jsonLdText({ description: "A note with </script><b>tags</b>" });
  assert.equal(text.includes("<"), false);
  assert.deepEqual(JSON.parse(text), { description: "A note with </script><b>tags</b>" });
});
