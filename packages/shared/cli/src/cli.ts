import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

import { InitError, type InitIO, runInit } from "./init";
import { migrateV3Source } from "./migrateV3";

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
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
  const stat = statSync(path);
  if (stat.isFile()) {
    return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
  }
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const child = resolve(path, entry.name);
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
  cwd: string,
  file: string,
  check: boolean
): { changedFiles: number; movedImports: number; issueCount: number } {
  const source = readFileSync(file, "utf8");
  const result = migrateV3Source(source);
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

function runMigrateV3(cwd: string, argv: readonly string[]): number {
  const check = argv.includes("--check");
  const unknownOption = argv.find(
    (argument) => argument.startsWith("-") && argument !== "--check"
  );
  if (unknownOption) {
    throw new InitError(`Unknown migrate-v3 option: ${unknownOption}`);
  }

  const inputs = argv.filter((argument) => !argument.startsWith("-"));
  const files = [
    ...new Set(
      (inputs.length ? inputs : ["."]).flatMap((input) =>
        sourceFiles(resolve(cwd, input))
      )
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  let changedFiles = 0;
  let movedImports = 0;
  let issueCount = 0;

  for (const file of files) {
    const result = migrateFile(cwd, file, check);
    changedFiles += result.changedFiles;
    movedImports += result.movedImports;
    issueCount += result.issueCount;
  }

  const verb = check ? "Would update" : "Updated";
  console.log(
    `${verb} ${changedFiles} file(s); moved ${movedImports} adapter import(s).`
  );
  if (issueCount > 0) {
    console.error(
      `${issueCount} ambiguous migration(s) require manual changes; no guesses were written.`
    );
  }
  if (changedFiles > 0 && check) return 1;
  return issueCount > 0 ? 1 : 0;
}

function main(argv: readonly string[]): number {
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
      "Usage:\n  adapttable init [--force]\n  adapttable migrate-v3 [paths...] [--check]\n\nScaffold a table or migrate the provably safe parts of v2 source."
    );
    return 0;
  }
  if (command !== "init" && command !== "migrate-v3") {
    console.error(
      `Unknown command "${command}". Try: adapttable init or adapttable migrate-v3`
    );
    return 1;
  }

  try {
    if (command === "migrate-v3") {
      return runMigrateV3(process.cwd(), argv.slice(1));
    }
    const io = createNodeIO(process.cwd());
    runInit(io, { force: argv.includes("--force") });
    return 0;
  } catch (error) {
    const message = error instanceof InitError ? error.message : String(error);

    console.error(`adapttable: ${message}`);
    return 1;
  }
}

process.exit(main(process.argv.slice(2)));
