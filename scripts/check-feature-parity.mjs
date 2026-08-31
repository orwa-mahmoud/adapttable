#!/usr/bin/env node
/**
 * Generated from `feature-classification.json`: every published kit exposes
 * the same feature subpaths, and no root table imports a sibling kit or the
 * features aggregate barrel.
 *
 *   node scripts/check-feature-parity.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");
const manifest = JSON.parse(
  readFileSync(join(ROOT, "scripts", "feature-classification.json"), "utf8")
);

const PUBLISHED = readdirSync(PACKAGES).filter((name) => {
  if (!name.startsWith("adapter-") || name === "adapter-bootstrap") {
    return false;
  }
  const pkg = JSON.parse(
    readFileSync(join(PACKAGES, name, "package.json"), "utf8")
  );
  return pkg.private !== true;
});

const subpaths = [
  ...new Set(
    Object.values(manifest.features).map((feature) => `./${feature.subpath}`)
  ),
].sort();

const problems = [];

for (const adapter of PUBLISHED) {
  const pkg = JSON.parse(
    readFileSync(join(PACKAGES, adapter, "package.json"), "utf8")
  );
  const exports = pkg.exports ?? {};
  for (const subpath of subpaths) {
    if (!(subpath in exports)) {
      problems.push(`${pkg.name}: missing export ${subpath}`);
    }
  }

  const src = join(PACKAGES, adapter, "src");
  const files = readdirSync(src, { recursive: true })
    .filter((name) => typeof name === "string" && /\.(tsx?|jsx?)$/.test(name))
    .map((name) => join(src, name));

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const rel = file.slice(PACKAGES.length + 1);
    if (/from\s+["']@adapttable\/(?!core)[^"']+["']/.test(text)) {
      const other = text.match(/from\s+["'](@adapttable\/(?!core)[^"']+)["']/);
      if (
        other &&
        !rel.startsWith("adapter-shadcn/") &&
        other[1] !== "@adapttable/unstyled" &&
        other[1] !== "@adapttable/unstyled/features"
      ) {
        problems.push(`${rel}: imports sibling kit ${other[1]}`);
      }
    }
    if (
      /(?:^|\/)DataTable\.tsx$/.test(rel) &&
      /from\s+["'](?:\.\/features|@adapttable\/[^"']+\/features)["']/.test(text)
    ) {
      problems.push(`${rel}: root table imports the features aggregate barrel`);
    }
  }
}

if (problems.length > 0) {
  console.error(`feature parity: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `feature parity: ${PUBLISHED.length} kits share ${subpaths.length} subpaths`
);
