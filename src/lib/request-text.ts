import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";
import type { PrintRequest } from "@/lib/types";

export function formatRequest(request: PrintRequest) {
  const lines = [
    `Print request ${request.id}`,
    ``,
    request.buyer.name,
    request.buyer.email,
    request.buyer.phone || "(no phone)",
    request.buyer.street,
    `${request.buyer.city}, ${request.buyer.region} ${request.buyer.postal}`,
    request.buyer.country,
    ``,
    ...request.items.map(
      (item) =>
        `${item.qty} × ${item.title} — ${item.sizeLabel} — ${formatMoney(item.unitPrice * item.qty)}`,
    ),
    ``,
    `Prints total: ${formatMoney(request.total)}`,
    `Postage is added when the studio invoices.`,
    ``,
    request.buyer.notes ? `Note: ${request.buyer.notes}` : "Note: (none)",
  ];
  return lines.join("\n");
}

export function requestMailto(request: PrintRequest) {
  const subject = encodeURIComponent(`Print request ${request.id}`);
  const body = encodeURIComponent(formatRequest(request));
  return `mailto:${site.email}?subject=${subject}&body=${body}`;
}
