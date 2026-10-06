import { createHash } from "crypto";
import { readFile, unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { DeskWork, Publishing, WorkFields } from "@/lib/desk";
import { renderPreview } from "@/lib/preview-image";
import type { OriginalStatus, Work } from "@/lib/types";

export type { DeskWork, Publishing, WorkFields };

const WORKS_PATH = "content/works.json";
const MANIFEST_PATH = "content/art-manifest.json";
const DEFAULT_REPO = "dblevins-3dgfx/artist-portfolio";

type ManifestFile = { width: number; height: number; sha256: string };
type Manifest = { files: Record<string, ManifestFile> };

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


const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function publishingMode(): Publishing {
  if (process.env.STUDIO_GITHUB_TOKEN?.trim()) return "github";
  if (process.env.VERCEL) return "missing";
  return "local";
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function repoCoordinates() {
  const repo = (process.env.STUDIO_GITHUB_REPO || DEFAULT_REPO).trim();
  const branch = (process.env.STUDIO_GITHUB_BRANCH || "main").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("STUDIO_GITHUB_REPO should look like owner/repository.");
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    throw new Error("STUDIO_GITHUB_BRANCH is not a branch name.");
  }
  return { repo, branch };
}

function assertSafePath(filePath: string) {
  const allowed =
    filePath === WORKS_PATH ||
    filePath === MANIFEST_PATH ||
    /^public\/art\/[a-z0-9-]+\.jpg$/.test(filePath);
  if (!allowed) throw new Error("Refusing to write that file.");
}

class GitHubError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function github(pathname: string, init?: RequestInit) {
  const token = process.env.STUDIO_GITHUB_TOKEN?.trim();
  if (!token) throw new Error("STUDIO_GITHUB_TOKEN is not set.");
  const { repo } = repoCoordinates();
  const response = await fetch(`https://api.github.com/repos/${repo}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "thomasene-art-studio-desk",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    const safe = text.replaceAll(token, "[redacted]").slice(0, 280);
    throw new GitHubError(response.status, `GitHub responded ${response.status}. ${safe}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function decodeContent(payload: Record<string, unknown>) {
  const content = typeof payload.content === "string" ? payload.content : "";
  const encoding = payload.encoding;
  if (encoding !== "base64" || !content) {
    throw new Error("GitHub did not return the catalog file.");
  }
  return Buffer.from(content.replace(/\s/g, ""), "base64");
}

async function readRepoFile(filePath: string, ref: string) {
  assertSafePath(filePath);
  try {
    const payload = await github(`/contents/${filePath}?ref=${encodeURIComponent(ref)}`);
    return decodeContent(payload);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseWorks(text: string): Work[] {
  const value = JSON.parse(text) as unknown;
  if (!Array.isArray(value)) throw new Error("The catalog is not a list.");
  return value.map((entry, index) => {
    const record = asRecord(entry);
    if (!record || typeof record.slug !== "string" || !SLUG.test(record.slug)) {
      throw new Error(`Catalog entry ${index + 1} has no usable web name.`);
    }
    const status = record.originalStatus;
    const originalStatus: OriginalStatus =
      status === "sold" || status === "in-studio" || status === "not-for-sale" ? status : "not-for-sale";
    return {
      title: typeof record.title === "string" ? record.title : record.slug,
      year: typeof record.year === "number" ? record.year : new Date().getFullYear(),
      medium: typeof record.medium === "string" ? record.medium : "",
      surface: typeof record.surface === "string" ? record.surface : "",
      widthIn: typeof record.widthIn === "number" ? record.widthIn : 0,
      heightIn: typeof record.heightIn === "number" ? record.heightIn : 0,
      statement: typeof record.statement === "string" ? record.statement : "",
      featured: record.featured === true,
      originalStatus,
      printsAvailable: record.printsAvailable === true,
      sample: record.sample === true,
      slug: record.slug,
      image: `/art/${record.slug}.jpg`,
      imageWidth: typeof record.imageWidth === "number" ? record.imageWidth : 0,
      imageHeight: typeof record.imageHeight === "number" ? record.imageHeight : 0,
    };
  });
}

function parseManifest(text: string): Manifest {
  const value = asRecord(JSON.parse(text) as unknown);
  const files = asRecord(value?.files) || {};
  const manifest: Manifest = { files: {} };
  for (const [name, entry] of Object.entries(files)) {
    const record = asRecord(entry);
    if (!record || typeof record.sha256 !== "string") continue;
    manifest.files[name] = {
      width: typeof record.width === "number" ? record.width : 0,
      height: typeof record.height === "number" ? record.height : 0,
      sha256: record.sha256,
    };
  }
  return manifest;
}

function serializeWorks(works: Work[]) {
  return `${JSON.stringify(
    works.map((work) => ({
      title: work.title,
      year: work.year,
      medium: work.medium,
      surface: work.surface,
      widthIn: work.widthIn,
      heightIn: work.heightIn,
      statement: work.statement,
      featured: work.featured,
      originalStatus: work.originalStatus,
      printsAvailable: work.printsAvailable,
      sample: work.sample,
      slug: work.slug,
      image: work.image,
      imageWidth: work.imageWidth,
      imageHeight: work.imageHeight,
    })),
    null,
    2,
  )}\n`;
}

function serializeManifest(manifest: Manifest) {
  const files: Manifest["files"] = {};
  for (const name of Object.keys(manifest.files).sort()) files[name] = manifest.files[name];
  return `${JSON.stringify({ files }, null, 2)}\n`;
}

function projectPath(filePath: string) {
  assertSafePath(filePath);
  if (filePath === WORKS_PATH) return path.join(process.cwd(), "content", "works.json");
  if (filePath === MANIFEST_PATH) return path.join(process.cwd(), "content", "art-manifest.json");
  const name = filePath.slice("public/art/".length);
  if (!/^[a-z0-9-]+\.jpg$/.test(name)) throw new Error("Refusing to write that file.");
  return path.join(process.cwd(), "public", "art", name);
}

async function loadLocal(): Promise<LoadedCatalog> {
  const worksText = await readFile(projectPath(WORKS_PATH), "utf8");
  let manifestText = '{"files":{}}';
  try {
    manifestText = await readFile(projectPath(MANIFEST_PATH), "utf8");
  } catch {
    manifestText = '{"files":{}}';
  }
  const revision = createHash("sha256").update(worksText).update(manifestText).digest("hex");
  return {
    mode: "local",
    revision,
    works: parseWorks(worksText),
    manifest: parseManifest(manifestText),
    repo: "",
    branch: "",
    parentSha: null,
    baseTree: null,
  };
}

async function loadGitHub(): Promise<LoadedCatalog> {
  const { repo, branch } = repoCoordinates();
  const ref = await github(`/git/ref/heads/${branch}`);
  const object = asRecord(ref.object);
  const parentSha = typeof object?.sha === "string" ? object.sha : "";
  if (!parentSha) throw new Error("GitHub did not return the latest catalog commit.");
  const commit = await github(`/git/commits/${parentSha}`);
  const tree = asRecord(commit.tree);
  const baseTree = typeof tree?.sha === "string" ? tree.sha : "";
  if (!baseTree) throw new Error("GitHub did not return the catalog tree.");
  const worksBuffer = await readRepoFile(WORKS_PATH, parentSha);
  const manifestBuffer = await readRepoFile(MANIFEST_PATH, parentSha);
  return {
    mode: "github",
    revision: parentSha,
    works: parseWorks(worksBuffer ? worksBuffer.toString("utf8") : "[]"),
    manifest: parseManifest(manifestBuffer ? manifestBuffer.toString("utf8") : '{"files":{}}'),
    repo,
    branch,
    parentSha,
    baseTree,
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
  return catalog.works.map((work) => ({
    slug: work.slug,
    title: work.title,
    year: work.year,
    medium: work.medium,
    surface: work.surface,
    widthIn: work.widthIn,
    heightIn: work.heightIn,
    statement: work.statement,
    featured: work.featured,
    previewUrl: previewFor(work, catalog),
    imageWidth: work.imageWidth,
    imageHeight: work.imageHeight,
  }));
}

function textField(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

function inches(value: string) {
  if (!value) return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 200) return null;
  return number;
}

export function readWorkForm(
  formData: FormData,
):
  | { error: string }
  | { intent: "delete"; existingSlug: string }
  | { intent: "save"; existingSlug: string; fields: WorkFields } {
  const existingSlug = textField(formData, "existingSlug", 80);
  if (existingSlug && !SLUG.test(existingSlug)) {
    return { error: "That painting’s web name is not valid. Reload the page." };
  }
  const intent = formData.get("intent") === "delete" ? "delete" : "save";
  if (intent === "delete") {
    if (!existingSlug) return { error: "Choose a painting already in the catalog." };
    return { intent: "delete" as const, existingSlug };
  }

  const title = textField(formData, "title", 120).replace(/\s+/g, " ").trim();
  if (!title) return { error: "Give the painting a title." };
  const yearText = textField(formData, "year", 4);
  if (!/^\d{4}$/.test(yearText)) return { error: "Enter the year as four digits." };
  const year = Number(yearText);
  if (year < 1800 || year > 2100) return { error: "Enter a year between 1800 and 2100." };
  const medium = textField(formData, "medium", 80).replace(/\s+/g, " ").trim();
  const surface = textField(formData, "surface", 80).replace(/\s+/g, " ").trim();
  const widthIn = inches(textField(formData, "widthIn", 8));
  const heightIn = inches(textField(formData, "heightIn", 8));
  if (widthIn === null || heightIn === null) {
    return { error: "Enter the size in inches, or leave both blank." };
  }
  const statement = textField(formData, "statement", 2000);
  const requested = textField(formData, "slug", 80);
  const slug = requested || slugify(title);
  if (!SLUG.test(slug)) {
    return { error: "The web name needs letters or numbers. You can leave it blank and it will be taken from the title." };
  }
  const fields: WorkFields = {
    slug,
    title,
    year,
    medium,
    surface,
    widthIn,
    heightIn,
    statement,
    featured: formData.get("featured") === "on",
  };
  return { intent: "save" as const, existingSlug, fields };
}

async function readArt(catalog: LoadedCatalog, slug: string) {
  const filePath = `public/art/${slug}.jpg`;
  if (catalog.mode === "github" && catalog.parentSha) {
    return readRepoFile(filePath, catalog.parentSha);
  }
  try {
    return await readFile(projectPath(filePath));
  } catch {
    return null;
  }
}

function isConflict(error: unknown) {
  return error instanceof GitHubError && (error.status === 422 || error.status === 409);
}

async function persist(catalog: LoadedCatalog, change: CatalogChange) {
  const worksBytes = Buffer.from(serializeWorks(change.works));
  const manifestBytes = Buffer.from(serializeManifest(change.manifest));
  const files = [
    ...change.files,
    { path: WORKS_PATH, bytes: worksBytes },
    { path: MANIFEST_PATH, bytes: manifestBytes },
  ];
  for (const file of files) assertSafePath(file.path);

  if (catalog.mode === "local") {
    if (process.env.VERCEL) {
      throw new Error("Add STUDIO_GITHUB_TOKEN in the Vercel project, then redeploy, before saving.");
    }
    for (const file of files) {
      const absolute = projectPath(file.path);
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
  const treeEntries = [];
  for (const file of files) {
    if (file.bytes === null) {
      treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const blob = await github("/git/blobs", {
      method: "POST",
      body: JSON.stringify({ content: file.bytes.toString("base64"), encoding: "base64" }),
    });
    const sha = typeof blob.sha === "string" ? blob.sha : "";
    if (!sha) throw new Error("GitHub did not store one of the catalog files.");
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha });
  }
  const tree = await github("/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: catalog.baseTree, tree: treeEntries }),
  });
  const treeSha = typeof tree.sha === "string" ? tree.sha : "";
  if (!treeSha) throw new Error("GitHub did not create the catalog update.");
  const commit = await github("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message: change.message,
      tree: treeSha,
      parents: [catalog.parentSha],
      author: { name: "Studio desk", email: "studio-desk@thomasene.art" },
    }),
  });
  const commitSha = typeof commit.sha === "string" ? commit.sha : "";
  if (!commitSha) throw new Error("GitHub did not create the catalog commit.");
  await github(`/git/refs/heads/${catalog.branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
  return commitSha;
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
      if (attempt === 0 && isConflict(error)) continue;
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
        featured: fields.featured,
        originalStatus: existing?.originalStatus ?? "not-for-sale",
        printsAvailable: existing?.printsAvailable ?? false,
        sample: rendered ? false : (existing?.sample ?? false),
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

export async function imageFromForm(
  formData: FormData,
): Promise<{ error: string } | { bytes: Buffer | null }> {
  const value = formData.get("image");
  if (!(value instanceof File) || value.size === 0) return { bytes: null as Buffer | null };
  if (value.size > 20 * 1024 * 1024) {
    return { error: "That photograph is over 20 MB. Export a smaller file and try again." };
  }
  return { bytes: Buffer.from(await value.arrayBuffer()) };
}
