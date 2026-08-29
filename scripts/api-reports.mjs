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
 * `/adapter`, `/xlsx`, `/pdf`, `/formula`, `/pivot`, `/query`, `/stream` and `/sparkline`
 * are each extracted, and a subpath added tomorrow is covered the day it
 * ships. `@adapttable/cli`'s main entry is extracted too — its building
 * blocks are a published programmatic API. `./package.json` and the
 * `adapttable` binary are not typed entrypoints.
 *
 * Packages must be built first (`pnpm build`).
 */
import {
  copyFileSync,
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

import { entrypoints } from "./api-entrypoints.mjs";
import {
  aliasNames,
  classifyForgottenExport,
  entryExports,
  summarize,
} from "./api-warnings.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ETC = join(REPO_ROOT, "etc");
const LOCAL = process.argv.includes("--local");
// Check mode extracts into a throwaway folder and byte-compares against the
// committed reports — api-extractor's own "production build" verdict also
// fails on WARNINGS, which would make undocumented-symbol notes block CI.
// The gate here is exactly one question: did the public surface change?
const OUT = LOCAL ? ETC : mkdtempSync(join(tmpdir(), "api-reports-"));
if (!LOCAL && existsSync(ETC)) {
  // Seed the throwaway folder with what is committed. Extracting into an empty
  // directory makes API Extractor report every single report as newly created —
  // 102 notices that say nothing about the code.
  for (const file of readdirSync(ETC).filter((f) => f.endsWith(".api.md"))) {
    copyFileSync(join(ETC, file), join(OUT, file));
  }
}

/** Every deprecated main-entry alias, read from the module that declares them. */
const ALIASES = aliasNames(
  readFileSync(
    join(REPO_ROOT, "packages", "core", "src", "mainEntryAliases.ts"),
    "utf8"
  )
);

/**
 * One tally per warning class, so the closing line can name every one.
 *
 * A run that silences a class without counting it reports zero warnings while
 * holding some, which is the failure mode this replaced.
 */
const counts = {
  alias: 0,
  published: 0,
  subpath: 0,
  frontDoor: 0,
  valueBacked: 0,
  unresolvedLink: 0,
  missingReleaseTag: 0,
  other: 0,
};

/** Every entry point that hands back a type it does not export, named. */
const findings = [];

/** api-extractor's opening lines, said once for the run rather than per entry. */
const SAID_ONCE = new Set([
  "console-preamble",
  "console-compiler-version-notice",
]);
const shown = new Set();

function extractOne({ dir, report, entry, isMainEntry }) {
  if (!existsSync(entry)) {
    console.error(`✗ ${report}: missing ${entry} — run \`pnpm build\` first.`);
    return false;
  }
  // Read once per entry: the `published` class is proved against the very
  // declaration being extracted, not against a list kept beside it.
  const entryExported = entryExports(entry);
  // Captured BEFORE extraction: in local mode the extractor writes straight
  // into `etc/`, so reading afterwards would compare the file with itself.
  const committed = existsSync(join(ETC, report))
    ? readFileSync(join(ETC, report), "utf8")
    : "";
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
    messageCallback: (message) => {
      // Both of api-extractor's opening lines are emitted once per
      // extraction, and this runs one extraction per entry point — 103 copies
      // of two sentences about api-extractor's own bundled TypeScript. Each is
      // said once for the run: kept, so the version mismatch is still visible,
      // but not repeated. `console-preamble` is the line naming the bundled
      // version; the notice beside it is the one comparing it to this project.
      if (SAID_ONCE.has(message.messageId)) {
        if (shown.has(message.messageId)) message.logLevel = "none";
        shown.add(message.messageId);
        return;
      }
      // This repository exports its internal machinery without an underscore
      // prefix on purpose — renaming a published symbol to `_name` would be a
      // breaking change. The tag states the support level; the name does not.
      if (message.messageId === "ae-internal-missing-underscore") {
        message.logLevel = "none";
        return;
      }
      if (message.messageId === "ae-unresolved-link") {
        counts.unresolvedLink += 1;
        return;
      }
      if (message.messageId === "ae-missing-release-tag") {
        counts.missingReleaseTag += 1;
        return;
      }
      if (message.messageId !== "ae-forgotten-export") {
        // Only api-extractor's own analysis messages are warnings about this
        // repository; its console chatter is not.
        if (message.messageId.startsWith("ae-")) counts.other += 1;
        return;
      }
      const named = /"([A-Za-z_$][\w$]*)"/.exec(message.text);
      const { kind, base, suffix } = classifyForgottenExport({
        symbol: named?.[1] ?? "",
        report,
        isMainEntry,
        aliases: ALIASES,
        exports: entryExported,
      });
      if (kind === "alias") {
        // Named in full so a deferral can be audited from the log alone.
        counts.alias += 1;
        message.logLevel = "none";
        message.text += ` — deferred: ${base} is a deprecated main-entry alias and ${suffix} is the bundler's copy of it`;
        return;
      }
      if (kind === "published") {
        counts.published += 1;
        message.logLevel = "none";
        message.text += ` — deferred: ${report} exports ${base}, and ${suffix} is the bundler's private copy`;
        return;
      }
      if (kind === "value-backed") {
        // Counted and named, never silent: the whole point is that the list
        // cannot grow without someone deciding it should.
        counts.valueBacked += 1;
        message.logLevel = "none";
        message.text += ` — deferred: ${base} is a runtime value a public type is derived from, and ${report} is sold on being small`;
        return;
      }
      if (kind === "front-door") {
        counts.frontDoor += 1;
        findings.push(`${report}: ${named?.[1] ?? "?"} (main entry)`);
        return;
      }
      counts.subpath += 1;
      findings.push(`${report}: ${named?.[1] ?? "?"}`);
    },
  });
  if (!result.succeeded) {
    console.error(`✗ ${report}: extraction errored`);
    return false;
  }
  const fresh = readFileSync(join(OUT, report), "utf8");
  const same = fresh === committed;
  if (!LOCAL && !same) {
    console.error(
      `✗ ${report} is out of date — run \`pnpm api:reports\` and commit the diff.`
    );
    return false;
  }
  console.log(`✓ ${report}`);
  return true;
}

mkdirSync(ETC, { recursive: true });
let ok = true;
for (const target of entrypoints()) {
  ok = extractOne(target) && ok;
}
if (!LOCAL) rmSync(OUT, { recursive: true, force: true });
// Only claim a match when every report actually matched. A run that prints
// "every committed report matches" under the line saying one is out of date is
// the same failure as reporting one warning class as if it were the total.
if (LOCAL) {
  console.log("\napi-reports: regenerated — commit any changes under etc/.");
} else if (ok) {
  console.log("\napi-reports: every committed report matches the built types.");
} else {
  console.error(
    "\napi-reports: a committed report no longer matches the built types."
  );
}
console.log(summarize(counts));
// The promise, at every documented entry point rather than only the front
// doors: a type an exported signature hands back must be nameable from the
// same import. `docs/versioning.md` lists the focused subpaths as supported
// entry points, so a consumer of `@adapttable/core/pivot` is owed the parts of
// what `/pivot` returns, exactly as a consumer of the main entry is.
//
// Closing that took the count from 149 to 0 over seven rounds, and it cost far
// less than it looked: of the 413 routes it opened, 380 are types the package
// already supported on `@adapttable/core` and could not be named from the entry
// that returns them.
const holes = counts.frontDoor + counts.subpath;
if (holes > 0) {
  const shown = findings.slice(0, 40).join("\n  ");
  const rest = findings.length - 40;
  const more = rest > 0 ? `\n  … and ${rest} more` : "";
  console.error(
    `\n✗ ${holes} public signature(s) hand back a type their own entry point does not export:\n  ` +
      `${shown}${more}\n  ` +
      `Export the type from that entry, or give the signature one the entry already names.`
  );
  ok = false;
}
if (!ok) process.exit(1);
