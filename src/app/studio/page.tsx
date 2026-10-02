import type { Metadata } from "next";
import { StudioLogin } from "@/components/studio-login";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logout, setStatus } from "@/app/studio/actions";
import { formatMoney, formatWhen } from "@/lib/money";
import { readRequests } from "@/lib/requests-store";
import { emailIsPublic, site } from "@/lib/site";
import { isStudioAuthed, studioPassword } from "@/lib/studio-auth";
import { getWorks } from "@/lib/works";
import type { RequestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

const nextStatus: { status: RequestStatus; label: string }[] = [
  { status: "new", label: "Mark new" },
  { status: "confirmed", label: "Mark confirmed" },
  { status: "shipped", label: "Mark shipped" },
  { status: "closed", label: "Close" },
];

export default async function StudioPage() {
  const configured = Boolean(studioPassword());
  const authed = await isStudioAuthed();
  const issues = readiness();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
      <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Requests land here when this server can store them. Reply from your own email,
        invoice by hand, print from the original file on your computer, and ship it.
        Marking a request shipped is only a reminder for you.
      </p>

      {!configured ? (
        <div className="mt-8 border border-border bg-card p-6">
          <h2 className="font-heading text-2xl italic">The desk is locked</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Set <code className="text-foreground">STUDIO_PASSWORD</code> in{" "}
            <code className="text-foreground">.env.local</code> to at least 12 characters,
            then restart the server. Use a password you do not use anywhere else.
          </p>
          <Checklist issues={issues} />
        </div>
      ) : null}

      {configured && !authed ? (
        <div className="mt-8">
          <StudioLogin />
        </div>
      ) : null}

      {authed ? (
        <div className="mt-10">
          <form action={logout}>
            <Button type="submit" variant="outline" className="h-10 bg-card">
              Sign out
            </Button>
          </form>
          <Checklist issues={issues} />
          <Inbox />
        </div>
      ) : null}
    </div>
  );
}

function readiness() {
  const issues: string[] = [];
  if (site.artistName === "Artist Name") {
    issues.push(
      "Set artistName in content/studio.json, then run npm run process-images so the watermark uses the real name.",
    );
  }
  if (!emailIsPublic()) {
    issues.push("Set email in content/studio.json to the address buyers should reach.");
  }
  if (!site.domain || site.domain === "yourdomain.com") {
    issues.push("Set domain in content/studio.json to the GoDaddy domain, then reprocess the pictures.");
  }
  if (site.location === "City, State") {
    issues.push("Set location in content/studio.json.");
  }
  if (!site.biography.trim()) {
    issues.push("Write biography in content/studio.json when you want an about paragraph in the artist’s voice.");
  }
  const samples = getWorks().filter((work) => work.sample).length;
  if (samples > 0) {
    issues.push(
      `${samples} sample picture${samples === 1 ? "" : "s"} still on the site. Delete them from content/works.json, content/art-manifest.json, and public/art when the real photographs are in.`,
    );
  }
  if (process.env.VERCEL && !process.env.RESEND_API_KEY) {
    issues.push(
      "This host does not keep a file inbox. Set RESEND_API_KEY and RESEND_FROM so requests are emailed, or buyers will be asked to send the request themselves.",
    );
  }
  return issues;
}

function Checklist({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="mt-8 border border-border bg-secondary/50 p-5">
      <h2 className="font-heading text-2xl italic">Before you share the site</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

async function Inbox() {
  const requests = await readRequests();
  const fresh = requests.filter((request) => request.status === "new").length;

  return (
    <section className="mt-12">
      <h2 className="font-heading text-3xl italic">
        Requests{fresh > 0 ? ` · ${fresh} new` : ""}
      </h2>
      {process.env.VERCEL ? (
        <p className="mt-3 text-sm text-muted-foreground">
          On this host, requests are not kept in a file. Read them in the studio mailbox
          if email delivery is turned on.
        </p>
      ) : null}
      {requests.length === 0 ? (
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          No print requests yet. When someone writes in, the request shows up here.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-6">
          {requests.map((request) => (
            <li key={request.id} className="border border-border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-heading text-2xl italic">{request.id}</h3>
                <Badge variant={request.status === "new" ? "default" : "outline"}>
                  {request.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatWhen(request.createdAt)}</p>
              <p className="mt-4 text-sm">
                {request.buyer.name}
                {" · "}
                <a className="underline underline-offset-4" href={`mailto:${request.buyer.email}?subject=${encodeURIComponent(`Print request ${request.id}`)}`}>
                  {request.buyer.email}
                </a>
                {request.buyer.phone ? ` · ${request.buyer.phone}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.buyer.street}, {request.buyer.city}, {request.buyer.region}{" "}
                {request.buyer.postal}, {request.buyer.country}
              </p>
              <ul className="mt-4 space-y-1 text-sm">
                {request.items.map((item) => (
                  <li key={`${item.slug}-${item.sizeId}`}>
                    {item.qty} × {item.title} — {item.sizeLabel} — {formatMoney(item.unitPrice * item.qty)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm">Prints total {formatMoney(request.total)}</p>
              {request.buyer.notes ? (
                <p className="mt-3 text-sm leading-relaxed">Note: {request.buyer.notes}</p>
              ) : null}
              <form action={setStatus} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={request.id} />
                {nextStatus
                  .filter((entry) => entry.status !== request.status)
                  .map((entry) => (
                    <Button
                      key={entry.status}
                      type="submit"
                      name="status"
                      value={entry.status}
                      variant="outline"
                      className="h-9 bg-background"
                    >
                      {entry.label}
                    </Button>
                  ))}
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
