"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { getWorks } from "@/lib/works";
import { emailRequest } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { formatRequest, requestMailto } from "@/lib/request-text";
import { saveRequest } from "@/lib/requests-store";
import { site } from "@/lib/site";
import type { PrintRequest } from "@/lib/types";
import { fieldErrors, requestSchema } from "@/lib/validators";

export type RequestFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
  delivery?: "saved" | "emailed" | "both" | "manual";
  summary?: string;
  mailto?: string;
};

function canPersist() {
  return !process.env.VERCEL;
}

export async function submitRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`request:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return {
      ok: false,
      error: "This network has sent several requests in the last hour. Wait a little, or write the studio directly.",
    };
  }

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "The print list could not be read. Refresh the page and try again." };
  }

  const parsed = requestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    street: formData.get("street"),
    city: formData.get("city"),
    region: formData.get("region"),
    postal: formData.get("postal"),
    country: formData.get("country"),
    notes: formData.get("notes") ?? "",
    company: String(formData.get("company") ?? ""),
    items,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the fields below and send the request again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  if (parsed.data.company) {
    return {
      ok: true,
      id: "PR-RECEIVED",
      delivery: "saved",
      summary: "Request received.",
    };
  }

  const works = getWorks();
  const resolved = [];
  for (const item of parsed.data.items) {
    const work = works.find((entry) => entry.slug === item.slug);
    const size = site.prints.find((entry) => entry.id === item.sizeId);
    if (!work || !work.printsAvailable || !size) {
      return {
        ok: false,
        error: "One of the prints is no longer offered. Remove it from the list and try again.",
      };
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
    id: `PR-${randomBytes(4).toString("hex").toUpperCase()}`,
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

  let saved = false;
  let emailed = false;

  if (canPersist()) {
    try {
      await saveRequest(request);
      saved = true;
    } catch {
      saved = false;
    }
  }

  try {
    emailed = await emailRequest(request);
  } catch {
    emailed = false;
  }

  const summary = formatRequest(request);
  if (saved && emailed) {
    return { ok: true, id: request.id, delivery: "both", summary };
  }
  if (saved) return { ok: true, id: request.id, delivery: "saved", summary };
  if (emailed) return { ok: true, id: request.id, delivery: "emailed", summary };

  return {
    ok: true,
    id: request.id,
    delivery: "manual",
    summary,
    mailto: requestMailto(request),
  };
}
