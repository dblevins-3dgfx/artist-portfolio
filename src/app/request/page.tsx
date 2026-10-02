import type { Metadata } from "next";
import { RequestDesk } from "@/components/request-desk";
import { site } from "@/lib/site";
import { getWorks } from "@/lib/works";

export const metadata: Metadata = {
  title: "Request prints",
  description: "Send a print request. Payment is arranged by invoice, not on this page.",
};

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Order by hand</p>
      <h1 className="mt-3 font-heading text-5xl italic">Request prints</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Add the pictures you want, then send your name and a shipping address. {site.paymentNote}
      </p>
      <div className="mt-10">
        <RequestDesk works={getWorks()} sizes={site.prints} />
      </div>
    </div>
  );
}
