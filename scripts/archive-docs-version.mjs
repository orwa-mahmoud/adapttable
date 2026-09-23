#!/usr/bin/env node
/**
 * Freeze one documentation version into the docs site's version archive.
 *
 *   node scripts/archive-docs-version.mjs --slug v3 --ref v3.0.0
 *   node scripts/archive-docs-version.mjs --slug v2 --source <dir> --sha <commit>
 *
 * The source is the repository as it stood for that version: either a git ref
 * (`--ref`, extracted with `git archive`) or a directory already holding that
 * tree (`--source`, for an archive whose pages were corrected first). It must
 * contain `docs/*.md`, `apps/docs/sync-docs.mjs`, `apps/docs/sidebar.mjs`,
 * `scripts/` and `llms.txt` from that version.
 *
 * `starlight-versions` writes a snapshot the first time a configured version
 * has no folder, so the script builds the site once in a scratch copy of
 * `apps/docs` whose only configured version is the new one, with that
 * version's pages synced by that version's own `sync-docs.mjs`. It then copies
 * the snapshot into `apps/docs/src/content/docs/<slug>/` and
 * `apps/docs/src/content/versions/<slug>.json` and makes each page an archive
 * page:
 *
 * - `noindex, follow`, so search engines index only the current docs
 *   (`fix-sitemap.mjs` also leaves the version out of the sitemap);
 * - ` (<label>)` appended to the title, so no title repeats a current page's;
 * - GitHub `blob/main` / `tree/main` links and StackBlitz starters pinned to
 *   the version's commit, so they open that version's code;
 * - an og:image with no card in `public/og/` points at the site card.
 *
 * Add `{ slug, label }` to `apps/docs/versions.mjs` afterwards; the snapshot
 * is committed as is and never regenerated.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { gitBinary } from "./git-binary.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_APP = join(ROOT, "apps", "docs");
const SITE = "https://orwa-mahmoud.github.io/adapttable";
/** A breadcrumb item that points at a current docs page of this site. */
const BREADCRUMB_ITEM =
  /"item":"https:\/\/orwa-mahmoud\.github\.io\/adapttable\/(?!og\/)([a-z0-9-]+)\/"/g;
/** A page's Open Graph image on this site. */
const OG_IMAGE =
  /https:\/\/orwa-mahmoud\.github\.io\/adapttable\/og\/([a-z0-9-]+)\.png/g;
const REPO = "https://github.com/orwa-mahmoud/adapttable";

function option(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const slug = option("slug");
const label = option("label") ?? slug;
const ref = option("ref");
const sourceArg = option("source");
if (!slug || !/^v\d+$/.test(slug) || (!ref && !sourceArg)) {
  throw new Error(
    "usage: archive-docs-version.mjs --slug vN (--ref <git ref> | --source <dir> --sha <commit>) [--label <label>]"
  );
}
const GIT = ref ? gitBinary() : undefined;
const git = (args, options = {}) =>
  execFileSync(GIT, args, {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
const sha =
  option("sha") ??
  (ref
    ? git(["rev-parse", `${ref}^{commit}`], { encoding: "utf8" }).trim()
    : undefined);
if (!sha) throw new Error("--sha is required with --source");

const snapshotDir = join(DOCS_APP, "src", "content", "docs", slug);
const versionFile = join(
  DOCS_APP,
  "src",
  "content",
  "versions",
  `${slug}.json`
);
if (existsSync(snapshotDir) || existsSync(versionFile)) {
  throw new Error(
    `${relative(ROOT, snapshotDir)} already exists; an archive is written once`
  );
}

// Inside the repository, so Vite finds the workspace root and serves the
// shared node_modules; `.archive-work-*` is gitignored and removed below.
const work = mkdtempSync(join(ROOT, `.archive-work-${slug}-`));

/** The version's own tree: extracted from git, or the directory given. */
function materializeSource() {
  if (sourceArg) return sourceArg;
  const dir = join(work, "source");
  const files = git(
    [
      "ls-tree",
      "-r",
      "--name-only",
      ref,
      "--",
      "docs",
      "apps/docs",
      "scripts",
      "llms.txt",
    ],
    { encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean);
  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, git(["show", `${ref}:${file}`]));
  }
  return dir;
}

const source = materializeSource();
for (const required of [
  "docs",
  "apps/docs/sync-docs.mjs",
  "apps/docs/sidebar.mjs",
  "scripts",
  "llms.txt",
]) {
  if (!existsSync(join(source, required))) {
    throw new Error(`the ${slug} source has no ${required}`);
  }
}

// A scratch site: today's docs app and config, that version's pages, sync
// script and sidebar, and a versions list naming only the new version.
const site = join(work, "site");
const siteApp = join(site, "apps", "docs");
cpSync(DOCS_APP, siteApp, {
  recursive: true,
  filter: (path) =>
    !/[/\\](node_modules|dist|\.astro)([/\\]|$)/.test(path) &&
    !path.startsWith(join(DOCS_APP, "src", "content", "docs")) &&
    !path.startsWith(join(DOCS_APP, "src", "content", "versions")),
});
symlinkSync(join(DOCS_APP, "node_modules"), join(siteApp, "node_modules"));
cpSync(join(source, "docs"), join(site, "docs"), { recursive: true });
cpSync(join(source, "scripts"), join(site, "scripts"), { recursive: true });
cpSync(
  join(ROOT, "scripts", "analytics-guard.mjs"),
  join(site, "scripts", "analytics-guard.mjs")
);
cpSync(join(source, "llms.txt"), join(site, "llms.txt"));
for (const file of ["sync-docs.mjs", "sidebar.mjs"]) {
  cpSync(join(source, "apps", "docs", file), join(siteApp, file));
}
writeFileSync(
  join(siteApp, "versions.mjs"),
  `export const DOCS_VERSIONS = [${JSON.stringify({ slug, label })}];\n` +
    `export const CURRENT_VERSION_LABEL = "latest";\n`
);

const run = (command, args) =>
  execFileSync(command, args, {
    cwd: siteApp,
    stdio: "inherit",
    env: { ...process.env, ARCHIVE_DOCS_VERSION: slug },
  });
try {
  run(process.execPath, ["sync-docs.mjs"]);
  run(join(DOCS_APP, "node_modules", ".bin", "astro"), ["build"]);
} catch (error) {
  rmSync(work, { recursive: true, force: true });
  throw error;
}

const builtSnapshot = join(siteApp, "src", "content", "docs", slug);
const builtVersion = join(
  siteApp,
  "src",
  "content",
  "versions",
  `${slug}.json`
);
if (!existsSync(builtSnapshot) || !existsSync(builtVersion)) {
  throw new Error("starlight-versions wrote no snapshot");
}
cpSync(builtSnapshot, snapshotDir, { recursive: true });
mkdirSync(dirname(versionFile), { recursive: true });
cpSync(builtVersion, versionFile);

const ROBOTS = `  - tag: meta\n    attrs:\n      name: "robots"\n      content: "noindex, follow"`;

function archivePage(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (!match) throw new Error("snapshot page has no frontmatter");
  let front = match[1].replace(/^title: (.*)$/m, (_, value) => {
    const title = value.startsWith('"') ? JSON.parse(value) : value.trim();
    const archived = `${title} (${label})`;
    return `title: ${JSON.stringify(archived)}`;
  });
  front = /^head:\s*$/m.test(front)
    ? front.replace(/^head:\s*$/m, `head:\n${ROBOTS}`)
    : `${front}\nhead:\n${ROBOTS}`;
  // The breadcrumb names the archived page, not the current one.
  front = front.replace(
    BREADCRUMB_ITEM,
    (_, page) => `"item":"${SITE}/${slug}/${page}/"`
  );
  front = front.replace(OG_IMAGE, (url, page) =>
    existsSync(join(DOCS_APP, "public", "og", `${page}.png`))
      ? url
      : `${SITE}/og.png`
  );
  const body = markdown
    .slice(match[0].length)
    .replaceAll(`${REPO}/blob/main/`, `${REPO}/blob/${sha}/`)
    .replaceAll(`${REPO}/tree/main/`, `${REPO}/tree/${sha}/`)
    .replaceAll(
      "stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/",
      `stackblitz.com/github/orwa-mahmoud/adapttable/tree/${sha}/`
    );
  return `---\n${front}\n---\n${body}`;
}

let pages = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.mdx?$/.test(name)) {
      writeFileSync(path, archivePage(readFileSync(path, "utf8")));
      pages += 1;
    }
  }
})(snapshotDir);

// The plugin writes the sidebar as plain JSON; format it like the repo does.
const prettier = await import("prettier");
writeFileSync(
  versionFile,
  await prettier.format(readFileSync(versionFile, "utf8"), {
    ...(await prettier.resolveConfig(versionFile)),
    filepath: versionFile,
  })
);

rmSync(work, { recursive: true, force: true });
console.log(
  `archived ${pages} ${slug} page(s) into ${relative(ROOT, snapshotDir)}; ` +
    `add { slug: "${slug}", label: "${label}" } to apps/docs/versions.mjs`
);
