# Thomasene Art

A catalog of original paintings. The pictures on the site are reduced, watermarked previews. The full photographs stay in a private folder and are never published.

- [GitHub repository](https://github.com/dblevins-3dgfx/artist-portfolio)
- [GitHub Pages](https://dblevins-3dgfx.github.io/artist-portfolio/) — static catalog. `/curate` on this copy only points to the Vercel desk.
- [Vercel](https://artist-portfolio-mu-snowy.vercel.app/) — the live site, including the studio desk at `/curate`.

The public site does not list prices, print sizes, or a way to order. That keeps it within Vercel’s free Hobby plan, which is for personal, non-commercial projects. The artist’s name, email, and biography live in [`content/studio.json`](content/studio.json).

The front page keeps any painting marked “Show on the front page.” When that does not fill the page, the open spots are a daily selection that changes at midnight in Coeur d’Alene. The work page groups paintings by subject: Children, Animals, Places, Birds & Flowers, Still Life, or Portraits. A group appears once a painting is in it.

An earlier version of this project had a print-request flow. It is still in the git history. Putting it back on the public site means moving the Vercel project to a paid plan first.

## Run it locally

```bash
npm install
npm run dev
```

## Publish on Vercel

The live site is [https://artist-portfolio-mu-snowy.vercel.app/](https://artist-portfolio-mu-snowy.vercel.app/). It is a normal Next.js app on the Hobby plan. Leave `BASE_PATH` unset. Do not turn on a static export: the studio desk at `/curate` is the one page that runs on the server. The desk is personal use of the site. It does not list prices or take orders.

[thomasene.art](https://thomasene.art/) still serves the GoDaddy website builder. The registration can stay at GoDaddy. When that name should open this catalog, add the domain in the Vercel project and copy the DNS records Vercel shows into GoDaddy. Disconnect GoDaddy’s website builder or domain forwarding first, or the old page keeps answering. Do not upload the `originals/` folder.

`siteUrl` in `content/studio.json` is still empty, so the sitemap is empty. Set it to the public address, including `https://`, when that address is the one you want indexed. Then publish again.

## Publish on GitHub Pages

Pushing to `main` also runs `.github/workflows/pages.yml`, which builds a static copy. The published address is [https://dblevins-3dgfx.github.io/artist-portfolio/](https://dblevins-3dgfx.github.io/artist-portfolio/). Pages deploys from GitHub Actions. The workflow sets `BASE_PATH` to `/artist-portfolio` because this is a project site, not a user site named `<user>.github.io`. Leave `BASE_PATH` empty on Vercel.

GitHub Pages cannot check a password or accept an upload. On that copy, `/curate` only explains that the working desk is the Vercel address. The front-page selection on Pages is the set from the last build, not a new set each day.

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

Open `/curate` on the Vercel address. Thomasene signs in with the studio password, then adds a painting, edits its title, year, medium, surface, size, subject, note, and “Show on the front page,” or removes it. Each photograph is reduced to a long edge of 1400 pixels, stripped of camera information, and watermarked before it is saved. The original file is discarded after that. It is never written into the repository.

Each save publishes a new commit, and Vercel rebuilds the catalog from that commit. That suits one painting at a time. For a large batch, use the photograph folder below.

The live desk already uses two Vercel environment variables (Settings → Environment Variables), for Production. A project without them stays locked:

- `STUDIO_PASSWORD` — a long password. This is what she types. It is not stored in the repository.
- `STUDIO_GITHUB_TOKEN` — a GitHub fine-grained personal access token for this repository only, with Contents set to Read and write. The desk uses it to commit the watermarked preview and the catalog. Do not use a token that can see other repositories.

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
