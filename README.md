# Artist portfolio

A catalog of original work. People look through reduced, watermarked previews. The full photographs stay in a private folder and are never published.

The public site does not list prices, print sizes, or a way to order. That keeps it within Vercel’s free Hobby plan, which is for personal, non-commercial projects. The artist’s name, email, and biography live in [`content/studio.json`](content/studio.json). The eight pictures currently on the site are stand-ins, so the catalog can be tried before any real photographs are added.

An earlier version of this project had a print-request flow. It is still in the git history. Putting it back on the public site means moving the Vercel project to a paid plan first.

## Run it locally

```bash
npm install
npm run dev
```

## Publish on Vercel

The site is a static Next.js export. Import the GitHub repository into a Hobby project, leave `BASE_PATH` unset, and use the `vercel.app` address Vercel assigns. That address is enough to look through the catalog. The GoDaddy registration and the current welcome page can stay as they are until you decide the public name should point here.

When that day comes, add the domain in the Vercel project and copy the DNS records Vercel shows into GoDaddy. Disconnect GoDaddy’s website builder or domain forwarding first, or the old page keeps answering. The registration can stay at GoDaddy. Do not upload the `originals/` folder.

Set `siteUrl` in `content/studio.json` to the public address, including `https://`, so the sitemap uses it. Then publish again.

## Publish on GitHub Pages

Pushing to `main` also runs `.github/workflows/pages.yml`, which builds the same static site for GitHub Pages. In the repository settings, Pages deploys from GitHub Actions. The public address is `https://<user>.github.io/<repository>/` unless the repository is a user site named `<user>.github.io`. The workflow sets `BASE_PATH` for that project-site prefix. Leave `BASE_PATH` empty on Vercel.

## Put the studio’s name on it

In `content/studio.json`, replace:

- `artistName` — also burned into the watermark
- `location`
- `email` — shown on the about page once it is a real address
- `domain` — the GoDaddy domain, without `https://`
- `siteUrl` — full address once the site is public, such as `https://yourdomain.com`
- `biography` — a short paragraph in the artist’s voice; leave it blank until then

After the name or domain changes, rebuild the previews so the watermark matches:

```bash
npm run process-images
```

## Add the photographs

1. Copy the full photographs into `originals/`. JPEG, PNG, TIFF, and WebP are fine, including files in subfolders. This folder is not published and is not committed.
2. Optionally add a sidecar next to a file. `evening-shore.tif` can have `evening-shore.json` with the title, year, medium, and size. The shape is in [`originals/README.md`](originals/README.md).
3. Run `npm run process-images`.

Each photograph becomes a JPEG in `public/art/` whose long edge is at most 1400 pixels. Camera data (including location) is removed. A repeating watermark is drawn across the picture. The script refuses to write a preview if that mark does not actually change the pixels.

The catalog entries are in `content/works.json`. The first run fills them in. Later runs refresh the picture and leave your wording alone. `content/art-manifest.json` records a hash of each preview. `npm run build` checks that every public image is one of those previews, is small enough, and still has no camera data. Dropping a full-resolution file straight into `public/` fails the build.

Remove a sample, or any picture, by deleting its entry in `content/works.json`, its entry in `content/art-manifest.json`, and the file in `public/art/`.

Keep a private backup of `originals/`. The site cannot reconstruct the full photograph from a preview.

## What the image protection does, and what it does not

A preview is a poor source for a reproduction: it is small, it is compressed, and the watermark repeats across it, including in a crop. Search engines are asked not to index the images. The original file is never placed where the web server can hand it out.

A screenshot is still possible. No website can prevent that. The practical protection is the reduced file plus the watermark, not a lock on right-click.
