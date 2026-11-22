/*
 * /social-card.png, the site's link-preview card (#43): the picture a text
 * message, Facebook or email shows when someone shares thomasene.art or
 * /work. layout.tsx names it as every page's og:image; painting pages
 * replace it with the painting, and About with the portrait.
 *
 * Next.js draws it once at build time with ImageResponse (part of Next, no
 * extra dependency). It shows one painting's watermarked preview in full,
 * beside the studio's name, tagline and address, in the site's colours.
 * Her "tb" signature mark sits before the name, as in the site header. The
 * tagline is in Great Vibes, a script the artist chose; the name and
 * address use the watermark's Liberation Serif. Both are in assets/fonts.
 *
 * It is a route handler named like a file rather than Next's opengraph-image
 * convention because that serves the card at /opengraph-image, and
 * trailingSlash redirects that to /opengraph-image/. Some link-preview
 * fetchers do not follow redirects. An address ending in .png is not
 * redirected. The card is 1200 × 630, the size layout.tsx states.
 *
 * To feature a different painting, change CARD_SLUG to its web name. The
 * build fails if that painting is no longer in the catalog.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SignatureMark } from "@/components/signature-mark";
import { site } from "@/lib/site";
import { getWork } from "@/lib/works";

const CARD_SLUG = "rain-rain-go-away";

export const dynamic = "force-static";

// The site's colours (globals.css), as hex for the image renderer.
const BACKGROUND = "#f6f2ea";
const INK = "#271d16";
const ACCENT = "#7e3124";
const MUTED = "#61554e";

export async function GET() {
  const work = getWork(CARD_SLUG);
  if (!work) throw new Error(`social-card.png: no painting with the web name "${CARD_SLUG}".`);

  const [painting, serif, script] = await Promise.all([
    readFile(join(process.cwd(), "public", work.image)),
    readFile(join(process.cwd(), "assets/fonts/LiberationSerif-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/GreatVibes-Regular.ttf")),
  ]);
  const paintingHeight = 530;
  const paintingWidth = Math.round((paintingHeight * work.imageWidth) / work.imageHeight);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: BACKGROUND,
        padding: "0 90px 0 80px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain <img> only */}
      <img
        src={`data:image/jpeg;base64,${painting.toString("base64")}`}
        alt=""
        width={paintingWidth}
        height={paintingHeight}
        style={{ boxShadow: "0 10px 30px rgba(39, 29, 22, 0.25)" }}
      />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 80, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* The mark's viewBox is 520 × 800, so 84 tall is 55 wide. */}
          <SignatureMark width={55} height={84} stroke={ACCENT} style={{ marginRight: 18 }} />
          <div style={{ fontFamily: "Liberation Serif", fontSize: 78, color: INK, lineHeight: 1.05 }}>
            {site.artistName}
          </div>
        </div>
        <div style={{ width: 120, height: 4, background: ACCENT, marginTop: 34, marginBottom: 34 }} />
        <div
          style={{ fontFamily: "Great Vibes", fontSize: 92, color: MUTED, lineHeight: 1.3 }}
        >{`${site.tagline}.`}</div>
        <div style={{ fontFamily: "Liberation Serif", fontSize: 34, color: ACCENT, marginTop: 56, letterSpacing: 1 }}>
          {site.domain}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Liberation Serif", data: serif, style: "normal", weight: 700 },
        { name: "Great Vibes", data: script, style: "normal", weight: 400 },
      ],
    },
  );
}
