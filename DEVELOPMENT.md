# Development notes

Working knowledge for whoever (person or AI assistant) picks up this repository next. It covers what is **not** already in [`README.md`](README.md) (setup, the studio desk, Vercel settings, image protection), [`AGENTS.md`](AGENTS.md) (read the bundled Next.js docs first), [`.cursor/rules/standing-orders.mdc`](.cursor/rules/standing-orders.mdc) (how to work), or the comments at the top of each source file, which explain most design choices in detail.

## How changes are made

- One GitHub issue per change. Work happens on a branch per issue (for example `claude/issue-131-desk-home-screen`), and the pull request body starts with `Fixes #N` so merging closes the issue.
- The owner reviews and merges every PR. Nothing is committed, pushed, or opened as a PR until the owner asks (standing orders).
- PR descriptions list what changed, the checks that were run, and anything not verified, such as "not tested on a real iPhone".
- Releases are GitHub releases made in the web UI. `v1.0.0` is the public launch (22 November 2026), tagged on the merge of #132.

## Checks

CI (`.github/workflows/checks.yml`) runs `lint`, `format:check`, `typecheck` and `test`. **It does not run `npm run build`**; only Vercel does, on every push. Run the build locally before opening a PR that touches pages, metadata, images or `next.config.ts`. `prebuild` also runs the public image check.

- Prettier formats Markdown too, so run `npm run format:check` after editing any `.md` file.
- ESLint enforces a cyclomatic `complexity` limit of 21 per function. When a form or save function grows past it, pull a helper out (see `readSeries`, `keepExtra`, `AvailabilityFields`) rather than raising the limit.
- ESLint forbids `alert`, `confirm` and `prompt` (`no-alert`). iPhone Safari silently skipped a `confirm()` box, so Remove did nothing (#111). Ask on the page instead (`LeavePrompt`, `PendingButtons` in `components/desk/form.tsx`).

## Trying the desk locally

```bash
npm run build
STUDIO_PASSWORD=local-test-password npx next start -p 3456
```

Without `STUDIO_GITHUB_TOKEN`, desk saves write straight into `content/` and `public/art/`. After testing, undo them with `git checkout -- content public/art`, or they will end up in a commit. A browser test script (Playwright) has to accept the "leave page?" dialog that an unsaved form raises on reload. It should also match exact text, because Playwright's text match ignores case.

## The live catalog is edited from two places

The artist's desk commits to `main` directly (`content/works.json`, `content/art-manifest.json`, `public/art/`, and `content/venues.json` or `content/print-prices.json`). A PR that edits those files can clash with her next save. When a PR must change catalog content:

- Merge `main` into the branch just before merging, and merge it promptly.
- Prefer asking her to make catalog edits on the desk herself.

A desk tab left open across a deploy runs the old code. Two guards cover this:

- `lib/stale-page.ts` turns the stale-action error into a "Reload" message.
- `parseWorks` and `parseManifest` keep fields they don't recognise in `extra` and write them back (#122). An older build can't drop a newer field, such as `series`, on save. Losing the 27 series assignments to a stale save is what prompted this.

Catalog text uses curly typography (’ “ ”). Some odd spellings are intentional and must not be "corrected": "Mooove Over", "CleoCatra", "Goin’", "Strummin’", "Two Point Five Pairs of Pears", "Yee Haw!". `content/` is excluded from Prettier because the desk writes it with `JSON.stringify`.

## Next.js and platform gotchas

- **`trailingSlash: true`** redirects any address without a file extension to one with a trailing slash. That broke Next's `opengraph-image` metadata route: link-preview fetchers don't all follow the 308. Routes that crawlers or phones fetch directly are therefore route handlers named like files: `app/social-card.png/route.tsx` and `app/curate/manifest.webmanifest/route.ts`. Compare URLs with the trailing slash in tests and scripts.
- **iPhone Home Screen icons** open the manifest's `start_url`, not the page they were added from. The desk links its own manifest from `app/curate/layout.tsx` (#131), so its icon opens `/curate/`.
- **`ImageResponse` (`next/og`)** needs TTF or OTF fonts (no woff2), and every text element needs an explicit `fontFamily`. The card reads `assets/fonts/*.ttf` at build time. The site loads the same Great Vibes script through `next/font/google`, which serves a small woff2, so the 360 KB TTF is used only for the card.
- **Vercel Hobby plan:** personal and non-commercial only. Nothing public may show prices, availability or ordering (see README). Open issues #38 (show availability) and #40 (email sign-up) may need a paid plan first. Decide that before building them.
- **Server Action IDs** stay stable across builds only because `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is set in Vercel (README). Don't remove it.

## Brand and design decisions

| Item | Decision | Where |
| --- | --- | --- |
| Artist name | "Thomasene" (first name only) as the person, "Thomasene Art" as the studio/brand | `content/studio.json` (`firstName`, `artistName`) |
| Tagline | "Small moments, painted with love" (#136) | `content/studio.json` |
| Fonts | Fraunces (headings, italic), Outfit (body), Great Vibes (tagline only, #138) | `app/layout.tsx`, `app/globals.css` |
| Monogram | Her "tb" mark, traced once. The header, browser icon and card share it. If the tracing changes, change both copies. | `components/signature-mark.tsx`, `app/icon.svg` |
| Link-preview card | 1200 × 630, *Rain, Rain Go Away!*, "tb" + name in Liberation Serif 78 pt, tagline in Great Vibes 92 pt on two lines (#43) | `app/social-card.png/route.tsx` (`CARD_SLUG`) |
| Card colours | `#f6f2ea` background, `#271d16` ink, `#7e3124` accent, `#61554e` muted: hex versions of the `oklch` tokens in `globals.css` | same file |
| About portrait | Cropped head and shoulders, 690 × 862, camera data stripped (#134). The uncropped original isn't in the repo. | `public/studio/thomasene.jpg` |

Painting titles: the artist likes puns and gentle wordplay ("Pitcher Perfect", "Got Carrots?"). Suggest a mix of playful, descriptive and mood titles.

## Search and analytics

- Structured data (#45): each painting page is a schema.org `VisualArtwork`, and About is a `Person`. Check them with the **Schema Markup Validator** (validator.schema.org). Google's Rich Results Test says "No rich results" for these types even when they're correct.
- Google Search Console is set up as a **Domain** property (covers `www.` too), with `https://thomasene.art/sitemap.xml` submitted.
- Vercel Web Analytics is on. Views from the desk, and from any browser that has signed in to the desk, aren't counted (`components/site-analytics.tsx`).
- To check link previews, use opengraph.xyz or paste the link into a text message. Apps cache previews for a while.

## Things to watch for

- Outside accounts have posted promotional PRs and comments (#52, and a comment on #43 that falsely claimed the work was done, promoting a paid image service). Verify any claim against `main` before trusting it.
- Some sandboxed environments can't reach thomasene.art or `*.vercel.app`. Check live pages through the Vercel preview link on the PR, or ask the owner to look.

## Open issues (as of v1.0.0)

#35 lighter watermark · #38 show availability · #39 social links · #40 email sign-up · #41 exhibitions section. None is started. #38 and #40 depend on the plan question above.
