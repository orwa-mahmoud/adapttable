/**
 * Source export extraction with one short-lived process per package.
 *
 * A single TypeScript program over every kit keeps all framework dependency
 * graphs alive at once. Serial processes bound that cost to one package's
 * complete entry group and release its compiler heap before starting the next.
 * Only names cross the boundary; the parent never imports TypeScript.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const WORKER = fileURLToPath(import.meta.url);
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

/** A successful exit alone is not proof that every requested entry was read. */
function validOutput(output, group) {
  if (
    !hasKeys(output, ["pkg", "entries"]) ||
    output.pkg !== group.pkg ||
    !Array.isArray(output.entries) ||
    output.entries.length !== group.entries.length
  ) {
    return false;
  }
  return output.entries.every((entry, index) => {
    const expected = group.entries[index];
    return (
      hasKeys(entry, ["label", "entry", "names"]) &&
      entry.label === expected.label &&
      entry.entry === expected.entry &&
      validNames(entry.names)
    );
  });
}

function hasKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function validNames(names) {
  return (
    Array.isArray(names) &&
    names.every((name) => typeof name === "string" && name !== "default") &&
    new Set(names).size === names.length &&
    names.every(
      (name, index) => index === 0 || names[index - 1].localeCompare(name) <= 0
    )
  );
}

function readResult(result, group) {
  const prefix = `doc-surface: export worker for ${group.pkg}`;
  if (result.error) {
    throw new Error(`${prefix} failed: ${result.error.message}`, {
      cause: result.error,
    });
  }
  if (result.status !== 0 || result.signal) {
    const reason = result.signal
      ? `signal ${result.signal}`
      : `exit ${result.status ?? "unknown"}`;
    throw new Error(`${prefix} failed (${reason}): ${result.stderr ?? ""}`);
  }
  let output;
  try {
    output = JSON.parse(result.stdout);
  } catch (cause) {
    throw new Error(`${prefix} returned invalid JSON`, { cause });
  }
  if (!validOutput(output, group)) {
    throw new Error(`${prefix} returned invalid or incomplete export data`);
  }
  return output.entries.map(({ label, names }) => ({ pkg: label, names }));
}

/**
 * Run synchronously so no compiler processes overlap, even when a worker
 * fails. Injectable spawning lets fixtures prove that failures cannot silently
 * turn into empty export surfaces or let a later package mask a failed one.
 */
export function extractPackageExports(groups, runWorker = spawnSync) {
  const surfaces = [];
  for (const group of groups) {
    const result = runWorker(process.execPath, [WORKER], {
      input: JSON.stringify(group),
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT_BYTES,
      stdio: ["pipe", "pipe", "pipe"],
    });
    surfaces.push(...readResult(result, group));
  }
  return surfaces;
}

function exportsOf(program, checker, entryPath) {
  const source = program.getSourceFile(entryPath);
  if (!source) throw new Error(`Missing entry ${entryPath}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`No module symbol for ${entryPath}`);
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.name)
    .filter((name) => name !== "default")
    .sort((a, b) => a.localeCompare(b));
}

async function workerMain() {
  const group = JSON.parse(readFileSync(0, "utf8"));
  // Keep the source-based checker and its options identical to the original
  // all-packages audit. No dist files, regex approximation or package filters.
  const { default: ts } = await import("typescript");
  const program = ts.createProgram(
    group.entries.map(({ entry }) => entry),
    {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      skipLibCheck: true,
    }
  );
  const checker = program.getTypeChecker();
  const entries = group.entries.map((surface) => ({
    ...surface,
    names: exportsOf(program, checker, surface.entry),
  }));
  process.stdout.write(JSON.stringify({ pkg: group.pkg, entries }));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await workerMain();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
