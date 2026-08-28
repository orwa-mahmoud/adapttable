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

/**
 * Names the deprecated main-entry aliases re-export. The alias and its source
 * module both land in core's rollup, so the d.ts bundler renames the second
 * copy (`pinnedRowPart$1`) and API Extractor then reports a symbol that exists
 * only because of the duplication. Keyed on the BASE name, never the generated
 * one: `$1` is assigned by collision order, so a literal list would silently
 * stop matching the day another duplicate appears. The set empties itself when
 * the aliases are deleted.
 */
const ALIAS_NAMES = new Set(
  [
    ...readFileSync(
      join(REPO_ROOT, "packages", "core", "src", "mainEntryAliases.ts"),
      "utf8"
    ).matchAll(/^export\s+(?:type|const)\s+([A-Za-z_$][\w$]*)/gm),
  ].map((m) => m[1])
);

/** Warnings deferred behind ALIAS_NAMES, counted for one closing summary. */
let deferredAliasWarnings = 0;
let deferredSubpathWarnings = 0;
let frontDoorWarnings = 0;
let compilerNoticeShown = false;

/** Every published package under `packages/` — reports follow `exports`. */
const PACKAGES = readdirSync(join(REPO_ROOT, "packages"));

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
      const isMainEntry = key === ".";
      list.push({
        dir,
        isMainEntry,
        report: key === "." ? `${dir}.api.md` : `${dir}-${name}.api.md`,
        entry: join(REPO_ROOT, "packages", dir, "dist", `${name}.d.ts`),
      });
    }
  }
  return list;
}

function extractOne({ dir, report, entry, isMainEntry }) {
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
    messageCallback: (message) => {
      // Said once per report otherwise, and it is about api-extractor's own
      // bundled TypeScript rather than anything in this repository.
      if (message.messageId === "console-compiler-version-notice") {
        if (compilerNoticeShown) message.logLevel = "none";
        compilerNoticeShown = true;
        return;
      }
      // This repository exports its internal machinery without an underscore
      // prefix on purpose — renaming a published symbol to `_name` would be a
      // breaking change. The tag states the support level; the name does not.
      if (message.messageId === "ae-internal-missing-underscore") {
        message.logLevel = "none";
        return;
      }
      // A symbol the d.ts bundler invented for a deprecated alias's duplicate.
      if (message.messageId === "ae-forgotten-export") {
        const named = /"([A-Za-z_$][\w$]*)"/.exec(message.text);
        const symbol = named?.[1] ?? "";
        const generated = /[$_]\d+$/.test(symbol);
        const base = symbol.replace(/[$_]\d+$/, "");
        // A name the d.ts bundler invented while flattening a duplicate. No
        // edit to this repository can produce or remove it.
        if (generated || ALIAS_NAMES.has(base)) {
          deferredAliasWarnings += 1;
          message.logLevel = "none";
          return;
        }
        // The front door is the promise: a type an exported signature hands
        // back must be nameable from the same import. Subpath entries publish
        // the machinery — `/adapter` alone would drag two thirds of core into
        // the public surface — so they stay informational.
        // Ready to become an error the moment the front doors are clean. One
        // is not: shadcn's saved-views panel types its props from core's chrome
        // props, and exporting that type pulls its whole slot family with it —
        // each promotion naming the next. Parked for the owner.
        if (isMainEntry) {
          frontDoorWarnings += 1;
          return;
        }
        deferredSubpathWarnings += 1;
      }
    },
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
if (deferredAliasWarnings > 0 || deferredSubpathWarnings > 0) {
  console.log(
    `api-reports: ${deferredAliasWarnings} bundler-invented and ` +
      `${deferredSubpathWarnings} subpath forgotten-export warning(s) deferred. ` +
      `${frontDoorWarnings} at a front door.`
  );
}
