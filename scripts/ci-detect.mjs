/**
 * Classify a git-diff path list for the PR workflow and for husky
 * (`check:if-needed`). Strings in, flags out — callers talk to git; tests
 * drive this layer.
 */

const ROOT_README = /^README\.md$/;

const PLAYWRIGHT =
  /^(packages\/|apps\/showcase\/|e2e\/|playwright\.config\.ts$|pnpm-lock\.yaml$)/;

const BENCH =
  /^(packages\/|apps\/showcase\/|scripts\/bench\.mjs$|pnpm-lock\.yaml$)/;

const PACKAGES =
  /^(packages\/|pnpm-lock\.yaml$|scripts\/consumer-harness\.mjs$)/;

const WORKFLOW = /^\.github\/(workflows\/|actions\/)/;

const ROOT_TOOLING = /^(scripts\/|vitest\.shared\.ts$|eslint\.config\.mjs$)/;

const DOCS_OR_META =
  /^(docs\/|.*\.md$|llms.*\.txt$|.*\/robots\.txt$|\.github\/|\.changeset\/|ai_docs\/)/;

const VERSION_ONLY =
  /^(packages\/[^/]+\/(package\.json|CHANGELOG\.md)|\.changeset\/)/;

/**
 * @param {string[]} files paths relative to the repo root, one per change
 * @returns {{
 *   runLint: boolean,
 *   runLintRoot: boolean,
 *   runUnit: boolean,
 *   runPackage: boolean,
 *   runPublint: boolean,
 *   runPlaywright: boolean,
 *   runBench: boolean,
 *   runPreview: boolean,
 *   needBuild: boolean,
 *   versionOnly: boolean,
 * }}
 */
export function classify(files) {
  const list = files.map((f) => f.trim()).filter(Boolean);

  if (list.some((f) => ROOT_README.test(f)) || list.length === 0) {
    return gate({
      runLint: true,
      runLintRoot: true,
      runUnit: true,
      runPackage: true,
      runPublint: true,
      runPlaywright: true,
      runBench: true,
      runPreview: true,
      versionOnly: false,
    });
  }

  const workflow = list.some((f) => WORKFLOW.test(f));
  const versionOnly = !workflow && list.every((f) => VERSION_ONLY.test(f));
  const docsOnly =
    !workflow &&
    !versionOnly &&
    list.every((f) => DOCS_OR_META.test(f) && !PACKAGES.test(f));
  const packagesChanged = list.some((f) => PACKAGES.test(f));
  const rootTooling = list.some((f) => ROOT_TOOLING.test(f));
  const playwright = list.some((f) => PLAYWRIGHT.test(f));
  const bench = list.some((f) => BENCH.test(f));

  if (docsOnly) {
    return gate({
      runLint: false,
      runLintRoot: false,
      runUnit: false,
      runPackage: false,
      runPublint: false,
      runPlaywright: false,
      runBench: false,
      runPreview: false,
      versionOnly: false,
    });
  }

  if (versionOnly) {
    return gate({
      runLint: false,
      runLintRoot: false,
      runUnit: false,
      runPackage: false,
      runPublint: true,
      runPlaywright: false,
      runBench: false,
      runPreview: false,
      versionOnly: true,
    });
  }

  return gate({
    runLint: packagesChanged || workflow,
    runLintRoot: packagesChanged || workflow || rootTooling,
    runUnit: packagesChanged,
    runPackage: packagesChanged,
    runPublint: packagesChanged,
    runPlaywright: playwright,
    runBench: bench,
    runPreview: packagesChanged,
    versionOnly: false,
  });
}

function gate(flags) {
  return {
    ...flags,
    needBuild:
      flags.runLint || flags.runUnit || flags.runPackage || flags.runPublint,
  };
}

function parseArgs(argv) {
  const files = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--files") continue;
    files.push(a);
  }
  return files;
}

function printOutputs(flags) {
  const lines = Object.entries(flags).map(([k, v]) => {
    let printed = v;
    if (v === true) printed = "true";
    else if (v === false) printed = "false";
    return `${k}=${printed}`;
  });
  process.stdout.write(`${lines.join("\n")}\n`);
}

const invokedDirectly = process.argv[1]?.endsWith("ci-detect.mjs");
if (invokedDirectly) {
  const readStdin = async () => {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks)
      .toString("utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  };
  const files = process.stdin.isTTY
    ? parseArgs(process.argv)
    : await readStdin();
  printOutputs(classify(files));
}
