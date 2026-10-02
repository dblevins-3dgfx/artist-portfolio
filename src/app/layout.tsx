import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SampleNotice } from "@/components/sample-notice";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { getWorks } from "@/lib/works";
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
  description: site.intro,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, noimageindex: true },
  },
  ...(site.siteUrl ? { metadataBase: new URL(site.siteUrl) } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const samples = getWorks().filter((work) => work.sample).length;

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <div className="h-1 bg-primary" />
        <SiteHeader />
        <SampleNotice count={samples} />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
