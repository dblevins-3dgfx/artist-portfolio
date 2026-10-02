# Artist portfolio

A catalog of original work, with fine-art prints requested by hand.

People browse reduced, watermarked previews, choose a size, and send a request. Nothing is charged on the site. You reply with a total and an invoice, print from the original file on your own computer, and ship it. That matches a studio that does not need an online payment or print lab.

The artist’s name, prices, email, and biography live in [`content/studio.json`](content/studio.json). The eight pictures currently on the site are stand-ins, so the catalog can be tried before any real photographs are added.

## Run it locally

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and set `STUDIO_PASSWORD` to at least 12 characters. Then:

```bash
npm run dev
```

Open the site, and open `/studio` for the desk where print requests are listed.

## Put the studio’s name on it

In `content/studio.json`, replace:

- `artistName` — also burned into the watermark
- `location`
- `email` — the address buyers should use
- `domain` — the GoDaddy domain, without `https://`
- `siteUrl` — full address once the site is public, such as `https://yourdomain.com`
- `biography` — a short paragraph in the artist’s voice; leave it blank until then
- `prints` — sizes and prices
- `paper`, `turnaround`, `shippingNote`, `paymentNote`

After the name or domain changes, rebuild the previews so the watermark matches:

```bash
npm run process-images
```

## Add the photographs

1. Copy print-ready files into `originals/`. JPEG, PNG, TIFF, and WebP are fine, including files in subfolders. This folder is not published and is not committed.
2. Optionally add a sidecar next to a file. `evening-shore.tif` can have `evening-shore.json` with the title, year, medium, and size. The shape is in [`originals/README.md`](originals/README.md).
3. Run `npm run process-images`.

Each original becomes a JPEG in `public/art/` whose long edge is at most 1400 pixels. Camera data (including location) is removed. A repeating watermark is drawn across the picture. The script refuses to write a preview if that mark does not actually change the pixels.

The catalog entries are in `content/works.json`. The first run fills them in. Later runs refresh the picture and leave your wording alone. `content/art-manifest.json` records a hash of each preview. `npm run build` checks that every public image is one of those previews, is small enough, and still has no camera data. Dropping a full-resolution file straight into `public/` fails the build.

Remove a sample, or any picture, by deleting its entry in `content/works.json`, its entry in `content/art-manifest.json`, and the file in `public/art/`.

Keep a private backup of `originals/`. The site cannot reconstruct a print from a preview.

## How a print request works

The buyer builds a list in the browser and sends a name, email, and shipping address. Prices are recalculated on the server from `content/studio.json`. Card numbers are never requested.

On a normal Node server, the request is saved in `data/requests.json` (also not committed) and shows up at `/studio`. Sign in with `STUDIO_PASSWORD`, reply from your own email, then mark the request confirmed, shipped, or closed. Those marks are reminders for you. They do not email the buyer or talk to a printer.

If you publish on Vercel, the disk does not keep that file. Set these environment variables on the host so each request is emailed instead:

- `STUDIO_PASSWORD`
- `STUDIO_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM` — a sender on a domain you have verified with [Resend](https://resend.com), such as `Studio <prints@yourdomain.com>`

Until email is configured on that kind of host, the buyer is given the request text and a button that opens their own mail program, so the order is not thrown away.

## Point the GoDaddy domain here

The domain registration can stay at GoDaddy. GoDaddy’s welcome page is only the current host. This app needs a host that runs Next.js. Publishing to Vercel is the straightforward one: use the Publish button, then add the domain in that host’s project settings and copy the DNS records it shows into GoDaddy’s DNS manager.

In GoDaddy, disconnect the domain from the website builder or from domain forwarding first. Otherwise the old welcome page keeps answering even after you edit records. You are changing where the name points, not giving up the name. The old page is replaced when the name points at the new host.

Do not upload the `originals/` folder to GoDaddy, and do not turn the previews back into full-size files to “make the prints look better” online. The print file stays on your computer.

Set `siteUrl` in `content/studio.json` to the public address after the domain works, so the sitemap uses it.

## What the image protection does, and what it does not

A preview is a poor source for someone else’s print: it is small, it is compressed, and the watermark repeats across it, including in a crop. Search engines are asked not to index the images. The original file is never placed where the web server can hand it out.

A screenshot is still possible. No website can prevent that. The practical protection for a small studio is the reduced file plus the watermark, not a lock on right-click.

Also in place:

- The studio desk is password protected, and the password is compared in a way that does not leak it. A short or placeholder password does not unlock the desk.
- Sign-in attempts and print requests are rate limited.
- Security headers are set, including `noimageindex` on the preview files.
- The request form does not ask for a card number.

Change `STUDIO_PASSWORD` before anyone else can open the site. Do not reuse a password from email or banking.
