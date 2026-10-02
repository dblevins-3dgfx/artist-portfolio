import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Prints",
  description: "Print sizes, paper, and how an order is handled by hand.",
};

export default function PrintsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Editions</p>
      <h1 className="mt-3 font-heading text-5xl italic">Prints</h1>
      <p className="mt-5 leading-relaxed">{site.paper}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        The whole picture is printed, centered on the sheet. When the paper is a different
        proportion from the painting, the print has an even border. It is not cropped to
        fill the page.
      </p>

      <table className="mt-10 w-full border-collapse text-left">
        <caption className="sr-only">Print sizes and prices</caption>
        <thead>
          <tr className="border-b border-border text-xs tracking-[0.16em] text-muted-foreground uppercase">
            <th className="py-3 font-medium">Size</th>
            <th className="py-3 text-right font-medium">Price</th>
          </tr>
        </thead>
        <tbody>
          {site.prints.map((size) => (
            <tr key={size.id} className="border-b border-border">
              <td className="py-4 font-heading text-2xl italic">{size.label}</td>
              <td className="py-4 text-right">{formatMoney(size.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-muted-foreground">
        Prices are for the print. {site.shippingNote}
      </p>

      <h2 className="mt-14 font-heading text-3xl italic">What you are looking at</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The images on this site are reduced and watermarked so they are a poor source for
        someone else’s print. A print you request is made from the studio’s original file,
        which is not published. A screenshot of the site will show the watermark.
      </p>

      <h2 className="mt-14 font-heading text-3xl italic">Payment and shipping</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{site.paymentNote}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{site.turnaround}</p>

      <Link href="/work" className={cn(buttonVariants(), "mt-10 inline-flex h-11 px-4")}>
        Choose a picture
      </Link>
    </div>
  );
}
