#!/usr/bin/env node
/** Retain official ESLint dry-run proposals for review without writing sources. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = JSON.parse(
  readFileSync(
    new URL("./vue-lint-diagnostic-files.json", import.meta.url),
    "utf8"
  )
);

const sha256 = (source) => createHash("sha256").update(source).digest("hex");

export function captureVueLintFixes({
  root = ROOT,
  outputFile = join(root, "reports/vue-eslint-fix-dry-run.json"),
  sourceCommit = process.env.GITHUB_SHA ?? null,
  run = spawnSync,
} = {}) {
  const args = [
    join(root, "node_modules/eslint/bin/eslint.js"),
    "--fix-dry-run",
    "--format",
    "json",
    ...TARGETS,
  ];
  const result = run(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 240_000,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `ESLint dry run failed: ${result.signal ?? result.status ?? "no exit status"}`
    );
  }
  const results = JSON.parse(result.stdout);
  if (!Array.isArray(results)) throw new Error("Expected ESLint JSON results");
  const proposals = results.flatMap((entry) => {
    const filePath = relative(root, entry.filePath).split(sep).join("/");
    if (!TARGETS.includes(filePath)) {
      throw new Error(`Unexpected ESLint result path: ${filePath}`);
    }
    if (typeof entry.output !== "string") return [];
    const source = readFileSync(join(root, filePath), "utf8");
    if (entry.output === source) return [];
    return [
      {
        filePath,
        sourceSha256: sha256(source),
        outputSha256: sha256(entry.output),
        output: entry.output,
        messages: entry.messages,
        errorCount: entry.errorCount,
        warningCount: entry.warningCount,
      },
    ];
  });
  const report = {
    schemaVersion: 1,
    sourceCommit,
    eslintExitCode: result.status,
    scannedFiles: results.length,
    proposals,
  };
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const report = captureVueLintFixes();
    console.log(
      `Vue ESLint dry run: ${report.proposals.length} proposed file changes; source files unchanged.`
    );
    process.exitCode = report.eslintExitCode;
  } catch (error) {
    console.error(`capture-vue-lint-fixes: ${error.message}`);
    process.exitCode = 2;
  }
}
