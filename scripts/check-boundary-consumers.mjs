#!/usr/bin/env node
/**
 * Compile boundary consumer fixtures against built packages.
 *
 *   node scripts/check-boundary-consumers.mjs
 *
 * Requires `pnpm --filter @adapttable/core --filter @adapttable/react build`.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(ROOT, "scripts", "boundary-consumer-fixtures");

const CORE_DIST = join(ROOT, "packages", "core", "dist", "index.js");
const REACT_DIST = join(ROOT, "packages", "react", "dist", "index.js");

if (!existsSync(CORE_DIST) || !existsSync(REACT_DIST)) {
  console.error(
    "✗ build @adapttable/core and @adapttable/react before check-boundary-consumers"
  );
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "boundary-consumers-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

writeFileSync(
  join(dir, "package.json"),
  JSON.stringify(
    {
      name: "boundary-consumers",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@adapttable/core": `file:${join(ROOT, "packages", "core")}`,
        "@adapttable/react": `file:${join(ROOT, "packages", "react")}`,
        // Packed alongside, and deliberately without a React dependency of
        // its own: the neutral fixture imports its subpaths from a package
        // where React is not installed.
        "@adapttable/ai": `file:${join(ROOT, "packages", "ai")}`,
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        typescript: "^6.0.0",
        "@types/react": "^19.0.0",
      },
    },
    null,
    2
  )
);

for (const name of ["neutral-engine.ts", "neutral-ai.ts", "react-column.tsx"]) {
  writeFileSync(join(dir, name), readFileSync(join(FIXTURES, name), "utf8"));
}

writeFileSync(
  join(dir, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        moduleResolution: "bundler",
        module: "ESNext",
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ["neutral-engine.ts", "neutral-ai.ts", "react-column.tsx"],
    },
    null,
    2
  )
);

const npm = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const tsc = join(
  dir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

try {
  execFileSync(npm, ["install", "--no-audit", "--no-fund"], {
    cwd: dir,
    stdio: "pipe",
  });
  execFileSync(tsc, ["-p", "tsconfig.json"], { cwd: dir, stdio: "pipe" });
} catch (error) {
  const out = [error.stdout, error.stderr, error.message]
    .map((part) => part?.toString().trim() ?? "")
    .filter(Boolean)
    .join("\n");
  console.error(
    `✗ boundary consumer fixtures failed to compile\n${out.slice(-6000)}`
  );
  process.exit(1);
}

console.log(
  "✓ boundary consumers — neutral engine ops and typed React ColumnDef compile"
);
