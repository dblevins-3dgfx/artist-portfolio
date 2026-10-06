# Originals stay in this folder

The studio desk on the Vercel site (`/curate`) can add one painting at a time. This folder is the way to prepare many photographs at once.

Put the full photographs here (JPEG, PNG, TIFF, or WebP). They can sit in subfolders.

This folder is not published and is not committed to git, except for this note. The website only receives a smaller, watermarked JPEG.

From the project root:

```bash
npm run process-images
```

A file named `evening-shore.tif` becomes the picture `evening-shore`. To set the title and the other details, add `evening-shore.json` beside the photograph before the first run:

```json
{
  "title": "Evening shore",
  "year": 2024,
  "medium": "Oil",
  "surface": "linen",
  "widthIn": 24,
  "heightIn": 18,
  "statement": "One sentence about the picture.",
  "subject": "places",
  "featured": false
}
```

After the first run, edit `content/works.json` for wording. Running the script again refreshes the preview and leaves that wording alone.

Keep a backup of this folder somewhere private. The site cannot reconstruct the full photograph from the published preview.
