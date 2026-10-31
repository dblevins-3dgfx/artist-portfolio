# Thomasene Art

A catalog of original paintings. The pictures on the site are reduced, watermarked previews. The full photographs stay in a private folder and are never published.

- [GitHub repository](https://github.com/dblevins-3dgfx/artist-portfolio)
- [Vercel](https://artist-portfolio-mu-snowy.vercel.app/) — the live site, including the studio desk at `/curate`.

The public site does not list availability, prices, print sizes, or a way to order. That keeps it within Vercel’s free Hobby plan, which is for personal, non-commercial projects. The artist’s name, email, and biography live in [`content/studio.json`](content/studio.json).

The front page keeps any painting marked “Show on the front page.” When that does not fill the page, the open spots are a daily selection that changes at midnight in Coeur d’Alene. The work page groups paintings by subject. The groups are the list in [`src/lib/subjects.mjs`](src/lib/subjects.mjs). A group appears once a painting is in it. A painting can have several subjects: the filter buttons show it under each one, and the grouped view lists it once, under the first in that list.

An earlier version of this project had a print-request flow. It is still in the git history. Putting it back on the public site means moving the Vercel project to a paid plan first.

## Run it locally

```bash
npm install
npm run dev
```

## Publish on Vercel

The live site is [https://artist-portfolio-mu-snowy.vercel.app/](https://artist-portfolio-mu-snowy.vercel.app/). It is a normal Next.js app on the Hobby plan. Do not turn on a static export: the studio desk at `/curate` is the one page that runs on the server. The desk is personal use of the site. It can record availability and an original’s price for later, but nothing on the public site shows them and the site takes no orders.

[thomasene.art](https://thomasene.art/) still serves the GoDaddy website builder. The registration can stay at GoDaddy. When that name should open this catalog, add the domain in the Vercel project and copy the DNS records Vercel shows into GoDaddy. Disconnect GoDaddy’s website builder or domain forwarding first, or the old page keeps answering. Do not upload the `originals/` folder.

`siteUrl` in `content/studio.json` is still empty, so the sitemap is empty. Set it to the public address, including `https://`, when that address is the one you want indexed. Then publish again.

## Studio details

[`content/studio.json`](content/studio.json) already has the studio’s name, tagline, location, email, domain, and biography. Those fields are:

- `artistName` — also burned into the watermark
- `location`
- `email` — shown when it contains `@` and does not end in `@example.com`
- `domain` — `thomasene.art`, without `https://`. Also burned into the watermark
- `siteUrl` — still empty. The sitemap uses it once it is a full `https://` address
- `biography` — the about page
- `watermark` — the word drawn across previews (`PREVIEW`)
- `maxPreviewEdge` — longest side of a published preview, in pixels (`1400`)

After the name or domain changes, rebuild the previews so the watermark matches:

```bash
npm run process-images
```

## Studio desk

Open `/curate` on the Vercel address. Thomasene signs in with the studio password, then adds a painting, edits its title, year, medium, surface, size, subjects, note, and “Show on the front page,” or removes it. Each photograph is reduced to a long edge of 1400 pixels, stripped of camera information, and watermarked before it is saved. The original file is discarded after that. It is never written into the repository.

Each painting also has an Availability section: whether the original is Not for sale, Available, or Sold, the original’s price in whole US dollars (needed when Available), and whether prints are offered. These are stored in `content/works.json` as `originalStatus` (`not-for-sale`, `in-studio` for Available, or `sold`), `originalPrice`, and `printsAvailable`. The public pages never read them. This repository is public, so anyone can read those values, prices included, on GitHub.

Each save publishes a new commit, and Vercel rebuilds the catalog from that commit. That suits one painting at a time. For a large batch, use the photograph folder below.

The live desk already uses two Vercel environment variables (Settings → Environment Variables), for Production. A project without them stays locked:

- `STUDIO_PASSWORD` — a long password. This is what she types. It is not stored in the repository.
- `STUDIO_GITHUB_TOKEN` — a GitHub fine-grained personal access token for this repository only, with Contents set to Read and write. The desk uses it to commit the watermarked preview and the catalog. Do not use a token that can see other repositories.

The password is the desk’s main defense, so make it long and random, for example five or more unrelated words or 20+ characters from a password manager. The desk allows 8 wrong tries per 15 minutes from one address, but Vercel runs several copies of the server and each copy keeps its own count, which a restart also clears. Someone determined can get past that limit, so it slows guessing without stopping it. This is a deliberate trade-off. The worst someone with the password could do is change the public catalog, which Git history can restore, so a shared rate-limit store (such as Vercel KV) isn’t worth the extra setup for now.

Also set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (Production and Preview), once, to a random 32-byte value. Make one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Next.js names each desk action by an ID derived from this key. Without it every build picks a new key, so each save’s rebuild gives the actions new IDs, and a desk tab that was already open can no longer save. With a fixed key the IDs stay the same from build to build. If a tab still goes stale (for example after an action is renamed in the code), the desk says so and offers a Reload button. Signing in again is not needed. Changing the key later is harmless, but tabs open at that moment need one reload.

Create the token under GitHub → Settings → Developer settings → Fine-grained tokens. After both values are saved, redeploy the Vercel project so the desk can see them. Optional: `STUDIO_GITHUB_REPO` (default `dblevins-3dgfx/artist-portfolio`) and `STUDIO_GITHUB_BRANCH` (default `main`).

To try the desk on your own computer, put only the password in `.env.local` and run `npm run dev`. Without the token, saves stay in this project’s files and are not published. Do not put the GitHub token in `.env.local` unless you mean to publish to the real catalog.

## Add the photographs

1. Copy the full photographs into `originals/`. JPEG, PNG, TIFF, and WebP are fine, including files in subfolders. This folder is not published and is not committed.
2. Optionally add a sidecar next to a file. `evening-shore.tif` can have `evening-shore.json` with the title, year, medium, and size. The shape is in [`originals/README.md`](originals/README.md).
3. Run `npm run process-images`.

Each photograph becomes a JPEG in `public/art/` whose long edge is at most 1400 pixels. Camera data (including location) is removed. A repeating watermark is drawn across the picture. The script refuses to write a preview if that mark does not actually change the pixels.

The catalog entries are in `content/works.json`. The first run fills them in. Later runs refresh the picture and leave your wording alone. `content/art-manifest.json` records a hash of each preview. `npm run build` checks that every public image is one of those previews, is small enough, and still has no camera data. Dropping a full-resolution file straight into `public/` fails the build.

Remove a picture by deleting its entry in `content/works.json`, its entry in `content/art-manifest.json`, and the file in `public/art/`. The studio desk can do that from the browser.

Keep a private backup of `originals/`. The site cannot reconstruct the full photograph from a preview.

## What the image protection does, and what it does not

A preview is a poor source for a reproduction: it is small, it is compressed, and the watermark repeats across it, including in a crop. Search engines are asked not to index the images. The original file is never placed where the web server can hand it out.

A screenshot is still possible. No website can prevent that. The practical protection is the reduced file plus the watermark, not a lock on right-click.
