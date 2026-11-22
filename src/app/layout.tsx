/*
 * Frame around every page. A folder under src/app is a URL: src/app/work/page.tsx
 * is /work, and this file wraps each of those pages.
 *
 * The default export is a Server Component. It runs while HTML is produced,
 * not in the browser, and it is a function rather than a class. JSX (`<html>`)
 * is a typed description of the DOM. `className` values are Tailwind utilities,
 * not class names you defined in a stylesheet. `@/` means src/.
 */
import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteAnalytics } from "@/components/site-analytics";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: site.artistName,
    template: `%s · ${site.artistName}`,
  },
  description: site.tagline,
  robots: {
    index: true,
    follow: true,
    // Image indexing is allowed (#44): Google Images is one of the main ways
    // people find a painter. Only the watermarked 1400px previews are
    // published, never the originals.
    googleBot: { index: true, follow: true },
  },
  // The link-preview card (#43, see social-card.png/route.tsx). Painting
  // pages and About set their own picture, which replaces it. X (Twitter)
  // shows the large picture only with this card type.
  openGraph: {
    images: [
      {
        url: "/social-card.png",
        width: 1200,
        height: 630,
        alt: `${site.artistName}: original paintings. ${site.tagline}.`,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  ...(site.siteUrl ? { metadataBase: new URL(site.siteUrl) } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <div className="h-1 bg-primary" />
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <SiteAnalytics />
      </body>
    </html>
  );
}
