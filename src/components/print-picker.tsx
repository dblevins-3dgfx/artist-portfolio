"use client";

import { useState } from "react";
import Link from "next/link";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequestCart } from "@/components/request-provider";
import { formatMoney } from "@/lib/money";
import { site, type PrintSize } from "@/lib/site";
import { cn } from "@/lib/utils";

export function PrintPicker({
  slug,
  title,
  sizes,
}: {
  slug: string;
  title: string;
  sizes: PrintSize[];
}) {
  const { add, items } = useRequestCart();
  const [sizeId, setSizeId] = useState(sizes[1]?.id ?? sizes[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const selected = sizes.find((size) => size.id === sizeId) ?? sizes[0];
  const already = items.find((item) => item.slug === slug && item.sizeId === selected?.id);

  if (!selected) return null;

  return (
    <div className="mt-8 border border-border bg-card p-5">
      <h2 className="font-heading text-2xl italic">Request a print</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {site.paper} The whole picture is printed, centered on the sheet. If the paper
        proportion differs, you get an even border rather than a crop.
      </p>
      <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Print size">
        {sizes.map((size) => {
          const pressed = size.id === selected.id;
          return (
            <button
              key={size.id}
              type="button"
              role="radio"
              aria-checked={pressed}
              onClick={() => {
                setSizeId(size.id);
                setNote("");
              }}
              className={cn(
                "flex items-center justify-between gap-4 border px-4 py-3 text-left",
                pressed
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <span className="text-sm">{size.label}</span>
              <span className="font-heading text-lg">{formatMoney(size.price)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-sm">Quantity</span>
        <div className="flex items-center border border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Decrease quantity"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
          >
            <MinusIcon />
          </Button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
            {qty}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Increase quantity"
            onClick={() => setQty((value) => Math.min(10, value + 1))}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <Button
        type="button"
        className="mt-5 h-11 w-full"
        onClick={() => {
          add({ slug, sizeId: selected.id, qty });
          setNote(`${qty} × ${title}, ${selected.label}, added to your request.`);
        }}
      >
        Add {formatMoney(selected.price * qty)} to request
      </Button>
      {note ? (
        <p className="mt-3 text-sm" role="status">
          {note}{" "}
          <Link href="/request" className="underline underline-offset-4">
            Review the request
          </Link>
        </p>
      ) : already ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This size is already in your request ({already.qty}). Adding it increases the
          quantity.
        </p>
      ) : null}
    </div>
  );
}
