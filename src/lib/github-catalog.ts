import { assertCatalogPath } from "@/lib/catalog";

const DEFAULT_REPO = "dblevins-3dgfx/artist-portfolio";

export type GitHead = {
  repo: string;
  branch: string;
  parentSha: string;
  baseTree: string;
};

export type GitFile = { path: string; bytes: Buffer | null };

export class GitHubError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isGitConflict(error: unknown) {
  return error instanceof GitHubError && (error.status === 422 || error.status === 409);
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
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

export async function readGitHead(): Promise<GitHead> {
  const { repo, branch } = repoCoordinates();
  const ref = await github(`/git/ref/heads/${branch}`);
  const object = asRecord(ref.object);
  const parentSha = typeof object?.sha === "string" ? object.sha : "";
  if (!parentSha) throw new Error("GitHub did not return the latest catalog commit.");
  const commit = await github(`/git/commits/${parentSha}`);
  const tree = asRecord(commit.tree);
  const baseTree = typeof tree?.sha === "string" ? tree.sha : "";
  if (!baseTree) throw new Error("GitHub did not return the catalog tree.");
  return { repo, branch, parentSha, baseTree };
}

export async function readGitFile(filePath: string, ref: string) {
  assertCatalogPath(filePath);
  try {
    const payload = await github(`/contents/${filePath}?ref=${encodeURIComponent(ref)}`);
    return decodeContent(payload);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}

export async function commitGitFiles(head: GitHead, message: string, files: GitFile[]) {
  for (const file of files) assertCatalogPath(file.path);
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
    body: JSON.stringify({ base_tree: head.baseTree, tree: treeEntries }),
  });
  const treeSha = typeof tree.sha === "string" ? tree.sha : "";
  if (!treeSha) throw new Error("GitHub did not create the catalog update.");
  const commit = await github("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [head.parentSha],
      author: { name: "Studio desk", email: "studio-desk@thomasene.art" },
    }),
  });
  const commitSha = typeof commit.sha === "string" ? commit.sha : "";
  if (!commitSha) throw new Error("GitHub did not create the catalog commit.");
  await github(`/git/refs/heads/${head.branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
  return commitSha;
}
