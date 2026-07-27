import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { InitError, type InitIO, runInit } from "./init";

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
      "Usage: adapttable init [--force]\n\nDetects your UI kit and scaffolds an AdaptTable starter."
    );
    return 0;
  }
  if (command !== "init") {
    console.error(`Unknown command "${command}". Try: adapttable init`);
    return 1;
  }

  const io = createNodeIO(process.cwd());
  try {
    runInit(io, { force: argv.includes("--force") });
    return 0;
  } catch (error) {
    const message = error instanceof InitError ? error.message : String(error);

    console.error(`adapttable: ${message}`);
    return 1;
  }
}

process.exit(main(process.argv.slice(2)));
