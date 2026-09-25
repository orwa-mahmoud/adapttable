#!/usr/bin/env node
/**
 * Rewrite each package's lcov `SF:` paths from package-relative
 * (`src/DataTable.tsx`) to repo-relative
 * (`packages/<group>/<pkg>/src/DataTable.tsx`).
 *
 * Vitest emits package-relative paths. In a monorepo where several
 * packages share file names (every adapter has `src/DataTable.tsx`),
 * SonarQube cannot disambiguate them and silently drops their coverage.
 * Repo-relative paths are unique, so Sonar maps every file correctly.
 *
 * Run after `pnpm test:coverage` and before `sonar-scanner`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { listPackages } from "./packages.mjs";

let patched = 0;

for (const { dir, rel } of listPackages(process.cwd())) {
  const lcovPath = join(dir, "coverage", "lcov.info");
  if (!existsSync(lcovPath)) continue;

  const prefix = `${rel}/`;
  const original = readFileSync(lcovPath, "utf8");
  const rewritten = original.replace(
    /^SF:(?!packages\/)(.*)$/gm,
    (_, p) => `SF:${prefix}${p}`
  );

  if (rewritten !== original) {
    writeFileSync(lcovPath, rewritten, "utf8");
    patched += 1;
  }
}

console.log(`fix-lcov-paths: rewrote SF paths in ${patched} lcov file(s).`);
