#!/usr/bin/env node
/**
 * Extracted API reports — an on-demand review artifact.
 *
 * API Extractor rolls each package entry's d.ts into a committed report
 * under `etc/`. Run `pnpm api:reports` after an intentional API change and
 * commit the diff: the report shows the change as reviewable signatures.
 * `pnpm api:check` byte-compares fresh extractions against the committed
 * reports and runs in CI's package job, so a surface change arrives with the
 * report that shows it.
 *
 * Entries: every importable entry point every library package advertises,
 * read from its `exports` map the way smoke-dist reads it — so core's
 * `/adapter`, `/xlsx`, `/pdf`, `/formula`, `/pivot`, `/query` and `/sparkline`
 * are each extracted, and a subpath added tomorrow is covered the day it
 * ships. The cli scaffolder has no importable API and is skipped, matching
 * smoke-dist.
 *
 * Packages must be built first (`pnpm build`).
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ETC = join(REPO_ROOT, "etc");
const LOCAL = process.argv.includes("--local");
// Check mode extracts into a throwaway folder and byte-compares against the
// committed reports — api-extractor's own "production build" verdict also
// fails on WARNINGS, which would make undocumented-symbol notes block CI.
// The gate here is exactly one question: did the public surface change?
const OUT = LOCAL ? ETC : mkdtempSync(join(tmpdir(), "api-reports-"));

/** Library packages (cli ships a bin, not an API). */
const PACKAGES = readdirSync(join(REPO_ROOT, "packages")).filter(
  (dir) => dir !== "cli"
);

/**
 * One extraction target per public entry point, taken from the `exports` map.
 *
 * `./package.json` is not an API and `./styles.css` is not typed, so a subpath
 * counts only when it names a bare module. A hand-written list of entries is a
 * list that goes stale silently: core shipped `/xlsx`, `/pdf`, `/sparkline`,
 * `/query`, `/pivot` and `/formula` while only `.` and `/adapter` were
 * extracted, which left most of the public surface able to change shape with
 * no report to show it.
 */
function targets() {
  const list = [];
  for (const dir of PACKAGES) {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, "packages", dir, "package.json"), "utf8")
    );
    const subpaths = Object.keys(manifest.exports ?? { ".": {} }).filter(
      (key) => key === "." || !key.slice(2).includes(".")
    );
    for (const key of subpaths.sort()) {
      const name = key === "." ? "index" : key.slice(2);
      list.push({
        dir,
        report: key === "." ? `${dir}.api.md` : `${dir}-${name}.api.md`,
        entry: join(REPO_ROOT, "packages", dir, "dist", `${name}.d.ts`),
      });
    }
  }
  return list;
}

function extractOne({ dir, report, entry }) {
  if (!existsSync(entry)) {
    console.error(`✗ ${report}: missing ${entry} — run \`pnpm build\` first.`);
    return false;
  }
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: join(REPO_ROOT, "packages", dir),
      mainEntryPointFilePath: entry,
      apiReport: {
        enabled: true,
        reportFileName: report,
        reportFolder: OUT,
        reportTempFolder: join(REPO_ROOT, "node_modules", ".api-extractor"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      compiler: {
        overrideTsconfig: {
          compilerOptions: {
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            types: ["react"],
            skipLibCheck: true,
            // Kit `/pivot` (and similar) re-export `@adapttable/core/pivot`.
            // Classic resolution cannot read package `exports` subpaths, and
            // API Extractor then InternalError's instead of rolling the types.
            module: "ESNext",
            moduleResolution: "bundler",
          },
        },
      },
      messages: {
        extractorMessageReporting: {
          // Unexported types referenced by the public surface are real
          // review information, not failures — they land IN the report.
          "ae-forgotten-export": { logLevel: "warning" },
          default: { logLevel: "warning" },
        },
      },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: join(REPO_ROOT, "packages", dir, "package.json"),
  });
  // Always a "local" build: warnings (undocumented symbols, missing release
  // tags) are review information inside the report, never a gate failure.
  const result = Extractor.invoke(config, {
    localBuild: true,
    showVerboseMessages: false,
  });
  if (!result.succeeded) {
    console.error(`✗ ${report}: extraction errored`);
    return false;
  }
  if (!LOCAL) {
    const fresh = readFileSync(join(OUT, report), "utf8");
    const committed = existsSync(join(ETC, report))
      ? readFileSync(join(ETC, report), "utf8")
      : "";
    if (fresh !== committed) {
      console.error(
        `✗ ${report} is out of date — run \`pnpm api:reports\` and commit the diff.`
      );
      return false;
    }
  }
  console.log(`✓ ${report}`);
  return true;
}

mkdirSync(ETC, { recursive: true });
let ok = true;
for (const target of targets()) {
  ok = extractOne(target) && ok;
}
if (!LOCAL) rmSync(OUT, { recursive: true, force: true });
if (!ok) process.exit(1);
console.log(
  LOCAL
    ? "\napi-reports: regenerated — commit any changes under etc/."
    : "\napi-reports: every committed report matches the built types."
);
