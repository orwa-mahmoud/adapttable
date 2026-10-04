import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

import { missingDeferredReportTargets } from "./api-report-references.mjs";
import { classifyForgottenExport, entryExports } from "./api-warnings.mjs";

// A minimal emitted declaration that reproduces the assistant report defect:
// the public alias is nameable in source, but Extractor omits its private target.
const source = `
import { StaticTableFeature as StaticTableFeature$1 } from "./features";
/** @public */
type StaticTableFeature = StaticTableFeature$1;
/** @public */
declare function createFeature(): StaticTableFeature;
export { type StaticTableFeature, createFeature };
`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-report-completeness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scripts = join(root, "scripts");
  const modules = join(root, "node_modules");
  const pkg = join(root, "packages", "shared", "fixture");
  for (const directory of [scripts, modules, pkg])
    mkdirSync(directory, { recursive: true });
  for (const file of [
    "api-reports.mjs",
    "api-entrypoints.mjs",
    "api-report-diagnostics.mjs",
    "api-report-references.mjs",
    "api-report-retention.mjs",
    "api-report-selection.mjs",
    "api-warnings.mjs",
    "packed-names.mjs",
    "packages.mjs",
    "kits.mjs",
  ])
    copyFileSync(new URL(`./${file}`, import.meta.url), join(scripts, file));
  // Keep Extractor's temporary output local; dependency links are read-only.
  const dependencies = fileURLToPath(
    new URL("../node_modules/", import.meta.url)
  );
  for (const dependency of ["@microsoft", "@types", "typescript"])
    symlinkSync(
      realpathSync(join(dependencies, dependency)),
      join(modules, dependency),
      "dir"
    );
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ private: true, type: "module" })
  );
  writeFileSync(
    join(pkg, "package.json"),
    JSON.stringify({
      name: "report-fixture",
      version: "1.0.0",
      exports: { ".": { types: "./index.d.ts" } },
    })
  );
  writeFileSync(
    join(pkg, "features.d.ts"),
    `
/** @public */
export interface StaticTableFeature {
  setup(): void;
  mount(): void;
}
`
  );
  const entry = join(pkg, "index.d.ts");
  writeFileSync(entry, source);
  return { root, entry, report: join(root, "etc", "fixture.api.md") };
}

function run(root, ...args) {
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts", "api-reports.mjs"), ...args],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        ADAPTTABLE_API_REPORTS_DIAGNOSTICS_DIR: join(root, "diagnostics"),
      },
    }
  );
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

function extractRaw(paths, includeForgottenExports = false) {
  const reportFileName = includeForgottenExports
    ? "raw-retained.api.md"
    : "raw.api.md";
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: dirname(paths.entry),
      mainEntryPointFilePath: paths.entry,
      apiReport: {
        enabled: true,
        includeForgottenExports,
        reportFileName,
        reportFolder: paths.root,
        reportTempFolder: join(paths.root, "raw-temp"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      compiler: {
        overrideTsconfig: {
          compilerOptions: { lib: ["ES2022"], types: [], skipLibCheck: true },
        },
      },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: join(dirname(paths.entry), "package.json"),
  });
  const forgotten = [];
  const result = Extractor.invoke(config, {
    localBuild: true,
    messageCallback(message) {
      if (message.messageId === "ae-forgotten-export")
        forgotten.push(/"([^"]+)"/.exec(message.text)?.[1]);
      message.handled = true;
    },
  });
  assert.equal(result.succeeded, true);
  return {
    report: readFileSync(join(paths.root, reportFileName), "utf8"),
    forgotten,
  };
}

test("real malformed extraction stays a red fixture while source-proven retention repairs the report", (t) => {
  const paths = fixture(t);
  const raw = extractRaw(paths);
  assert.ok(raw.forgotten.includes("StaticTableFeature_2"));
  assert.equal(
    classifyForgottenExport({
      symbol: "StaticTableFeature_2",
      report: "fixture.api.md",
      isMainEntry: true,
      exports: entryExports(paths.entry),
    }).kind,
    "published"
  );
  assert.match(
    raw.report,
    /export type StaticTableFeature = StaticTableFeature_2;/
  );
  assert.doesNotMatch(
    raw.report,
    /(?:interface|type|class|import) StaticTableFeature_2\b/
  );
  assert.deepEqual(
    missingDeferredReportTargets(raw.report, new Set(["StaticTableFeature"])),
    [
      {
        symbol: "StaticTableFeature_2",
        reason: "missing import or declaration",
      },
    ]
  );

  // Bad committed bytes must be replaced and reviewed, never accepted because
  // the ordinary first extraction happens to reproduce the same incomplete file.
  mkdirSync(dirname(paths.report));
  writeFileSync(paths.report, raw.report);
  const changed = run(paths.root);
  assert.equal(changed.status, 1, changed.output);
  assert.match(changed.output, /out of date/);
  assert.match(
    changed.output,
    /retained 1 source-proven generated reference target\(s\) in 1 report\(s\)/
  );
  const fixed = readFileSync(
    join(paths.root, "diagnostics", "fixture.api.md"),
    "utf8"
  );
  assert.match(fixed, /interface StaticTableFeature_2/);
  assert.deepEqual(
    missingDeferredReportTargets(fixed, new Set(["StaticTableFeature"])),
    []
  );
  assert.equal(
    readFileSync(join(paths.root, "raw.api.md"), "utf8"),
    raw.report
  );

  const local = run(paths.root, "--local");
  assert.equal(local.status, 0, local.output);
  assert.match(local.output, /1 published-name copy\(s\)/);
  assert.doesNotMatch(local.output, /2 published-name copy/);
  const check = run(paths.root, "--package", "fixture");
  assert.equal(check.status, 0, check.output);
  assert.match(check.output, /every selected report matches/);
});

test("retained exact definitions pass without changing either source deferral", (t) => {
  const paths = fixture(t);
  writeFileSync(
    paths.entry,
    source +
      `
/** @public */
declare function implementation<T>(row: T): T;
/** @public */
declare const RuntimeValue: typeof implementation;
export { RuntimeValue };
`
  );
  const local = run(paths.root, "--local");
  assert.equal(local.status, 0, local.output);
  assert.match(
    local.output,
    /1 published-name copy\(s\), 1 published-value-alias\(es\)/
  );
  assert.match(
    readFileSync(paths.report, "utf8"),
    /interface StaticTableFeature_2/
  );
  const check = run(paths.root);
  assert.equal(check.status, 0, check.output);
  assert.match(check.output, /every committed report matches/);
});

test("ordinary unexported types stay failing findings", (t) => {
  const paths = fixture(t);
  writeFileSync(
    paths.entry,
    "interface PrivateResult { secret: string } declare function createFeature(): PrivateResult; export { createFeature };"
  );
  const local = run(paths.root, "--local");
  assert.equal(local.status, 1, local.output);
  assert.match(local.output, /1 at a front door/);
  assert.match(local.output, /PrivateResult \(main entry\)/);
  assert.doesNotMatch(local.output, /published-name copy/);
});

test("a mixed entry retains a published copy but private members remain hard failures before and after", (t) => {
  const paths = fixture(t);
  writeFileSync(
    paths.entry,
    source +
      `
interface PrivateMember { secret: string; }
interface Mixed { feature: StaticTableFeature; privateMember: PrivateMember; }
export { type Mixed };
`
  );
  for (const includeForgottenExports of [false, true]) {
    const raw = extractRaw(paths, includeForgottenExports);
    assert.ok(raw.forgotten.includes("PrivateMember"));
    assert.equal(
      classifyForgottenExport({
        symbol: "PrivateMember",
        report: "fixture.api.md",
        isMainEntry: true,
        exports: entryExports(paths.entry),
      }).kind,
      "front-door"
    );
  }
  const local = run(paths.root, "--local");
  assert.equal(local.status, 1, local.output);
  assert.match(local.output, /1 published-name copy\(s\), 1 at a front door/);
  assert.match(
    local.output,
    /retained 1 source-proven generated reference target\(s\) in 1 report\(s\)/
  );
  assert.match(local.output, /PrivateMember \(main entry\)/);
  const fresh = readFileSync(paths.report, "utf8");
  assert.match(fresh, /interface StaticTableFeature_2/);
  assert.match(fresh, /interface PrivateMember/);
  assert.deepEqual(
    missingDeferredReportTargets(fresh, new Set(["StaticTableFeature"])),
    []
  );
  const check = run(paths.root);
  assert.equal(check.status, 1, check.output);
  assert.match(check.output, /1 at a front door/);
  assert.match(check.output, /PrivateMember \(main entry\)/);
  assert.equal(
    readFileSync(join(paths.root, "diagnostics", "fixture.api.md"), "utf8"),
    fresh
  );
});
