/*
 * /curate/prices, the standard print price list. Same gate and settings as
 * the other desk pages. This static segment wins over /curate/[slug],
 * which is why work-form.ts refuses "prices" as a web name. A save
 * redirects back here with ?saved=1.
 */
import type { Metadata } from "next";
import { CurateLogin } from "@/components/curate-login";
import { DeskLoadError, DeskSwitchedOff } from "@/components/desk-messages";
import { PrintPricesEditor } from "@/components/print-prices-editor";
import { loadPrintPrices, publishingMode } from "@/lib/catalog-store";
import type { PrintPrices } from "@/lib/print-prices";
import { isSignedIn, studioPassword } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Print prices",
  robots: { index: false, follow: false },
};

export default async function CuratePricesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  if (!studioPassword()) return <DeskSwitchedOff />;

  if (!(await isSignedIn())) {
    return <CurateLogin />;
  }

  let list: PrintPrices | null = null;
  let loadError = "";
  try {
    list = await loadPrintPrices();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The price list could not be read.";
  }
  if (!list) return <DeskLoadError message={loadError} />;

  const { saved } = await searchParams;
  return <PrintPricesEditor list={list} publishing={publishingMode()} saved={saved === "1"} />;
}
