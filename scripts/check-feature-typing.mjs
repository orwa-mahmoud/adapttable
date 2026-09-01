#!/usr/bin/env node
/**
 * The `features` array compiles the way the docs write it — and still refuses
 * the wrong row.
 *
 * Every documented example omits type arguments (`features={[grouping("team"),
 * virtualize()]}`), and for most of v2 that did not compile: a factory with
 * nothing row-shaped to infer from resolved `TRow` to `unknown`, which was not
 * a `TableFeature<Row>`. The docs showed one thing and the compiler demanded
 * another — `grouping<Row>("team")` — so the shipped examples were wrong.
 *
 * Variance fixed it, and variance is exactly the kind of thing that regresses
 * silently: a phantom marker moved from a contravariant position back to a
 * covariant one breaks every documented example at once, and no runtime test
 * notices. So the compiler is the test. The fixtures have opposite
 * expectations:
 *
 * - `typing-fixtures/documented.ts` must compile clean. It is the docs.
 * - Both `preset-*.tsx` fixtures must compile a real adapter `DataTable`
 *   without a type argument or cast.
 * - `typing-fixtures/wrong-row.ts` must NOT compile, and the diagnostic has to
 *   name the offending feature, so a caller mixing row types is told which
 *   entry is wrong rather than that the array is.
 *
 *   node scripts/check-feature-typing.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(REPO_ROOT, "scripts", "typing-fixtures");

/** The same compiler settings the packages build under. */
const OPTIONS = {
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  // The fixtures import the package by name, as a consumer does. Resolve
  // those names to SOURCE rather than `dist`, so the check runs before a
  // build and cannot pass on a stale one.
  baseUrl: REPO_ROOT,
  paths: {
    "@adapttable/core": ["packages/core/src/index.ts"],
    "@adapttable/core/*": ["packages/core/src/*.ts"],
    "@adapttable/mui": ["packages/adapter-mui/src/index.ts"],
    "@adapttable/mui/*": ["packages/adapter-mui/src/*.ts"],
  },
};

/** Type-check one fixture and return its diagnostics as plain text. */
function diagnose(file) {
  const program = ts.createProgram([join(FIXTURES, file)], OPTIONS);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName.endsWith(file))
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
}

/** Type-check generated consumer source against one adapter's source entry. */
function diagnoseGenerated(file, source, packageName, packageDir) {
  const virtualFile = join(FIXTURES, file);
  const options = {
    ...OPTIONS,
    paths: {
      ...OPTIONS.paths,
      [`@adapttable/${packageName}/preset`]: [
        `packages/adapter-${packageDir}/src/preset.ts`,
      ],
    },
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  host.fileExists = (name) => name === virtualFile || fileExists(name);
  host.readFile = (name) => (name === virtualFile ? source : readFile(name));
  host.getSourceFile = (name, languageVersion, onError, shouldCreate) =>
    name === virtualFile
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile(name, languageVersion, onError, shouldCreate);
  const program = ts.createProgram([virtualFile], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === virtualFile)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
}

const problems = [];

const documented = diagnose("documented.ts");
if (documented.length > 0) {
  problems.push(
    "documented.ts must compile with no type arguments, and does not:\n    " +
      documented.join("\n    ")
  );
}

for (const fixture of ["preset-bare.tsx", "preset-configured.tsx"]) {
  const diagnostics = diagnose(fixture);
  if (diagnostics.length > 0) {
    problems.push(
      `${fixture} must compile with no type argument or cast, and does not:\n    ` +
        diagnostics.join("\n    ")
    );
  }
}

const presetContract = (packageName) => `
import type { StaticTableFeature, TableFeature } from "@adapttable/core";
import {
  standardFeatures,
  type StandardFeatureOptions,
} from "@adapttable/${packageName}/preset";

type PresetContract = <TRow>(
  options?: StandardFeatureOptions<TRow>
) => TableFeature<TRow>[];

export const preset: PresetContract = standardFeatures;
export const bare: StaticTableFeature[] = standardFeatures();
`;

for (const [packageName, packageDir] of [
  ["antd", "antd"],
  ["base-ui", "base-ui"],
  ["chakra", "chakra"],
  ["mantine", "mantine"],
  ["mui", "mui"],
  ["radix", "radix"],
  ["shadcn", "shadcn"],
  ["unstyled", "unstyled"],
]) {
  const diagnostics = diagnoseGenerated(
    `preset-${packageName}-parity.ts`,
    presetContract(packageName),
    packageName,
    packageDir
  );
  if (diagnostics.length > 0) {
    problems.push(
      `${packageName} preset does not match the shared generic contract:\n    ` +
        diagnostics.join("\n    ")
    );
  }
}

const wrong = diagnose("wrong-row.ts");
if (wrong.length === 0) {
  problems.push(
    "wrong-row.ts compiles, so a feature built for one row type is being " +
      "accepted by a table of another."
  );
} else if (!wrong.some((message) => message.includes("TableFeature<Person>"))) {
  problems.push(
    "wrong-row.ts fails, but the diagnostic does not name the feature's own " +
      "row type:\n    " +
      wrong.join("\n    ")
  );
}

if (problems.length > 0) {
  console.error(`feature typing: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  "feature typing: documented and preset arrays compile bare, and the wrong " +
    "row still names the feature"
);
