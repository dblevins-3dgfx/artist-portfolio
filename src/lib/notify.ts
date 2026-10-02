import { formatRequest } from "@/lib/request-text";
import { site } from "@/lib/site";
import type { PrintRequest } from "@/lib/types";

export async function emailRequest(request: PrintRequest) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.STUDIO_EMAIL || site.email;
  if (!key || !from || !to || to.endsWith("@example.com")) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Print request ${request.id}`,
      text: `${formatRequest(request)}\n\nReply to the buyer at ${request.buyer.email}.`,
    }),
  });

  return response.ok;
}
