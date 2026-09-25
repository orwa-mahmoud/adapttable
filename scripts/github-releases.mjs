/**
 * Create the GitHub release for every published package version at a commit
 * that does not have one yet. Each release is tagged `<name>@<version>` on
 * that commit and carries the version's CHANGELOG section as its notes. When
 * `@adapttable/core` is among the new releases, it is marked Latest.
 *
 *   node scripts/github-releases.mjs [--ref <commit>] [--dry-run]
 *
 * `--ref` defaults to HEAD; files are read at that commit, so any Version
 * Packages commit on main can be released without a checkout.
 */

/**
 * The notes of one version: the lines under `## <version>` up to the next
 * version heading, trimmed. `null` when the CHANGELOG has no such heading.
 *
 * @param {string} changelog
 * @param {string} version
 * @returns {string | null}
 */
export function changelogSection(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

/**
 * @param {string} name
 * @param {string} version
 * @returns {string}
 */
export function releaseTag(name, version) {
  return `${name}@${version}`;
}

/**
 * The release to mark Latest among the ones about to be created: core when it
 * is one of them, otherwise none, so an adapter-only release leaves the
 * current Latest in place.
 *
 * @param {string[]} tags
 * @returns {string | undefined}
 */
export function latestTag(tags) {
  return tags.find((tag) => tag.startsWith("@adapttable/core@"));
}

/**
 * @typedef {{ name: string, version: string, private?: boolean }} Manifest
 * @typedef {{ tag: string, notes: string }} PlannedRelease
 */

/**
 * The releases missing at one commit, in package order.
 *
 * @param {{
 *   packages: { manifest: Manifest, changelog: string | null }[],
 *   existing: Set<string>,
 *   ignored: Set<string>,
 * }} input
 * @returns {PlannedRelease[]}
 */
export function plannedReleases({ packages, existing, ignored }) {
  return packages.flatMap(({ manifest, changelog }) => {
    if (manifest.private || ignored.has(manifest.name)) return [];
    const tag = releaseTag(manifest.name, manifest.version);
    if (existing.has(tag) || changelog === null) return [];
    const notes = changelogSection(changelog, manifest.version);
    return notes === null ? [] : [{ tag, notes }];
  });
}

/** A package manifest's path in the tree: `packages/<group>/<name>/package.json`. */
const PACKAGE_MANIFEST = /^packages\/[^/]+\/([^/]+)\/package\.json$/;

/**
 * The package folders a commit holds, from the path list
 * `git ls-tree -r --name-only <ref> -- packages` prints, sorted by folder name
 * as the working tree lists them.
 *
 * @param {string} tree one repository-relative path per line
 * @returns {string[]} each folder, as `packages/<group>/<name>`
 */
export function packageDirsInTree(tree) {
  return tree
    .split("\n")
    .map((path) => PACKAGE_MANIFEST.exec(path.trim()))
    .filter((match) => match !== null)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map((match) => match[0].slice(0, -"/package.json".length));
}

const invokedDirectly = process.argv[1]?.endsWith("github-releases.mjs");
if (invokedDirectly) {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const args = process.argv.slice(2);
  const refIndex = args.indexOf("--ref");
  const ref = refIndex === -1 ? "HEAD" : args[refIndex + 1];
  const dryRun = args.includes("--dry-run");

  const run = (command, commandArgs) =>
    execFileSync(command, commandArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const show = (path) => {
    try {
      return run("git", ["show", `${ref}:${path}`]);
    } catch {
      return null;
    }
  };

  const sha = run("git", ["rev-parse", ref]).trim();
  const config = JSON.parse(show(".changeset/config.json") ?? "{}");
  const dirs = packageDirsInTree(
    run("git", ["ls-tree", "-r", "--name-only", ref, "--", "packages"])
  );
  const packages = dirs.flatMap((dir) => {
    const manifest = show(`${dir}/package.json`);
    if (manifest === null) return [];
    return [
      {
        manifest: JSON.parse(manifest),
        changelog: show(`${dir}/CHANGELOG.md`),
      },
    ];
  });
  const existing = new Set(
    run("gh", [
      "api",
      "--paginate",
      "repos/{owner}/{repo}/releases",
      "--jq",
      ".[].tag_name",
    ])
      .split("\n")
      .filter(Boolean)
  );
  const planned = plannedReleases({
    packages,
    existing,
    ignored: new Set(config.ignore ?? []),
  });
  const latest = latestTag(planned.map((release) => release.tag));
  const notesDir = mkdtempSync(join(tmpdir(), "release-notes-"));

  for (const { tag, notes } of planned) {
    const isLatest = tag === latest;
    process.stdout.write(
      `${dryRun ? "would create" : "creating"} ${tag} at ${sha.slice(0, 8)}${isLatest ? " (latest)" : ""}\n`
    );
    if (dryRun) continue;
    const notesFile = join(notesDir, "notes.md");
    writeFileSync(notesFile, `${notes}\n`);
    run("gh", [
      "release",
      "create",
      tag,
      "--title",
      tag,
      "--target",
      sha,
      "--notes-file",
      notesFile,
      `--latest=${isLatest}`,
    ]);
  }
  if (planned.length === 0) process.stdout.write("no releases to create\n");
}
