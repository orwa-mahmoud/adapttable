/** Release each framework's typed project before linting the next one. */
import { spawnSync } from "node:child_process";
import { readdir, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { lintVuePackage } from "./vue-typed-lint.mjs";

export const showcaseLintGroups = [
  {
    name: "React and shared",
    patterns: ["."],
    ignorePatterns: ["src/angular/**", "src/vue/**"],
  },
  { name: "Angular", patterns: ["src/angular/**"], ignorePatterns: [] },
  { name: "Vue", patterns: ["src/vue/**"], ignorePatterns: [] },
];

function runESLint(args, cwd) {
  const require = createRequire(join(cwd, "package.json"));
  const executable = resolve(
    dirname(require.resolve("eslint/package.json")),
    "bin/eslint.js"
  );
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

async function runVueESLint(args, cwd) {
  const sources = await readdir(join(cwd, "src/vue"), {
    recursive: true,
  }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  if (!sources.some((source) => source.endsWith(".vue"))) {
    return runESLint(args, cwd);
  }
  return lintVuePackage({
    cwd,
    tsconfig: "src/vue/tsconfig.json",
    lintArgs: args,
  });
}

export async function lintShowcase(
  { cwd = process.cwd(), lintArgs = [] } = {},
  run = runESLint,
  runVue = runVueESLint
) {
  const args = lintArgs[0] === "--" ? lintArgs.slice(1) : lintArgs;
  // Options that aggregate warnings, write one report, or select custom files
  // retain ordinary ESLint CLI semantics. The normal lint and fix gates run
  // each existing framework project in a fresh, sequential process.
  if (args.some((argument) => !["--fix", "--fix-dry-run"].includes(argument))) {
    return runVue([".", ...args], cwd);
  }
  let exitCode = 0;
  for (const group of showcaseLintGroups) {
    console.log(`Showcase ESLint: ${group.name}`);
    const status = await (group.name === "Vue" ? runVue : run)(
      [
        ...group.patterns,
        ...group.ignorePatterns.flatMap((pattern) => [
          "--ignore-pattern",
          pattern,
        ]),
        "--no-error-on-unmatched-pattern",
        ...args,
      ],
      cwd
    );
    exitCode = Math.max(exitCode, status);
  }
  return exitCode;
}

// Resolve both paths so invoking this script through a symlink still runs it.
const entrypoint = process.argv[1]
  ? await realpath(process.argv[1]).catch(() => undefined)
  : undefined;
if (entrypoint === (await realpath(fileURLToPath(import.meta.url)))) {
  try {
    process.exitCode = await lintShowcase({ lintArgs: process.argv.slice(2) });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
