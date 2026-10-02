"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MinusIcon, PlusIcon } from "lucide-react";
import { submitRequest, type RequestFormState } from "@/app/request/actions";
import { useRequestCart } from "@/components/request-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { emailIsPublic, site, workAlt, type PrintSize } from "@/lib/site";
import type { Work } from "@/lib/types";
import { cn } from "@/lib/utils";

const initial: RequestFormState = { ok: false };

export function RequestDesk({
  works,
  sizes,
}: {
  works: Work[];
  sizes: PrintSize[];
}) {
  const { items, setQty, remove, clear } = useRequestCart();
  const [state, action, pending] = useActionState(submitRequest, initial);

  useEffect(() => {
    if (state.ok && state.delivery !== "manual" && state.id) clear();
  }, [state.ok, state.delivery, state.id, clear]);

  if (state.ok && state.id) {
    return (
      <Thanks
        id={state.id}
        delivery={state.delivery}
        summary={state.summary}
        mailto={state.mailto}
        onManualSend={clear}
      />
    );
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

      <form action={action} className="border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="font-heading text-2xl italic">Send this request</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {site.paymentNote} The prints total is {formatMoney(total)}. Postage is added
          on the invoice.
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
        <input type="hidden" name="items" value={JSON.stringify(items)} />
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
        <Button type="submit" className="mt-5 h-11 w-full" disabled={pending || items.length === 0}>
          {pending ? "Sending request…" : "Send print request"}
        </Button>
        {emailIsPublic() ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Or write {site.email} yourself. Include the picture titles and sizes.
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

function Thanks({
  id,
  delivery,
  summary,
  mailto,
  onManualSend,
}: {
  id: string;
  delivery?: RequestFormState["delivery"];
  summary?: string;
  mailto?: string;
  onManualSend: () => void;
}) {
  const manual = delivery === "manual";
  return (
    <div className="max-w-2xl border border-border bg-card p-6 sm:p-8">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Request</p>
      <h2 className="mt-2 font-heading text-4xl italic">{id}</h2>
      {manual ? (
        <p className="mt-4 leading-relaxed">
          This copy of the site cannot store the request on the server yet. Send it from
          your own email so the studio receives it. Keep the reference {id}.
        </p>
      ) : (
        <p className="mt-4 leading-relaxed">
          The studio has this request and will reply by email with a total and an invoice.
          Nothing has been charged. Keep the reference {id}.
        </p>
      )}
      {manual && mailto ? (
        <a
          href={mailto}
          onClick={onManualSend}
          className={cn(buttonVariants(), "mt-6 inline-flex h-11 px-4")}
        >
          Email this request to the studio
        </a>
      ) : null}
      {summary ? (
        <pre className="mt-6 overflow-x-auto border border-border bg-background p-4 text-xs leading-relaxed whitespace-pre-wrap">
          {summary}
        </pre>
      ) : null}
      <Link href="/work" className="mt-6 inline-block text-sm underline underline-offset-4">
        Back to the work
      </Link>
    </div>
  );
}
