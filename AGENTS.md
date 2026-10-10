<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

The public catalog runs without secrets. Install with `npm ci` (Node 22, the same major version as GitHub Actions). Start the dev server with `npm run dev -- --hostname 0.0.0.0 --port 3000`. `npm run lint` and `npm run build` are the checks; `prebuild` verifies the published previews. There is no automated test script. `STUDIO_PASSWORD` is only for signing in at `/curate`. Do not commit `.env*` values or files in `originals/`.
