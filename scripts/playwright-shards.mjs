#!/usr/bin/env node
/**
 * Splits the browser suite into shards of equal measured time.
 *
 *   node scripts/playwright-shards.mjs --shard 3 --total 9 --timings <dir> --out <file>
 *
 * Reads Playwright JSON reports from `--timings` (the previous main run's),
 * lists the current tests, and packs them, in units of one file and its
 * top-level title, into `--total` lists of equal total time. Prints the
 * Playwright arguments for `--shard`: `--test-list <file>`, or `--shard=N/T`
 * when no timings are available, saying so on stderr.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The delimiter Playwright's test list splits a line on. */
const DELIMITER = " › ";

/**
 * Every test in a Playwright JSON report: its project, the test file that
 * loads it, the file that declares it (another file when the test file
 * imports specs), its titles and its run time.
 */
export function reportTests(report) {
  const tests = [];
  const walk = (suite, file, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const duration = (test.results ?? []).reduce(
          (total, result) => total + (result.duration ?? 0),
          0
        );
        tests.push({
          project: test.projectName,
          file,
          declaredIn: spec.file ?? file,
          titles: [...titles, spec.title],
          duration,
        });
      }
    }
    for (const child of suite.suites ?? []) {
      walk(child, file, [...titles, child.title]);
    }
  };
  for (const suite of report.suites ?? []) walk(suite, suite.file, []);
  return tests;
}

/**
 * The test files that import specs from other files. Playwright's test list
 * selects such a test only when it names both the loading file and the
 * declaring file, so these files are scheduled whole.
 */
function importingFiles(tests) {
  return new Set(
    tests
      .filter((test) => test.declaredIn !== test.file)
      .map((test) => test.file)
  );
}

/**
 * The unit a test is scheduled in, and the list lines that select it: one
 * file and its top-level title, or a whole file.
 */
function unitOf(test, wholeFiles) {
  const title = test.titles[0];
  // A title holding the list delimiter cannot be written as a line, so its
  // whole file is scheduled as one unit.
  const fileWide =
    wholeFiles.has(test.file) || title === undefined || title.includes("›");
  const select = (file, ...titles) =>
    [`[${test.project}]`, file, ...titles].join(DELIMITER);
  return {
    key: [test.project, test.file, fileWide ? "" : title].join("\u0000"),
    lines: fileWide
      ? [
          select(test.file),
          ...(test.declaredIn === test.file ? [] : [select(test.declaredIn)]),
        ]
      : [select(test.file, title)],
  };
}

/**
 * Packs the current tests into `total` lists of equal measured time, longest
 * unit first onto the lightest list. A unit with no measured time counts as
 * the median unit. Returns each list's lines and total milliseconds.
 */
export function planShards(currentTests, timedTests, total) {
  const wholeFiles = importingFiles(currentTests);
  const measured = new Map();
  for (const test of timedTests) {
    const { key } = unitOf(test, wholeFiles);
    measured.set(key, (measured.get(key) ?? 0) + test.duration);
  }
  const units = new Map();
  for (const test of currentTests) {
    const unit = unitOf(test, wholeFiles);
    const lines = units.get(unit.key) ?? new Set();
    for (const line of unit.lines) lines.add(line);
    units.set(unit.key, lines);
  }
  const known = [...units.keys()]
    .filter((key) => measured.has(key))
    .map((key) => measured.get(key))
    .sort((a, b) => a - b);
  const median = known.length > 0 ? known[Math.floor(known.length / 2)] : 1;
  const weighted = [...units.entries()]
    .map(([key, lines]) => ({
      lines: [...lines],
      ms: measured.get(key) ?? median,
    }))
    .sort((a, b) => b.ms - a.ms || a.lines[0].localeCompare(b.lines[0]));
  const shards = Array.from({ length: total }, () => ({ lines: [], ms: 0 }));
  for (const unit of weighted) {
    const lightest = shards.reduce((low, shard) =>
      shard.ms < low.ms ? shard : low
    );
    lightest.lines.push(...unit.lines);
    lightest.ms += unit.ms;
  }
  return shards;
}

/** The JSON reports under `dir`, at any depth, as downloaded artifacts land. */
function timingReports(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .filter((file) => String(file).endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(dir, String(file)), "utf8")));
}

/** The tests Playwright would run now, from `--list`. */
function currentTests(projects) {
  const cli = createRequire(import.meta.url).resolve("@playwright/test/cli");
  const output = execFileSync(
    process.execPath,
    [
      cli,
      "test",
      "--list",
      "--reporter=json",
      ...projects.map((project) => `--project=${project}`),
    ],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }
  );
  return reportTests(JSON.parse(output));
}

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  const shard = Number(option("shard"));
  const total = Number(option("total"));
  const out = option("out");
  const projects = (option("projects") ?? "chromium").split(",");
  if (!Number.isInteger(shard) || !Number.isInteger(total) || !out) {
    throw new Error(
      "usage: playwright-shards --shard N --total T --out FILE [--timings DIR] [--projects a,b]"
    );
  }
  const timed = timingReports(option("timings")).flatMap(reportTests);
  if (timed.length === 0) {
    console.error(
      "playwright-shards: no timings from the previous run; splitting by test count."
    );
    process.stdout.write(`--shard=${shard}/${total}\n`);
    return;
  }
  const shards = planShards(currentTests(projects), timed, total);
  const own = shards[shard - 1];
  writeFileSync(out, `${own.lines.join("\n")}\n`);
  console.error(
    `playwright-shards: shard ${shard}/${total} holds ${own.lines.length} unit(s), about ${Math.round(own.ms / 60000)} min measured.`
  );
  process.stdout.write(`--test-list ${out}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
