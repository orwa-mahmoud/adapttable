import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { KITS } from "./detect";
import { migrateVueScripts, type MigrationResult } from "./importMigration";
import { InitError, type InitIO, runInit } from "./init";
import { migrateV3Source } from "./migrateV3";
import { migrateV4File, migrateV4Source } from "./migrateV4";

/** Each migrate command and the transform it applies. */
const MIGRATIONS: Readonly<
  Record<string, (source: string) => MigrationResult>
> = {
  "migrate-v3": migrateV3Source,
  "migrate-v4": migrateV4Source,
};

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
  ".vue",
]);
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

function createNodeIO(cwd: string): InitIO {
  return {
    readFile(relativePath) {
      const full = resolve(cwd, relativePath);
      return existsSync(full) ? readFileSync(full, "utf8") : undefined;
    },
    writeFile(relativePath, contents) {
      const full = resolve(cwd, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, contents, "utf8");
    },
    exists(relativePath) {
      return existsSync(resolve(cwd, relativePath));
    },
    listRootFiles() {
      try {
        return readdirSync(cwd);
      } catch {
        return [];
      }
    },
    log(message) {
      console.log(message);
    },
  };
}

function sourceFiles(path: string): string[] {
  if (!existsSync(path)) {
    throw new InitError(`Migration path does not exist: ${path}`);
  }
  const real = realpathSync(path);
  const stat = statSync(real);
  if (stat.isFile()) {
    return SOURCE_EXTENSIONS.has(extname(real)) ? [real] : [];
  }
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(real, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const child = resolve(real, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name))
        files.push(...sourceFiles(child));
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(child);
    }
  }
  return files;
}

function migrateFile(
  command: string,
  cwd: string,
  file: string,
  check: boolean,
  migrate: (source: string) => MigrationResult
): { changedFiles: number; movedImports: number; issueCount: number } {
  const source = readFileSync(file, "utf8");
  const result = migratedSource(command, file, source, migrate);
  const displayPath = relative(cwd, file) || file;
  if (result.changed && !check) writeFileSync(file, result.code, "utf8");
  for (const issue of result.issues) {
    console.error(
      `${displayPath}:${issue.line}:${issue.column} ${issue.message}`
    );
  }
  return {
    changedFiles: result.changed ? 1 : 0,
    movedImports: result.movedImports,
    issueCount: result.issues.length,
  };
}

function migratedSource(
  command: string,
  file: string,
  source: string,
  migrate: (source: string) => MigrationResult
): MigrationResult {
  if (command === "migrate-v4") return migrateV4File(source, file);
  if (file.endsWith(".vue")) return migrateVueScripts(source, migrate);
  if (file.endsWith(".html")) {
    return { code: source, changed: false, movedImports: 0, issues: [] };
  }
  return migrate(source);
}

function runMigrate(
  command: string,
  migrate: (source: string) => MigrationResult,
  cwd: string,
  argv: readonly string[]
): number {
  const check = argv.includes("--check");
  const unknownOption = argv.find(
    (argument) => argument.startsWith("-") && argument !== "--check"
  );
  if (unknownOption) {
    throw new InitError(`Unknown ${command} option: ${unknownOption}`);
  }

  const inputs = argv.filter((argument) => !argument.startsWith("-"));
  const files = [
    ...new Set(
      (inputs.length ? inputs : ["."]).flatMap((input) =>
        sourceFiles(resolve(cwd, input))
      )
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const root = realpathSync(cwd);
  let changedFiles = 0;
  let movedImports = 0;
  let issueCount = 0;

  for (const file of files) {
    const result = migrateFile(command, root, file, check, migrate);
    changedFiles += result.changedFiles;
    movedImports += result.movedImports;
    issueCount += result.issueCount;
  }

  const verb = check ? "Would update" : "Updated";
  console.log(
    `${verb} ${changedFiles} file(s); moved ${movedImports} import(s).`
  );
  if (issueCount > 0) {
    console.error(
      `${issueCount} ambiguous migration(s) require manual changes; no guesses were written.`
    );
  }
  if (changedFiles > 0 && check) return 1;
  return issueCount > 0 ? 1 : 0;
}

function main(argv: readonly string[], cwd: string): number {
  const command = argv[0];
  // A bare `adapttable` must never write files — require the explicit
  // command and show usage instead.
  if (
    command === undefined ||
    command === "--help" ||
    command === "-h" ||
    command === "help"
  ) {
    console.log(
      "Usage:\n  adapttable init [--force] [--kit <kit>]\n  adapttable migrate-v3 [paths...] [--check]\n  adapttable migrate-v4 [paths...] [--check]\n\nScaffold a table or migrate the provably safe parts of v2 or v3 source."
    );
    return 0;
  }
  const migrate = MIGRATIONS[command];
  if (command !== "init" && migrate === undefined) {
    console.error(
      `Unknown command "${command}". Try: adapttable init, adapttable migrate-v3 or adapttable migrate-v4`
    );
    return 1;
  }

  try {
    if (migrate) {
      return runMigrate(command, migrate, cwd, argv.slice(1));
    }
    const io = createNodeIO(cwd);
    let kit;
    for (let index = 1; index < argv.length; index++) {
      const argument = argv[index];
      if (argument === "--force") continue;
      if (argument !== "--kit")
        throw new InitError(`Unknown init option: ${argument}`);
      const name = argv[++index];
      kit = KITS.find((entry) => entry.kit === name)?.kit;
      if (kit === undefined)
        throw new InitError(`Unknown kit: ${name ?? "(missing --kit value)"}`);
    }
    runInit(io, { force: argv.includes("--force"), kit });
    return 0;
  } catch (error) {
    const message = error instanceof InitError ? error.message : String(error);

    console.error(`adapttable: ${message}`);
    return 1;
  }
}

/** Run the CLI. Tests call this; the bin exits with its status. */
export function runCli(
  argv: readonly string[],
  cwd: string = process.cwd()
): number {
  return main(argv, cwd);
}

/**
 * Exit when this module is the program the user ran.
 *
 * @param moduleUrl - This module's `import.meta.url`.
 * @param entry - The program path, `process.argv[1]` for the bin. A package
 *   bin is a symlink, and Node resolves `import.meta.url` through it, so the
 *   path is compared after resolving its links.
 * @param argv - Arguments after the program path.
 */
export function runCliEntry(
  moduleUrl: string,
  entry: string | undefined = process.argv[1],
  argv: readonly string[] = process.argv.slice(2)
): void {
  if (
    entry &&
    existsSync(entry) &&
    moduleUrl === pathToFileURL(realpathSync(entry)).href
  ) {
    process.exit(runCli(argv));
  }
}

runCliEntry(import.meta.url);
