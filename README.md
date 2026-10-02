# Artist portfolio

A catalog of original work, with fine-art prints requested by hand.

People browse reduced, watermarked previews, choose a size, and send a request. Nothing is charged on the site. You reply with a total and an invoice, print from the original file on your own computer, and ship it. That matches a studio that does not need an online payment or print lab.

The artist’s name, prices, email, and biography live in [`content/studio.json`](content/studio.json). The eight pictures currently on the site are stand-ins, so the catalog can be tried before any real photographs are added.

## Run it locally

```bash
npm install
npm run dev
```

Open the site. `/studio` is a checklist for the public details. Print requests are not stored there.

## Publish on GitHub Pages

GitHub Pages only serves files. It can publish this catalog. It cannot run a password-protected inbox or save orders on the server, so a print request is an email the visitor sends.

Push this project to a GitHub repository. The workflow in `.github/workflows/pages.yml` builds the static site and deploys it. In the repository settings, set Pages to deploy from GitHub Actions. The public address is `https://<user>.github.io/<repository>/` unless the repository is a user site named `<user>.github.io`.

The GoDaddy name can point at that host later. In GitHub Pages, add the custom domain, then in GoDaddy replace the welcome-page records with the DNS records GitHub shows. Disconnect GoDaddy’s website builder or domain forwarding first, or the old page keeps answering. Do not upload the `originals/` folder.

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

The buyer builds a list in the browser and enters a name, email, and shipping address. Prices come from `content/studio.json`. Card numbers are never requested.

The site then opens an email to the address in `content/studio.json`, with the order written in. The buyer sends that email. You reply with a total and an invoice, print from the original file, and ship it. The website does not keep a copy of the request.

## Point the GoDaddy domain here

The domain registration can stay at GoDaddy. After GitHub Pages is serving the site, add the domain in the Pages settings and copy the DNS records GitHub shows into GoDaddy. Disconnect the domain from the website builder or from domain forwarding first. The old welcome page is replaced when the name points at GitHub Pages.

Set `siteUrl` in `content/studio.json` to the public address, including `https://`, so the sitemap uses it. Then publish again.

## What the image protection does, and what it does not

A preview is a poor source for someone else’s print: it is small, it is compressed, and the watermark repeats across it, including in a crop. Search engines are asked not to index the images. The original file is never placed where the web server can hand it out.

A screenshot is still possible. No website can prevent that. The practical protection for a small studio is the reduced file plus the watermark, not a lock on right-click.

The pages ask search engines not to index the pictures. The request form does not ask for a card number. GitHub Pages does not apply extra security headers to the image files; the protection is the reduced, watermarked file itself.
