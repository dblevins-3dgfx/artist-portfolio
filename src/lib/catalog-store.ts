/*
 * Desk orchestration. A save does three jobs that live elsewhere:
 *   renderPreview()  — resize, strip camera data, watermark
 *   parseWorks()     — shared catalog reader
 *   commitGitFiles() — GitHub, or the local disk branch below when no token
 *
 * commitChange reloads the catalog and retries once on a git conflict.
 * The in-memory catalog from the start of the request is not the source of
 * truth; the repo is.
 */
import { createHash } from "crypto";
import { readFile, unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  MANIFEST_PATH,
  WORKS_PATH,
  assertCatalogPath,
  catalogFilePath,
  parseManifest,
  parseWorks,
  serializeManifest,
  serializeWorks,
  type Manifest,
} from "@/lib/catalog";
import { catalogLikeness } from "@/lib/duplicates";
import type { DeskWork, Publishing, WorkFields } from "@/lib/desk";
import { commitGitFiles, isGitConflict, readGitFile, readGitHead } from "@/lib/github-catalog";
import { renderPreview } from "@/lib/preview-image";
import type { Work } from "@/lib/types";

export type { DeskWork, Publishing, WorkFields };

type LoadedCatalog = {
  mode: "github" | "local";
  revision: string;
  works: Work[];
  manifest: Manifest;
  repo: string;
  branch: string;
  parentSha: string | null;
  baseTree: string | null;
};

type FileChange = { path: string; bytes: Buffer | null };

type CatalogChange = {
  message: string;
  works: Work[];
  manifest: Manifest;
  files: FileChange[];
};

export function publishingMode(): Publishing {
  if (process.env.STUDIO_GITHUB_TOKEN?.trim()) return "github";
  if (process.env.VERCEL) return "missing";
  return "local";
}

async function loadLocal(): Promise<LoadedCatalog> {
  const worksText = await readFile(catalogFilePath(WORKS_PATH), "utf8");
  let manifestText = '{"files":{}}';
  try {
    manifestText = await readFile(catalogFilePath(MANIFEST_PATH), "utf8");
  } catch {
    manifestText = '{"files":{}}';
  }
  const revision = createHash("sha256").update(worksText).update(manifestText).digest("hex");
  return {
    mode: "local",
    revision,
    works: parseWorks(JSON.parse(worksText) as unknown),
    manifest: parseManifest(JSON.parse(manifestText) as unknown),
    repo: "",
    branch: "",
    parentSha: null,
    baseTree: null,
  };
}

async function loadGitHub(): Promise<LoadedCatalog> {
  const head = await readGitHead();
  const worksBuffer = await readGitFile(WORKS_PATH, head.parentSha);
  const manifestBuffer = await readGitFile(MANIFEST_PATH, head.parentSha);
  return {
    mode: "github",
    revision: head.parentSha,
    works: parseWorks(worksBuffer ? (JSON.parse(worksBuffer.toString("utf8")) as unknown) : []),
    manifest: parseManifest(
      manifestBuffer ? (JSON.parse(manifestBuffer.toString("utf8")) as unknown) : { files: {} },
    ),
    repo: head.repo,
    branch: head.branch,
    parentSha: head.parentSha,
    baseTree: head.baseTree,
  };
}

export async function loadCatalog() {
  if (process.env.STUDIO_GITHUB_TOKEN?.trim()) return loadGitHub();
  return loadLocal();
}

function previewFor(work: Work, catalog: LoadedCatalog) {
  const file = `${work.slug}.jpg`;
  if (catalog.mode === "github") {
    return `https://raw.githubusercontent.com/${catalog.repo}/${catalog.revision}/public/art/${file}`;
  }
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return `${base}${work.image}?v=${catalog.revision.slice(0, 12)}`;
}

export function toDeskWorks(catalog: LoadedCatalog): DeskWork[] {
  const likeness = catalogLikeness(catalog.works, catalog.manifest);
  return catalog.works.map((work) => ({
    slug: work.slug,
    title: work.title,
    year: work.year,
    medium: work.medium,
    surface: work.surface,
    widthIn: work.widthIn,
    heightIn: work.heightIn,
    statement: work.statement,
    subject: work.subject,
    featured: work.featured,
    previewUrl: previewFor(work, catalog),
    imageWidth: work.imageWidth,
    imageHeight: work.imageHeight,
    duplicateOf: likeness.notes[work.slug] ?? "",
  }));
}

async function readArt(catalog: LoadedCatalog, slug: string) {
  const filePath = `public/art/${slug}.jpg`;
  if (catalog.mode === "github" && catalog.parentSha) {
    return readGitFile(filePath, catalog.parentSha);
  }
  try {
    return await readFile(catalogFilePath(filePath));
  } catch {
    return null;
  }
}

async function persist(catalog: LoadedCatalog, change: CatalogChange) {
  const worksBytes = Buffer.from(serializeWorks(change.works));
  const manifestBytes = Buffer.from(serializeManifest(change.manifest));
  const files = [
    ...change.files,
    { path: WORKS_PATH, bytes: worksBytes },
    { path: MANIFEST_PATH, bytes: manifestBytes },
  ];
  for (const file of files) assertCatalogPath(file.path);

  if (catalog.mode === "local") {
    if (process.env.VERCEL) {
      throw new Error("Add STUDIO_GITHUB_TOKEN in the Vercel project, then redeploy, before saving.");
    }
    for (const file of files) {
      const absolute = catalogFilePath(file.path);
      if (file.bytes === null) {
        await unlink(absolute).catch(() => undefined);
        continue;
      }
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, file.bytes);
    }
    return createHash("sha256").update(worksBytes).digest("hex");
  }

  if (!catalog.parentSha || !catalog.baseTree) {
    throw new Error("The catalog commit could not be found.");
  }
  return commitGitFiles(
    {
      repo: catalog.repo,
      branch: catalog.branch,
      parentSha: catalog.parentSha,
      baseTree: catalog.baseTree,
    },
    change.message,
    files,
  );
}

async function commitChange(build: (catalog: LoadedCatalog) => Promise<CatalogChange>) {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const catalog = await loadCatalog();
    const change = await build(catalog);
    try {
      return await persist(catalog, change);
    } catch (error) {
      last = error;
      if (attempt === 0 && isGitConflict(error)) continue;
      throw error;
    }
  }
  throw last instanceof Error ? last : new Error("The catalog could not be saved.");
}

function friendlySaveError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The catalog could not be saved.";
}

export async function savePainting(
  existingSlug: string,
  fields: WorkFields,
  image: Buffer | null,
): Promise<{ error: string } | { ok: true }> {
  let rendered: Awaited<ReturnType<typeof renderPreview>> | null = null;
  if (image) rendered = await renderPreview(image);

  try {
    await commitChange(async (catalog) => {
      const existing = existingSlug ? catalog.works.find((work) => work.slug === existingSlug) : undefined;
      if (existingSlug && !existing) {
        throw new Error("That painting is no longer in the catalog. Reload the page.");
      }
      if (!existing && !rendered) throw new Error("Choose a photograph to add.");
      const taken = catalog.works.some((work) => work.slug === fields.slug && work.slug !== existingSlug);
      if (taken) {
        throw new Error("Another painting already uses that web name. Change the title or the web name.");
      }

      const files: FileChange[] = [];
      const manifest: Manifest = { files: { ...catalog.manifest.files } };
      let imageWidth = existing?.imageWidth ?? 0;
      let imageHeight = existing?.imageHeight ?? 0;

      if (rendered) {
        files.push({ path: `public/art/${fields.slug}.jpg`, bytes: rendered.buffer });
        manifest.files[`${fields.slug}.jpg`] = {
          width: rendered.width,
          height: rendered.height,
          sha256: rendered.sha256,
          fingerprint: rendered.fingerprint,
        };
        imageWidth = rendered.width;
        imageHeight = rendered.height;
        if (existing && existing.slug !== fields.slug) {
          delete manifest.files[`${existing.slug}.jpg`];
          files.push({ path: `public/art/${existing.slug}.jpg`, bytes: null });
        }
      } else if (existing && existing.slug !== fields.slug) {
        const current = await readArt(catalog, existing.slug);
        if (!current) {
          throw new Error("The current preview is missing. Choose the photograph again before changing the web name.");
        }
        const previous = manifest.files[`${existing.slug}.jpg`];
        files.push({ path: `public/art/${fields.slug}.jpg`, bytes: current });
        manifest.files[`${fields.slug}.jpg`] = previous || {
          width: existing.imageWidth,
          height: existing.imageHeight,
          sha256: createHash("sha256").update(current).digest("hex"),
        };
        delete manifest.files[`${existing.slug}.jpg`];
        files.push({ path: `public/art/${existing.slug}.jpg`, bytes: null });
      }

      const next: Work = {
        title: fields.title,
        year: fields.year,
        medium: fields.medium,
        surface: fields.surface,
        widthIn: fields.widthIn,
        heightIn: fields.heightIn,
        statement: fields.statement,
        subject: fields.subject,
        featured: fields.featured,
        originalStatus: existing?.originalStatus ?? "not-for-sale",
        printsAvailable: existing?.printsAvailable ?? false,
        slug: fields.slug,
        image: `/art/${fields.slug}.jpg`,
        imageWidth,
        imageHeight,
      };
      const works = existing
        ? catalog.works.map((work) => (work.slug === existing.slug ? next : work))
        : [...catalog.works, next];
      const verb = existing ? "Update" : "Add";
      return {
        message: `${verb} "${fields.title.replace(/\s+/g, " ").slice(0, 80)}" from the studio desk`,
        works,
        manifest,
        files,
      };
    });
  } catch (error) {
    return { error: friendlySaveError(error) };
  }
  return { ok: true as const };
}

export async function removePainting(existingSlug: string): Promise<{ error: string } | { ok: true }> {
  try {
    await commitChange(async (catalog) => {
      const existing = catalog.works.find((work) => work.slug === existingSlug);
      if (!existing) throw new Error("That painting is no longer in the catalog. Reload the page.");
      const works = catalog.works.filter((work) => work.slug !== existingSlug);
      const manifest: Manifest = { files: { ...catalog.manifest.files } };
      const files: FileChange[] = [];
      const filename = `${existing.slug}.jpg`;
      if (!works.some((work) => work.image === `/art/${filename}`)) {
        delete manifest.files[filename];
        files.push({ path: `public/art/${filename}`, bytes: null });
      }
      return {
        message: `Remove "${existing.title.replace(/\s+/g, " ").slice(0, 80)}" from the studio desk`,
        works,
        manifest,
        files,
      };
    });
  } catch (error) {
    return { error: friendlySaveError(error) };
  }
  return { ok: true as const };
}
