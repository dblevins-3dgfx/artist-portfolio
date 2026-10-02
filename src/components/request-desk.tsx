"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useRequestCart } from "@/components/request-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { formatRequest, requestMailto } from "@/lib/request-text";
import { emailIsPublic, site, workAlt, type PrintSize } from "@/lib/site";
import type { PrintRequest, Work } from "@/lib/types";
import { fieldErrors, requestSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
  summary?: string;
  mailto?: string;
};

const initial: FormState = { ok: false };

export function RequestDesk({
  works,
  sizes,
}: {
  works: Work[];
  sizes: PrintSize[];
}) {
  const { items, setQty, remove, clear } = useRequestCart();
  const [state, setState] = useState<FormState>(initial);

  if (state.ok && state.id && state.summary && state.mailto) {
    return <Thanks id={state.id} summary={state.summary} mailto={state.mailto} />;
  }

  const lines = items.map((item) => {
    const work = works.find((entry) => entry.slug === item.slug);
    const size = sizes.find((entry) => entry.id === item.sizeId);
    return { item, work, size };
  });
  const total = lines.reduce((sum, line) => {
    if (!line.size || !line.work?.printsAvailable) return sum;
    return sum + line.size.price * line.item.qty;
  }, 0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = requestSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone") ?? "",
      street: form.get("street"),
      city: form.get("city"),
      region: form.get("region"),
      postal: form.get("postal"),
      country: form.get("country"),
      notes: form.get("notes") ?? "",
      company: String(form.get("company") ?? ""),
      items,
    });

    if (!parsed.success) {
      setState({
        ok: false,
        error: "Check the fields below and prepare the email again.",
        fieldErrors: fieldErrors(parsed.error),
      });
      return;
    }

    if (parsed.data.company) {
      setState({
        ok: true,
        id: "PR-RECEIVED",
        summary: "Request received.",
        mailto: "mailto:",
      });
      return;
    }

    const resolved = [];
    for (const item of parsed.data.items) {
      const work = works.find((entry) => entry.slug === item.slug);
      const size = sizes.find((entry) => entry.id === item.sizeId);
      if (!work || !work.printsAvailable || !size) {
        setState({
          ok: false,
          error: "One of the prints is no longer offered. Remove it from the list and try again.",
        });
        return;
      }
      resolved.push({
        slug: work.slug,
        title: work.title,
        sizeId: size.id,
        sizeLabel: size.label,
        unitPrice: size.price,
        qty: item.qty,
      });
    }

    const request: PrintRequest = {
      id: newRequestId(),
      createdAt: new Date().toISOString(),
      status: "new",
      buyer: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        street: parsed.data.street,
        city: parsed.data.city,
        region: parsed.data.region,
        postal: parsed.data.postal,
        country: parsed.data.country,
        notes: parsed.data.notes,
      },
      items: resolved,
      total: resolved.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    };

    clear();
    setState({
      ok: true,
      id: request.id,
      summary: formatRequest(request),
      mailto: requestMailto(request),
    });
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
      <div>
        {items.length === 0 ? (
          <div className="border border-border bg-card p-6">
            <h2 className="font-heading text-2xl italic">Nothing in this request yet</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Browse the work, choose a print size, and it will collect here. You can
              send several pictures in one request.
            </p>
            <Link href="/work" className={cn(buttonVariants(), "mt-6 inline-flex h-11 px-4")}>
              Browse the work
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {lines.map(({ item, work, size }) => (
              <li key={`${item.slug}-${item.sizeId}`} className="flex gap-4 border-b border-border pb-6">
                {work ? (
                  <Image
                    src={work.image}
                    alt={workAlt(work)}
                    width={work.imageWidth}
                    height={work.imageHeight}
                    className="h-28 w-24 border border-border bg-muted object-contain"
                  />
                ) : (
                  <div className="h-28 w-24 border border-border bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-xl italic">
                    {work ? (
                      <Link href={`/work/${work.slug}`} className="hover:underline">
                        {work.title}
                      </Link>
                    ) : (
                      "This picture is no longer listed"
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {size ? size.label : "This size is no longer offered"}
                    {size ? ` · ${formatMoney(size.price)}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center border border-border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        aria-label={`Decrease quantity of ${work?.title ?? "print"}`}
                        onClick={() => setQty(item.slug, item.sizeId, item.qty - 1)}
                      >
                        <MinusIcon />
                      </Button>
                      <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        aria-label={`Increase quantity of ${work?.title ?? "print"}`}
                        onClick={() => setQty(item.slug, item.sizeId, item.qty + 1)}
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => remove(item.slug, item.sizeId)}
                    >
                      Remove
                    </button>
                    {size && work?.printsAvailable ? (
                      <span className="ml-auto text-sm">{formatMoney(size.price * item.qty)}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit} className="border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="font-heading text-2xl italic">Prepare this request</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {site.paymentNote} The prints total is {formatMoney(total)}. Postage is added
          on the invoice. The next step opens an email; this website does not keep the order.
        </p>
        {state.error ? (
          <p className="mt-4 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Name" name="name" error={state.fieldErrors?.name} autoComplete="name" />
          <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} autoComplete="email" />
          <Field label="Phone (optional)" name="phone" type="tel" error={state.fieldErrors?.phone} autoComplete="tel" required={false} />
          <Field label="Street" name="street" error={state.fieldErrors?.street} autoComplete="street-address" />
          <Field label="City" name="city" error={state.fieldErrors?.city} autoComplete="address-level2" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State or region" name="region" error={state.fieldErrors?.region} autoComplete="address-level1" />
            <Field label="Postal code" name="postal" error={state.fieldErrors?.postal} autoComplete="postal-code" />
          </div>
          <Field label="Country" name="country" error={state.fieldErrors?.country} autoComplete="country-name" />
          <div>
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              name="notes"
              className="mt-2 min-h-28 bg-background px-3"
              placeholder="A gift, a deadline, or a question about the painting."
              aria-invalid={state.fieldErrors?.notes ? true : undefined}
            />
            {state.fieldErrors?.notes ? (
              <p className="mt-1 text-sm text-destructive">{state.fieldErrors.notes}</p>
            ) : null}
          </div>
        </div>
        <Button type="submit" className="mt-5 h-11 w-full" disabled={items.length === 0}>
          Prepare the email
        </Button>
        {!emailIsPublic() ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The studio email in the site settings is still a placeholder, so this message
            does not yet reach anyone.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  error,
  type = "text",
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className="mt-2 h-11 bg-background px-3"
      />
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function Thanks({ id, summary, mailto }: { id: string; summary: string; mailto: string }) {
  const [copied, setCopied] = useState(false);
  const placeholder = !emailIsPublic();

  return (
    <div className="max-w-2xl border border-border bg-card p-6 sm:p-8">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Request</p>
      <h2 className="mt-2 font-heading text-4xl italic">{id}</h2>
      <p className="mt-4 leading-relaxed">
        {placeholder
          ? "The order is written out below. The studio email is not set yet, so sending it will not reach the studio."
          : "Send the email so the studio receives this request. Nothing has been charged. Keep the reference."}{" "}
        {id}.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {mailto.startsWith("mailto:") && mailto.length > "mailto:".length ? (
          <a href={mailto} className={cn(buttonVariants(), "inline-flex h-11 px-4")}>
            Open the email
          </a>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-background"
          onClick={() => {
            void navigator.clipboard.writeText(summary).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? "Copied" : "Copy the request"}
        </Button>
      </div>
      <pre className="mt-6 overflow-x-auto border border-border bg-background p-4 text-xs leading-relaxed whitespace-pre-wrap">
        {summary}
      </pre>
      <Link href="/work" className="mt-6 inline-block text-sm underline underline-offset-4">
        Back to the work
      </Link>
    </div>
  );
}

function newRequestId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `PR-${hex.toUpperCase()}`;
}
