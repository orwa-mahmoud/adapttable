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
 * Packages must be built first (`pnpm build`). For a focused local iteration,
 * select package folders with repeated `--package` flags, for example:
 * `pnpm api:reports --package vue --package adapter-vue-unstyled`.
 * The default and CI commands still extract every package.
 * A scoped check proves only the selected packages.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

import { entrypoints } from "./api-entrypoints.mjs";
import { finishApiReportOutput } from "./api-report-diagnostics.mjs";
import { extractWithReportRetention } from "./api-report-retention.mjs";
import { selectApiReports } from "./api-report-selection.mjs";
import {
  classifyForgottenExport,
  entryExports,
  entryPropertyNormalizers,
  entryValueAliases,
  summarize,
} from "./api-warnings.mjs";
import { packageDir } from "./packages.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ETC = join(REPO_ROOT, "etc");
let selection;
try {
  selection = selectApiReports(entrypoints(), process.argv.slice(2));
} catch (error) {
  console.error(`api-reports: ${error.message}`);
  process.exit(2);
}
const { local: LOCAL, targets, packages: selectedPackages } = selection;
const scoped = selectedPackages.length > 0;
if (scoped) {
  console.log(
    `api-reports: selected package folders: ${selectedPackages.join(", ")}`
  );
}
// Check mode extracts into a throwaway folder and byte-compares against the
// committed reports — api-extractor's own "production build" verdict also
// fails on WARNINGS, which would make undocumented-symbol notes block CI.
// Compare the public surface and validate targets of deferred generated references.
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
 * One tally per warning class, so the closing line can name every one.
 *
 * A run that silences a class without counting it reports zero warnings while
 * holding some, which is the failure mode this replaced.
 */
const counts = {
  published: 0,
  publishedValueAlias: 0,
  publishedPropertyNormalizer: 0,
  subpath: 0,
  frontDoor: 0,
  valueBacked: 0,
  unresolvedLink: 0,
  missingReleaseTag: 0,
  other: 0,
};

/** Every entry point that hands back a type it does not export, named. */
const findings = [];
const reportReferenceFindings = [];
const valueAliasEvidence = new Set();
const propertyNormalizerEvidence = new Set();
const generatedReports = [];
const retention = { targets: 0, reports: 0 };

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
  const publishedBases = new Set();
  const valueAliases = entryValueAliases(entry);
  const propertyNormalizers = valueAliases.size
    ? entryPropertyNormalizers(entry)
    : new Map();
  // Captured BEFORE extraction: in local mode the extractor writes straight
  // into `etc/`, so reading afterwards would compare the file with itself.
  const committed = existsSync(join(ETC, report))
    ? readFileSync(join(ETC, report), "utf8")
    : "";
  const configFor = (includeForgottenExports) =>
    ExtractorConfig.prepare({
      configObject: {
        projectFolder: packageDir(dir),
        mainEntryPointFilePath: entry,
        apiReport: {
          enabled: true,
          // Source-proven aliases must retain the underlying reviewable contract.
          includeForgottenExports,
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
      packageJsonFullPath: join(packageDir(dir), "package.json"),
    });
  // Always a "local" build: warnings (undocumented symbols, missing release
  // tags) are review information inside the report, never a gate failure.
  const { result, fresh, missingTargets, retainedTargets } =
    extractWithReportRetention({
      includeForgottenExports: valueAliases.size > 0,
      publishedBases,
      readReport: () => readFileSync(join(OUT, report), "utf8"),
      invoke: ({ includeForgottenExports, compilerState, messageCallback }) =>
        Extractor.invoke(configFor(includeForgottenExports), {
          localBuild: true,
          showVerboseMessages: false,
          compilerState,
          messageCallback,
        }),
      onMessage: (message) => {
        // Both opening lines occur per invocation, including retention retries.
        // Each is said once for the run, so the version mismatch stays visible,
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
        const { kind, base, suffix, exportedAs, referencedBy } =
          classifyForgottenExport({
            symbol: named?.[1] ?? "",
            report,
            isMainEntry,
            exports: entryExported,
            valueAliases,
            propertyNormalizers,
          });
        if (kind === "published") {
          counts.published += 1;
          publishedBases.add(base);
          message.logLevel = "none";
          message.text += ` — deferred: ${report} exports ${base}, and ${suffix} is the bundler's private copy`;
          return;
        }
        if (kind === "published-value-alias") {
          counts.publishedValueAlias += 1;
          valueAliasEvidence.add(
            `${report}: ${named?.[1]} is nameable as typeof ${exportedAs}`
          );
          message.logLevel = "none";
          return;
        }
        if (kind === "published-property-normalizer") {
          counts.publishedPropertyNormalizer += 1;
          propertyNormalizerEvidence.add(
            `${report}: ${named?.[1]} only normalizes its own argument's properties in ${referencedBy}, nameable through typeof ${exportedAs}; exact definition retained in report`
          );
          // Keep the Extractor warning visible; only the separately proved guard
          // classification changes. A changed helper fails closed next time.
          message.text +=
            " — structurally proved closed property normalizer; exact definition retained in the API report";
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
  generatedReports.push(report);
  if (retainedTargets > 0) {
    retention.targets += retainedTargets;
    retention.reports += 1;
  }
  for (const { symbol, reason } of missingTargets) {
    reportReferenceFindings.push(`${report}: ${symbol} (${reason})`);
  }
  const same = fresh === committed;
  if (!LOCAL && !same) {
    console.error(
      `✗ ${report} is out of date — run \`pnpm api:reports\` and commit the diff.`
    );
    return false;
  }
  if (missingTargets.length > 0) {
    console.error(`✗ ${report}: incomplete deferred generated references`);
    return false;
  }
  console.log(`✓ ${report}`);
  return true;
}

mkdirSync(ETC, { recursive: true });
let ok = true;
for (const target of targets) {
  ok = extractOne(target) && ok;
}
// Only claim a match when every report actually matched. A run that prints
// "every committed report matches" under the line saying one is out of date is
// the same failure as reporting one warning class as if it were the total.
if (LOCAL && ok) {
  console.log(
    scoped
      ? "\napi-reports: selected reports regenerated — commit their changes under etc/."
      : "\napi-reports: regenerated — commit any changes under etc/."
  );
} else if (ok) {
  console.log(
    scoped
      ? "\napi-reports: every selected report matches the built types."
      : "\napi-reports: every committed report matches the built types."
  );
} else {
  console.error(
    scoped
      ? "\napi-reports: a selected report failed extraction, completeness, or comparison."
      : "\napi-reports: a report failed extraction, completeness, or comparison."
  );
}
console.log(summarize(counts));
if (retention.targets > 0) {
  console.log(
    `api-reports: retained ${retention.targets} source-proven generated reference target(s) in ${retention.reports} report(s).`
  );
}
if (reportReferenceFindings.length > 0) {
  console.error(
    `\n✗ ${reportReferenceFindings.length} deferred generated reference target(s) are incomplete in fresh API reports:\n  ` +
      reportReferenceFindings.join("\n  ") +
      "\n  Retain the referenced declaration or import in the extracted report."
  );
}
for (const evidence of valueAliasEvidence) {
  console.log(`api-reports: published-value-alias evidence: ${evidence}`);
}
for (const evidence of propertyNormalizerEvidence) {
  console.log(
    `api-reports: published-property-normalizer evidence: ${evidence}`
  );
}
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
if (!LOCAL) {
  finishApiReportOutput({
    output: OUT,
    diagnosticsDirectory: process.env.ADAPTTABLE_API_REPORTS_DIAGNOSTICS_DIR,
    reports: generatedReports,
    success: ok,
  });
}
if (!ok) process.exit(1);
