#!/usr/bin/env node
/**
 * Require each invalid Vue consumer to fail for its intended type error.
 * Run after the package's positive `vue-tsc --noEmit` check, from that package:
 *
 *   node ../../../scripts/check-vue-types.mjs
 *
 * The invalid fixtures have their own tsconfig so they remain visible to
 * ESLint without entering the positive typecheck. A nonzero compiler exit
 * alone proves nothing: missing imports, unrelated source failures and a
 * fixture that unexpectedly starts compiling must all fail this harness.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Every fixture's diagnostic identity, separate from the invalid source. */
export const VUE_TYPE_EXPECTATIONS = {
  "@adapttable/vue": {
    "WrongRenderer.vue": [
      {
        code: 2322,
        message: /Type 'string' is not assignable to type 'number'/,
      },
    ],
    "WrongRows.vue": [
      {
        code: 2322,
        message:
          /Type 'TableFeature<Invoice>' is not assignable to type 'ComposedFeature<NoInfer<Person>>'/,
      },
    ],
  },
  "@adapttable/vue-unstyled": {
    "InvalidRow.vue": [
      {
        code: 2322,
        message: /is not assignable to type 'readonly number\[\]'/,
      },
    ],
    "InvalidSelection.vue": [
      {
        code: 2322,
        message:
          /Type 'number\[\]' is not assignable to type 'readonly string\[\]'/,
      },
      {
        code: 2322,
        message: /Type 'string\[\]' is not assignable to type 'number\[\]'/,
      },
    ],
    "InvalidSlot.vue": [
      { code: 2339, message: /Property 'missing' does not exist on type/ },
    ],
    "InvalidValue.vue": [
      {
        code: 2339,
        message: /Property 'toUpperCase' does not exist on type 'number'/,
      },
    ],
  },
};

/** Parse plain vue-tsc diagnostics; retain unexpected output as a failure. */
export function parseDiagnostics(output) {
  const diagnostics = [];
  const unexpected = [];
  let current;
  for (const line of output.split(/\r?\n/)) {
    const match = /^(.*)\((\d+),(\d+)\): error TS(\d+): (.*)$/.exec(line);
    if (match) {
      current = {
        file: match[1].replaceAll("\\", "/"),
        code: Number(match[4]),
        message: match[5],
      };
      diagnostics.push(current);
    } else if (current && /^\s+\S/.test(line)) {
      current.message += `\n${line}`;
    } else if (line.trim()) {
      unexpected.push(line);
      current = undefined;
    }
  }
  return { diagnostics, unexpected };
}

/** Keep the registered expectations and on-disk negative fixtures in sync. */
function fixtureProblems(files, expectations) {
  const problems = [];
  const expectedFiles = Object.keys(expectations);
  if (files.length === 0) problems.push("No invalid Vue fixtures found");
  for (const file of files) {
    if (!expectations[file]?.length) {
      problems.push(`${file}: no expected diagnostic registered`);
    }
  }
  for (const file of expectedFiles) {
    if (!files.includes(file)) problems.push(`${file}: fixture is missing`);
  }
  return problems;
}

/** Require every expected diagnostic and reject every unexpected diagnostic. */
export function diagnosticProblems({
  files,
  expectations,
  output,
  status,
  cwd,
  fixtureDir,
}) {
  const problems = [];
  if (status !== 2) {
    problems.push(`vue-tsc exited ${status}; expected diagnostic exit 2`);
  }
  problems.push(...fixtureProblems(files, expectations));
  const { diagnostics, unexpected } = parseDiagnostics(output);
  problems.push(
    ...unexpected.map((line) => `Unexpected compiler output: ${line}`)
  );
  const byFile = new Map();
  for (const diagnostic of diagnostics) {
    const file = relative(fixtureDir, resolve(cwd, diagnostic.file)).replaceAll(
      "\\",
      "/"
    );
    const found = byFile.get(file) ?? [];
    found.push(diagnostic);
    byFile.set(file, found);
    if (
      !expectations[file]?.some(
        (expected) =>
          expected.code === diagnostic.code &&
          expected.message.test(diagnostic.message)
      )
    ) {
      problems.push(
        `${diagnostic.file}: unexpected TS${diagnostic.code}: ${diagnostic.message}`
      );
    }
  }
  for (const [file, expected] of Object.entries(expectations)) {
    for (const diagnostic of expected) {
      if (
        !byFile
          .get(file)
          ?.some(
            (found) =>
              found.code === diagnostic.code &&
              diagnostic.message.test(found.message)
          )
      ) {
        problems.push(
          `${file}: missing expected TS${diagnostic.code} ${diagnostic.message}`
        );
      }
    }
  }
  return problems;
}

/** Discover nested fixtures too, so an unregistered file cannot go unnoticed. */
export function invalidFixtures(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const file = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory())
        return invalidFixtures(join(dir, entry.name), file);
      return entry.name.endsWith(".vue") ? [file] : [];
    })
    .sort();
}

export function checkVueTypes(cwd = process.cwd()) {
  const { name } = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const expectations = VUE_TYPE_EXPECTATIONS[name];
  if (!expectations)
    throw new Error(`${name}: no Vue type fixtures registered`);
  const fixtureDir = join(cwd, "test/types/invalid");
  const files = invalidFixtures(fixtureDir);
  const compiler = createRequire(import.meta.url).resolve(
    "vue-tsc/bin/vue-tsc.js"
  );
  const result = spawnSync(
    process.execPath,
    [
      compiler,
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      join(fixtureDir, "tsconfig.json"),
    ],
    { cwd, encoding: "utf8" }
  );
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`vue-tsc terminated by ${result.signal}`);
  const problems = diagnosticProblems({
    files,
    expectations,
    output: `${result.stdout}\n${result.stderr}`,
    status: result.status,
    cwd,
    fixtureDir,
  });
  if (problems.length) throw new Error(problems.join("\n"));
  return `${name}: ${files.length} invalid Vue consumers rejected as expected`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(checkVueTypes());
  } catch (error) {
    console.error(`Vue type fixtures: ${error.message}`);
    process.exitCode = 1;
  }
}
