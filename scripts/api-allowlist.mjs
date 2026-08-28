/**
 * Fail when a symbol is marked `@public` in an API report without being on the
 * allowlist in `etc/public-api.json`.
 *
 * The reports say what the tags claim; the allowlist says what the project
 * commits to. Drift between them is either a new public API that nobody
 * decided on, or machinery that leaked out of `@internal` — both worth a stop.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const allowlist = JSON.parse(
  readFileSync(join(REPO_ROOT, "etc", "public-api.json"), "utf8")
);

/** Reports to police, and the allowlist key each answers to. */
const GUARDED = [["core.api.md", "@adapttable/core"]];

const DECL =
  /^\/\/ @public\s*\n(?:\/\/.*\n)*export\s+(?:declare\s+)?(?:abstract\s+)?(?:type|interface|class|enum|function|const)\s+([A-Za-z_$][\w$]*)/gm;

let failed = false;
for (const [report, pkg] of GUARDED) {
  const allowed = new Set(allowlist[pkg] ?? []);
  const text = readFileSync(join(REPO_ROOT, "etc", report), "utf8");
  const offenders = [...text.matchAll(DECL)]
    .map((m) => m[1])
    .filter((name) => !allowed.has(name));
  if (offenders.length === 0) {
    console.log(`✓ ${report}: every @public symbol is on the allowlist`);
    continue;
  }
  failed = true;
  console.error(
    `✗ ${report}: ${offenders.length} symbol(s) marked @public but not on the allowlist for ${pkg}:`
  );
  for (const name of offenders.slice(0, 30)) console.error(`    ${name}`);
  if (offenders.length > 30)
    console.error(`    … and ${offenders.length - 30} more`);
  console.error(
    "  Either add them to etc/public-api.json with a changeset saying so, or mark them @internal."
  );
}
process.exit(failed ? 1 : 0);
