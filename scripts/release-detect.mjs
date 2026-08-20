/**
 * Decide whether a main-push Release job should version, publish, or skip.
 * Pending changesets open a Version PR. Unpublished package versions (or a
 * failed registry lookup) run build → publint → changeset publish. Otherwise
 * the workflow exits without installing the library toolchain.
 */

/**
 * @typedef {{ name: string, version: string }} Publishable
 * @typedef {{
 *   needVersion: boolean,
 *   needPublish: boolean,
 *   reason: string,
 * }} ReleasePlan
 */

/**
 * Changeset notes are `*.md` files in `.changeset/`. The folder README is not
 * a pending release.
 *
 * @param {string[]} files
 * @returns {string[]}
 */
export function pendingChangesets(files) {
  return files.filter((f) => f.endsWith(".md") && f !== "README.md");
}

/**
 * @param {{
 *   changesetFiles: string[],
 *   packages: Publishable[],
 *   published: Record<string, string | null | undefined>,
 * }} input `published[name]` is the registry latest, `null` if the package
 *   was never published, `undefined` if the lookup failed.
 * @returns {ReleasePlan}
 */
export function classifyRelease({ changesetFiles, packages, published }) {
  if (pendingChangesets(changesetFiles).length > 0) {
    return {
      needVersion: true,
      needPublish: false,
      reason: "pending changesets",
    };
  }

  const unpublished = packages.filter((p) => published[p.name] !== p.version);
  if (unpublished.length === 0) {
    return {
      needVersion: false,
      needPublish: false,
      reason: "nothing to version or publish",
    };
  }

  const lookupFailed = unpublished.some((p) => published[p.name] === undefined);
  return {
    needVersion: false,
    needPublish: true,
    reason: lookupFailed
      ? "registry lookup failed — fail-open to publish"
      : "unpublished versions",
  };
}

function printPlan(plan) {
  process.stdout.write(
    `needVersion=${plan.needVersion}\nneedPublish=${plan.needPublish}\n`
  );
  process.stderr.write(`release-detect: ${plan.reason}\n`);
}

const invokedDirectly = process.argv[1]?.endsWith("release-detect.mjs");
if (invokedDirectly) {
  const { readdir, readFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const changesetDir = join(root, ".changeset");
  const config = JSON.parse(
    await readFile(join(changesetDir, "config.json"), "utf8")
  );
  const ignored = new Set(config.ignore ?? []);
  const changesetFiles = await readdir(changesetDir);
  const pkgDirs = await readdir(join(root, "packages"), {
    withFileTypes: true,
  });
  /** @type {Publishable[]} */
  const packages = [];
  for (const ent of pkgDirs) {
    if (!ent.isDirectory()) continue;
    const pkg = JSON.parse(
      await readFile(join(root, "packages", ent.name, "package.json"), "utf8")
    );
    if (pkg.private || ignored.has(pkg.name) || !pkg.name || !pkg.version) {
      continue;
    }
    packages.push({ name: pkg.name, version: pkg.version });
  }

  /** @type {Record<string, string | null | undefined>} */
  const published = {};
  await Promise.all(
    packages.map(async (p) => {
      try {
        const url = `https://registry.npmjs.org/${encodeURIComponent(p.name)}`;
        const res = await fetch(url);
        if (res.status === 404) {
          published[p.name] = null;
          return;
        }
        if (!res.ok) {
          published[p.name] = undefined;
          return;
        }
        const body = await res.json();
        published[p.name] = body["dist-tags"]?.latest ?? null;
      } catch {
        published[p.name] = undefined;
      }
    })
  );

  printPlan(classifyRelease({ changesetFiles, packages, published }));
}
