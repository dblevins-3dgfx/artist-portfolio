import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { GitHubError, commitGitFiles, isGitConflict, readGitFile, readGitHead } from "@/lib/github-catalog";

const TOKEN = "github_pat_secret123";
const savedToken = process.env.STUDIO_GITHUB_TOKEN;
const head = { repo: "o/r", branch: "main", parentSha: "p", baseTree: "t" };
let logged: string[];

function replyWith(status: number, body: string) {
  mock.method(globalThis, "fetch", async () => new Response(body, { status }));
}

beforeEach(() => {
  process.env.STUDIO_GITHUB_TOKEN = TOKEN;
  logged = [];
  mock.method(console, "error", (line: string) => logged.push(line));
});

afterEach(() => {
  mock.restoreAll();
  if (savedToken === undefined) delete process.env.STUDIO_GITHUB_TOKEN;
  else process.env.STUDIO_GITHUB_TOKEN = savedToken;
});

const internals = JSON.stringify({
  message: `Bad credentials for ${TOKEN}`,
  documentation_url: "https://docs.github.com/rest",
});

test("a failed read shows a plain message and logs GitHub's reply", async () => {
  replyWith(401, internals);
  await assert.rejects(readGitHead(), (error: unknown) => {
    assert.ok(error instanceof GitHubError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "GitHub could not load the catalog. Try again in a minute.");
    return true;
  });
  assert.equal(logged.length, 1);
  assert.match(logged[0], /GitHub GET \/git\/ref\/heads\/main responded 401: .*Bad credentials/);
});

test("a failed save shows a plain message without GitHub's wording", async () => {
  replyWith(403, internals);
  await assert.rejects(
    commitGitFiles(head, "Update", [{ path: "content/works.json", bytes: Buffer.from("[]") }]),
    (error: unknown) => {
      assert.ok(error instanceof GitHubError);
      assert.equal(error.message, "GitHub did not accept the save. Try again in a minute.");
      assert.ok(!error.message.includes("Bad credentials"));
      return true;
    },
  );
  assert.match(logged[0], /GitHub POST \/git\/blobs responded 403/);
});

test("the token never reaches the log", async () => {
  replyWith(500, internals);
  await assert.rejects(readGitHead());
  assert.ok(!logged[0].includes(TOKEN));
  assert.ok(logged[0].includes("[redacted]"));
});

test("conflicts keep their status so a save can retry", async () => {
  replyWith(422, "{}");
  await assert.rejects(
    commitGitFiles(head, "Update", [{ path: "content/works.json", bytes: Buffer.from("[]") }]),
    (error: unknown) => isGitConflict(error),
  );
});

test("a missing catalog file is still read as absent", async () => {
  replyWith(404, "{}");
  assert.equal(await readGitFile("content/works.json", "main"), null);
});

// A scripted GitHub: each reply is matched in order to the next request,
// and every request is recorded (method, path, parsed body, headers) so a
// test can check exactly what was sent.
type Sent = { method: string; path: string; body: unknown; headers: Record<string, string> };

function scriptGitHub(replies: [status: number, body: unknown][]) {
  const sent: Sent[] = [];
  mock.method(globalThis, "fetch", async (url: string, init: RequestInit = {}) => {
    sent.push({
      method: init.method ?? "GET",
      path: String(url).replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+/, ""),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    const reply = replies.shift();
    if (!reply) throw new Error(`No scripted reply for ${init.method ?? "GET"} ${url}`);
    const [status, body] = reply;
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  });
  return sent;
}

const savedRepo = process.env.STUDIO_GITHUB_REPO;
const savedBranch = process.env.STUDIO_GITHUB_BRANCH;
afterEach(() => {
  if (savedRepo === undefined) delete process.env.STUDIO_GITHUB_REPO;
  else process.env.STUDIO_GITHUB_REPO = savedRepo;
  if (savedBranch === undefined) delete process.env.STUDIO_GITHUB_BRANCH;
  else process.env.STUDIO_GITHUB_BRANCH = savedBranch;
});

test("readGitHead reads the branch, then its commit, and returns the head", async () => {
  const sent = scriptGitHub([
    [200, { object: { sha: "c0ffee" } }],
    [200, { tree: { sha: "7ree" } }],
  ]);
  assert.deepEqual(await readGitHead(), {
    repo: "dblevins-3dgfx/artist-portfolio",
    branch: "main",
    parentSha: "c0ffee",
    baseTree: "7ree",
  });
  assert.deepEqual(
    sent.map((s) => `${s.method} ${s.path}`),
    ["GET /git/ref/heads/main", "GET /git/commits/c0ffee"],
  );
});

test("readGitHead refuses a reply missing the commit or the tree", async () => {
  scriptGitHub([[200, { object: {} }]]);
  await assert.rejects(readGitHead(), /latest catalog commit/);
  mock.restoreAll();
  scriptGitHub([
    [200, { object: { sha: "c0ffee" } }],
    [200, { tree: {} }],
  ]);
  await assert.rejects(readGitHead(), /catalog tree/);
});

test("requests carry the token and GitHub's API headers", async () => {
  const sent = scriptGitHub([
    [200, { object: { sha: "c0ffee" } }],
    [200, { tree: { sha: "7ree" } }],
  ]);
  await readGitHead();
  assert.equal(sent[0].headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(sent[0].headers.Accept, "application/vnd.github+json");
  assert.equal(sent[0].headers["X-GitHub-Api-Version"], "2022-11-28");
  assert.ok(sent[0].headers["User-Agent"]);
});

test("STUDIO_GITHUB_REPO and STUDIO_GITHUB_BRANCH choose where the desk reads and writes", async () => {
  process.env.STUDIO_GITHUB_REPO = "someone/fork";
  process.env.STUDIO_GITHUB_BRANCH = "desk-test";
  const urls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(String(url));
    return new Response(JSON.stringify(urls.length === 1 ? { object: { sha: "c" } } : { tree: { sha: "t" } }));
  });
  const result = await readGitHead();
  assert.equal(result.repo, "someone/fork");
  assert.equal(result.branch, "desk-test");
  assert.equal(urls[0], "https://api.github.com/repos/someone/fork/git/ref/heads/desk-test");
});

test("a bad repository or branch setting, or no token, stops before any request", async () => {
  const sent = scriptGitHub([]);
  process.env.STUDIO_GITHUB_REPO = "not a repo";
  await assert.rejects(readGitHead(), /owner\/repository/);
  delete process.env.STUDIO_GITHUB_REPO;
  process.env.STUDIO_GITHUB_BRANCH = "main/../other";
  await assert.rejects(readGitHead(), /not a branch name/);
  delete process.env.STUDIO_GITHUB_BRANCH;
  delete process.env.STUDIO_GITHUB_TOKEN;
  await assert.rejects(readGitFile("content/works.json", "main"), /STUDIO_GITHUB_TOKEN is not set/);
  assert.equal(sent.length, 0);
});

test("readGitFile decodes base64 content, line breaks and all, at the given commit", async () => {
  const text = '[{"slug":"lake"}]\n';
  const encoded = Buffer.from(text).toString("base64");
  const sent = scriptGitHub([[200, { encoding: "base64", content: `${encoded.slice(0, 8)}\n${encoded.slice(8)}\n` }]]);
  const bytes = await readGitFile("content/works.json", "abc 123");
  assert.equal(bytes?.toString("utf8"), text);
  assert.equal(sent[0].path, "/contents/content/works.json?ref=abc%20123");
});

test("readGitFile refuses a reply that is not base64 file content", async () => {
  scriptGitHub([[200, { encoding: "none", content: "" }]]);
  await assert.rejects(readGitFile("content/works.json", "main"), /did not return the catalog file/);
});

test("readGitFile passes on errors other than a missing file", async () => {
  scriptGitHub([[500, "{}"]]);
  await assert.rejects(readGitFile("content/works.json", "main"), (error: unknown) => {
    assert.ok(error instanceof GitHubError);
    assert.equal(error.status, 500);
    return true;
  });
});

test("only catalog paths can be read or written, checked before any request", async () => {
  const sent = scriptGitHub([]);
  await assert.rejects(readGitFile("package.json", "main"), /Refusing/);
  await assert.rejects(
    commitGitFiles(head, "Update", [{ path: "../secrets.txt", bytes: Buffer.from("x") }]),
    /Refusing/,
  );
  assert.equal(sent.length, 0);
});

test("commitGitFiles writes blobs, a tree with deletes as sha null, a commit, then moves the branch", async () => {
  const sent = scriptGitHub([
    [201, { sha: "blob-works" }],
    [201, { sha: "blob-art" }],
    [201, { sha: "tree-new" }],
    [201, { sha: "commit-new" }],
    [200, ""],
  ]);
  const commit = await commitGitFiles(head, 'Update "Lake" from the studio desk', [
    { path: "content/works.json", bytes: Buffer.from("[]\n") },
    { path: "public/art/lake.jpg", bytes: Buffer.from("jpeg") },
    { path: "public/art/old-lake.jpg", bytes: null },
  ]);
  assert.equal(commit, "commit-new");
  assert.deepEqual(
    sent.map((s) => `${s.method} ${s.path}`),
    ["POST /git/blobs", "POST /git/blobs", "POST /git/trees", "POST /git/commits", "PATCH /git/refs/heads/main"],
  );
  // A deleted file gets no blob.
  assert.deepEqual(sent[0].body, { content: Buffer.from("[]\n").toString("base64"), encoding: "base64" });
  assert.deepEqual(sent[2].body, {
    base_tree: "t",
    tree: [
      { path: "content/works.json", mode: "100644", type: "blob", sha: "blob-works" },
      { path: "public/art/lake.jpg", mode: "100644", type: "blob", sha: "blob-art" },
      { path: "public/art/old-lake.jpg", mode: "100644", type: "blob", sha: null },
    ],
  });
  assert.deepEqual(sent[3].body, {
    message: 'Update "Lake" from the studio desk',
    tree: "tree-new",
    parents: ["p"],
    author: { name: "Studio desk", email: "studio-desk@thomasene.art" },
  });
  // Never forced: a save that raced another lands as a conflict, not an overwrite.
  assert.deepEqual(sent[4].body, { sha: "commit-new", force: false });
});

test("commitGitFiles stops if GitHub leaves out a blob, tree, or commit id", async () => {
  const one = [{ path: "content/works.json", bytes: Buffer.from("[]") }];
  scriptGitHub([[201, {}]]);
  await assert.rejects(commitGitFiles(head, "Update", one), /did not store one of the catalog files/);
  mock.restoreAll();
  scriptGitHub([
    [201, { sha: "b" }],
    [201, {}],
  ]);
  await assert.rejects(commitGitFiles(head, "Update", one), /did not create the catalog update/);
  mock.restoreAll();
  const sent = scriptGitHub([
    [201, { sha: "b" }],
    [201, { sha: "t" }],
    [201, {}],
  ]);
  await assert.rejects(commitGitFiles(head, "Update", one), /did not create the catalog commit/);
  assert.equal(
    sent.some((s) => s.method === "PATCH"),
    false,
    "the branch is not moved",
  );
});

test("isGitConflict is true only for GitHub's 409 and 422", () => {
  assert.equal(isGitConflict(new GitHubError(409, "x")), true);
  assert.equal(isGitConflict(new GitHubError(422, "x")), true);
  assert.equal(isGitConflict(new GitHubError(404, "x")), false);
  assert.equal(isGitConflict(new GitHubError(500, "x")), false);
  assert.equal(isGitConflict(new Error("409")), false);
  assert.equal(isGitConflict({ status: 422 }), false);
});
