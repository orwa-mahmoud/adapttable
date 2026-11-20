import { sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const STATUS_CONTEXT = "Release merge authorization";
const PAGE_SIZE = 100;
const RELEASE_PATH =
  /^(?:\.github\/(?:CODEOWNERS$|workflows\/|actions\/)|\.changeset\/config\.json$|scripts\/(?:release-|github-releases\.mjs$|packages\.mjs$))/;
const PACKAGE_MANIFEST = /^packages\/[^/]+\/[^/]+\/package\.json$/;

function publishedIdentity(manifest) {
  if (!manifest || manifest.private === true) return undefined;
  return JSON.stringify([manifest.name, manifest.version]);
}

function versionScripts(manifest) {
  return JSON.stringify([
    manifest?.scripts?.["version-packages"],
    manifest?.scripts?.release,
    manifest?.scripts?.["release:gated"],
  ]);
}

function isReleasePath(path) {
  return path.split("/").at(-1) === "CHANGELOG.md" || RELEASE_PATH.test(path);
}

function releasePathBlock(file) {
  const previous = file.previous_filename ?? file.filename;
  if (isReleasePath(file.filename) || isReleasePath(previous)) {
    return "Release configuration or changelog requires the release owner to merge";
  }
  if (
    (file.status === "removed" || file.status === "renamed") &&
    /^\.changeset\/[^/]+\.md$/.test(previous)
  ) {
    return "Changeset removal requires the release owner to merge";
  }
  return undefined;
}

async function releaseMetadataChanged(file, pull, readManifest) {
  const previous = file.previous_filename ?? file.filename;
  const root = file.filename === "package.json" || previous === "package.json";
  if (
    !root &&
    !PACKAGE_MANIFEST.test(file.filename) &&
    !PACKAGE_MANIFEST.test(previous)
  ) {
    return false;
  }
  const oldManifest =
    file.status === "added"
      ? undefined
      : await readManifest(previous, pull.base.sha);
  const newManifest =
    file.status === "removed"
      ? undefined
      : await readManifest(file.filename, pull.head.sha);
  const identity = root ? versionScripts : publishedIdentity;
  return identity(oldManifest) !== identity(newManifest);
}

/** Review release changes from the PR metadata and blobs, outside the PR's execution. */
export async function releaseMergeBlock(pull, files, readManifest) {
  if (pull.head.ref === "changeset-release/" + pull.base.ref) {
    return "Version Packages PR requires the release owner to merge";
  }
  if (files.length !== pull.changed_files) {
    throw new Error("Incomplete changed-file metadata for PR #" + pull.number);
  }
  for (const file of files) {
    const block = releasePathBlock(file);
    if (block) return block;
  }
  for (const file of files) {
    if (await releaseMetadataChanged(file, pull, readManifest)) {
      return "Package release metadata requires the release owner to merge";
    }
  }
  return undefined;
}

async function github(token, path, body) {
  const response = await fetch("https://api.github.com" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(
      "GitHub request for " + path + " failed with HTTP " + response.status
    );
  return response.json();
}

async function list(token, path) {
  const items = [];
  for (let page = 1; ; page++) {
    const result = await github(
      token,
      path + "?per_page=" + PAGE_SIZE + "&page=" + page
    );
    items.push(...result);
    if (result.length < PAGE_SIZE) return items;
  }
}

async function appToken(appId, installation, privateKey, repository) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const time = Math.floor(Date.now() / 1000);
  const unsigned =
    encode({ alg: "RS256", typ: "JWT" }) +
    "." +
    encode({ iat: time - 60, exp: time + 480, iss: appId });
  const jwt =
    unsigned +
    "." +
    sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
  const auth = await github(
    jwt,
    "/app/installations/" + installation + "/access_tokens",
    {
      repositories: [repository.split("/")[1]],
      permissions: { statuses: "write" },
    }
  );
  return auth.token;
}

async function main(env) {
  const {
    GITHUB_EVENT_PATH,
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
    GITHUB_REF_NAME,
    GH_TOKEN,
    RELEASE_GATE_APP_ID,
    RELEASE_GATE_INSTALLATION_ID,
    RELEASE_GATE_PRIVATE_KEY,
  } = env;
  const event = JSON.parse(await readFile(GITHUB_EVENT_PATH, "utf8"));
  const repo = "/repos/" + GITHUB_REPOSITORY;
  const head = event.workflow_run.head_sha;
  const candidates = await list(GH_TOKEN, repo + "/commits/" + head + "/pulls");
  const pulls = candidates.filter(
    (pull) =>
      pull.state === "open" &&
      pull.head.sha === head &&
      pull.base.ref === GITHUB_REF_NAME &&
      pull.base.repo.full_name === GITHUB_REPOSITORY
  );
  if (pulls.length === 0) return;
  if (
    !RELEASE_GATE_APP_ID ||
    !RELEASE_GATE_INSTALLATION_ID ||
    !RELEASE_GATE_PRIVATE_KEY
  ) {
    throw new Error("Release merge gate app credentials are missing");
  }
  const readManifest = async (path, sha) => {
    const file = await github(
      GH_TOKEN,
      repo +
        "/contents/" +
        path.split("/").map(encodeURIComponent).join("/") +
        "?ref=" +
        sha
    );
    if (file.encoding !== "base64")
      throw new Error("Unsupported package manifest encoding for " + path);
    return JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  };
  let block;
  for (const candidate of pulls) {
    const path = repo + "/pulls/" + candidate.number;
    const pull = await github(GH_TOKEN, path);
    if (
      pull.state !== "open" ||
      pull.head.sha !== head ||
      pull.base.ref !== GITHUB_REF_NAME
    )
      return;
    const files = await list(GH_TOKEN, path + "/files");
    const result = await releaseMergeBlock(pull, files, readManifest);
    const current = await github(GH_TOKEN, path);
    if (
      current.head.sha !== pull.head.sha ||
      current.base.sha !== pull.base.sha ||
      current.state !== "open"
    )
      return;
    block ??= result;
  }
  const token = await appToken(
    RELEASE_GATE_APP_ID,
    RELEASE_GATE_INSTALLATION_ID,
    RELEASE_GATE_PRIVATE_KEY,
    GITHUB_REPOSITORY
  );
  await github(token, repo + "/statuses/" + head, {
    state: block ? "failure" : "success",
    context: STATUS_CONTEXT,
    description: block ?? "Standard pull request",
    target_url:
      "https://github.com/" +
      GITHUB_REPOSITORY +
      "/actions/runs/" +
      GITHUB_RUN_ID,
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main(process.env);
}
