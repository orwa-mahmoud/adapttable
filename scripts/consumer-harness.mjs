#!/usr/bin/env node
/**
 * Packed-consumer harness (blocking): test the TARBALLS users install, not
 * the workspace source.
 *
 * Packs every publishable package with `pnpm pack` (which rewrites
 * `workspace:` ranges — npm's pack does not), then proves, from tarballs
 * only:
 *
 *   1. ESM import + the `@adapttable/core/adapter` subpath   (node, npm install)
 *   2. CommonJS require of the same three entrypoints         (node)
 *   3. Types under moduleResolution node16 / nodenext / bundler (tsc ×3)
 *   4. Every type a subpath hands back is nameable from that subpath
 *   5. The same install resolves under pnpm as well as npm
 *   6. Adapter CSS ships and is non-empty (base-ui styles.css)
 *   7. `@adapttable/server` parses a query in a backend with NO React
 *   8. A Vite production build of a real table                (vite build)
 *   9. A Next.js App Router build whose prerender renders rows (next build)
 *
 * Monorepo tests can never see these failures: they resolve source, not
 * `exports` maps, tarball file lists, or bundler resolution rules.
 *
 * Run via pnpm (`pnpm consumer:harness`) after a build; exits non-zero on
 * the first failing step. Packages must be built first (`pnpm build`).
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { missingNames, NAMEABLE, NAMEABLE_PROBE } from "./packed-names.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Absolute executable paths — never a bare name off a writable PATH. npm
// ships beside the running node; pnpm is the launcher that ran this script.
const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const PNPM_CLI = process.env.npm_execpath;
if (!PNPM_CLI || !PNPM_CLI.includes("pnpm")) {
  console.error(
    "Run this through pnpm (`pnpm consumer:harness`) — it needs pnpm's pack to rewrite workspace: ranges."
  );
  process.exit(1);
}

const bin = (dir, name) =>
  join(
    dir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name
  );

/** Pack one workspace package into `dest`, returning the tarball path. */
function packInto(pkgDir, dest) {
  const out = execFileSync(
    process.execPath,
    [PNPM_CLI, "pack", "--pack-destination", dest],
    { cwd: join(REPO_ROOT, "packages", pkgDir), encoding: "utf8" }
  );
  const lines = out.trim().split("\n");
  return lines[lines.length - 1].trim();
}

const ROWS_TSX = `const ROWS = [
  { id: "1", name: "Harness Alpha" },
  { id: "2", name: "Harness Beta" },
];
const columns: ColumnDef<(typeof ROWS)[number]>[] = [{ key: "name", sortable: true }];`;

function run(cmd, args, cwd, label) {
  try {
    execFileSync(cmd, args, { cwd, stdio: "pipe" });
  } catch (error) {
    const out = [error.stdout, error.stderr, error.message]
      .map((part) => part?.toString().trim() ?? "")
      .filter(Boolean)
      .join("\n");
    console.error(`\n✗ ${label}\n${out.slice(-6000)}`);
    process.exit(1);
  }
}

function main() {
  const packDir = mkdtempSync(join(tmpdir(), "consumer-packs-"));
  const scratches = [];
  const scratch = (name) => {
    const dir = mkdtempSync(join(tmpdir(), `consumer-${name}-`));
    scratches.push(dir);
    return dir;
  };
  process.on("exit", () => {
    for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
    rmSync(packDir, { recursive: true, force: true });
  });

  // ── Pack every publishable package ────────────────────────────────────
  const pkgDirs = readdirSync(join(REPO_ROOT, "packages"));
  const tarballs = {};
  for (const dir of pkgDirs) {
    const name = JSON.parse(
      readFileSync(join(REPO_ROOT, "packages", dir, "package.json"), "utf8")
    ).name;
    process.stdout.write(`packing ${name} … `);
    tarballs[name] = packInto(dir, packDir);
    console.log("ok");
  }

  const REACT = { react: "^19.0.0", "react-dom": "^19.0.0" };
  const CORE = { "@adapttable/core": `file:${tarballs["@adapttable/core"]}` };
  const UNSTYLED = {
    "@adapttable/unstyled": `file:${tarballs["@adapttable/unstyled"]}`,
  };
  const BASE_UI = {
    "@adapttable/base-ui": `file:${tarballs["@adapttable/base-ui"]}`,
  };
  const SERVER = {
    "@adapttable/server": `file:${tarballs["@adapttable/server"]}`,
  };

  // On a Version Packages PR the bumped versions exist only as tarballs —
  // the registry doesn't have them yet. Every scratch app therefore pins
  // ALL @adapttable transitives to the local packs: npm via "overrides",
  // pnpm via a pnpm-workspace.yaml (its overrides home since v10).
  const OVERRIDES = Object.fromEntries(
    Object.entries(tarballs).map(([name, file]) => [name, `file:${file}`])
  );
  // pnpm 10+ reads its settings from here rather than `.npmrc`, so a scratch
  // app that needs one states it in the same file as the overrides.
  const pnpmWorkspace = (settings = "") =>
    `packages: []\n${settings}overrides:\n${Object.entries(tarballs)
      .map(([name, file]) => `  "${name}": "file:${file}"`)
      .join("\n")}\n`;

  // ── 1–6. Resolution scratch: ESM, CJS, tsc ×3, names, pnpm, CSS ──────
  const resDir = scratch("resolution");
  writeFileSync(
    join(resDir, "package.json"),
    JSON.stringify(
      {
        name: "consumer-resolution",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: { ...CORE, ...UNSTYLED, ...BASE_UI, ...SERVER, ...REACT },
        overrides: OVERRIDES,
        devDependencies: {
          typescript: "^6.0.0",
          "@types/react": "^19.0.0",
        },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(resDir, "esm.mjs"),
    `import { DataTable } from "@adapttable/unstyled";
import { tableQueryKey, useQuerySource } from "@adapttable/core";
import { useDataTableShell } from "@adapttable/core/adapter";
import { pivot } from "@adapttable/core/pivot";
import { parseTableQuery } from "@adapttable/server";
if (typeof DataTable !== "function" && typeof DataTable !== "object")
  throw new Error("unstyled DataTable missing from ESM entry");
if (typeof useQuerySource !== "function")
  throw new Error("core useQuerySource missing from ESM entry");
if (typeof useDataTableShell !== "function")
  throw new Error("core/adapter useDataTableShell missing from ESM entry");
if (typeof pivot !== "function")
  throw new Error("core/pivot missing from ESM entry");
if (typeof parseTableQuery !== "function")
  throw new Error("server parseTableQuery missing from ESM entry");
// Neither TanStack Query nor SWR is installed in this consumer. The cache
// helpers still work, which is the whole types-only-peer promise: importing
// them must not drag either library in.
if (tableQueryKey({ page: 1, limit: 25 })[0] !== "adapttable")
  throw new Error("tableQueryKey did not build a key without a query library");
console.log("esm ok");
`
  );
  writeFileSync(
    join(resDir, "cjs.cjs"),
    `const { DataTable } = require("@adapttable/unstyled");
const { tableQueryKey, useQuerySource } = require("@adapttable/core");
const { useDataTableShell } = require("@adapttable/core/adapter");
const { pivot } = require("@adapttable/core/pivot");
const { parseTableQuery } = require("@adapttable/server");
if (!DataTable) throw new Error("unstyled DataTable missing from CJS entry");
if (typeof useQuerySource !== "function")
  throw new Error("core useQuerySource missing from CJS entry");
if (typeof useDataTableShell !== "function")
  throw new Error("core/adapter useDataTableShell missing from CJS entry");
if (typeof pivot !== "function")
  throw new Error("core/pivot missing from CJS entry");
if (typeof parseTableQuery !== "function")
  throw new Error("server parseTableQuery missing from CJS entry");
if (typeof tableQueryKey !== "function")
  throw new Error("core tableQueryKey missing from CJS entry");
console.log("cjs ok");
`
  );
  writeFileSync(
    join(resDir, "probe.ts"),
    `import type { ColumnDef, TableSource } from "@adapttable/core";
import { useQuerySource } from "@adapttable/core";
import { useDataTableShell } from "@adapttable/core/adapter";
import { DataTable } from "@adapttable/unstyled";

export const surface = { useQuerySource, useDataTableShell, DataTable };
export type Probe<T> = { columns: ColumnDef<T>[]; source?: TableSource<T> };
`
  );
  writeFileSync(join(resDir, "nameable.ts"), NAMEABLE_PROBE);
  for (const resolution of ["node16", "nodenext", "bundler"]) {
    writeFileSync(
      join(resDir, `tsconfig.${resolution}.json`),
      JSON.stringify(
        {
          compilerOptions: {
            moduleResolution: resolution,
            module: resolution === "bundler" ? "ESNext" : resolution,
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            jsx: "react-jsx",
            strict: true,
            skipLibCheck: true,
            noEmit: true,
          },
          include: ["probe.ts", "nameable.ts"],
        },
        null,
        2
      )
    );
  }

  process.stdout.write("npm install (resolution scratch) … ");
  run(NPM_BIN, ["install", "--no-audit", "--no-fund"], resDir, "npm install");
  console.log("ok");

  process.stdout.write("ESM import + core/adapter subpath … ");
  run(process.execPath, ["esm.mjs"], resDir, "ESM import");
  console.log("ok");

  process.stdout.write("CommonJS require … ");
  run(process.execPath, ["cjs.cjs"], resDir, "CJS require");
  console.log("ok");

  for (const resolution of ["node16", "nodenext", "bundler"]) {
    process.stdout.write(`tsc moduleResolution=${resolution} … `);
    run(
      bin(resDir, "tsc"),
      ["-p", `tsconfig.${resolution}.json`],
      resDir,
      `tsc ${resolution}`
    );
    console.log("ok");
  }

  process.stdout.write("packed declarations name their own types … ");
  for (const [entry, names] of NAMEABLE) {
    const dtsPath = join(
      resDir,
      "node_modules",
      "@adapttable",
      "core",
      "dist",
      `${entry}.d.ts`
    );
    if (!existsSync(dtsPath)) {
      console.error(`\n✗ the packed core ships no dist/${entry}.d.ts`);
      process.exit(1);
    }
    const missing = missingNames(readFileSync(dtsPath, "utf8"), names);
    if (missing.length > 0) {
      console.error(
        `\n✗ @adapttable/core/${entry} hands back ${missing.join(", ")} but its packed declaration exports no such name — a consumer cannot write the type`
      );
      process.exit(1);
    }
  }
  console.log("ok");

  process.stdout.write("adapter CSS ships (base-ui styles.css) … ");
  const cssPath = join(
    resDir,
    "node_modules",
    "@adapttable",
    "base-ui",
    "src",
    "styles.css"
  );
  if (statSync(cssPath).size === 0) {
    console.error("\n✗ base-ui styles.css is empty in the packed tarball");
    process.exit(1);
  }
  console.log("ok");

  // Same dependency graph must also resolve under pnpm — its stricter
  // linker surfaces peer/exports mistakes npm's flat tree hides.
  const pnpmDir = scratch("pnpm");
  writeFileSync(
    join(pnpmDir, "package.json"),
    readFileSync(join(resDir, "package.json"))
  );
  writeFileSync(join(pnpmDir, "pnpm-workspace.yaml"), pnpmWorkspace());
  writeFileSync(
    join(pnpmDir, "esm.mjs"),
    readFileSync(join(resDir, "esm.mjs"))
  );
  process.stdout.write("pnpm install + ESM import … ");
  run(
    process.execPath,
    [PNPM_CLI, "install", "--no-frozen-lockfile"],
    pnpmDir,
    "pnpm install"
  );
  run(process.execPath, ["esm.mjs"], pnpmDir, "ESM import under pnpm");
  console.log("ok");

  // ── 7. A backend with no React at all ─────────────────────────────────
  //
  // Every scratch app above has React, because every one of them renders a
  // table. `@adapttable/server` renders nothing: it reads a query string inside
  // a route handler, and the Express or Fastify service that installs it may
  // have no React in the project and no intention of adding any. So this app
  // installs the server tarball on its own and runs a real parse.
  //
  // `autoInstallPeers: false` is the point. npm and pnpm both install a missing
  // peer for you, which is exactly what hid this: `@adapttable/core` declares
  // React as a non-optional peer, so the package manager quietly puts React on
  // disk and the import resolves — in the harness. Turning that off is what
  // makes the scratch app the backend it claims to be, and what lets this step
  // see an `ERR_MODULE_NOT_FOUND` the day something in the server's graph
  // reaches a hook again.
  const nodeDir = scratch("node");
  writeFileSync(
    join(nodeDir, "package.json"),
    JSON.stringify(
      {
        name: "consumer-node",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: { ...SERVER },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(nodeDir, "pnpm-workspace.yaml"),
    pnpmWorkspace("autoInstallPeers: false\nstrictPeerDependencies: false\n")
  );

  // One query carrying every part of the contract that needs decoding — the
  // sort chain, a column filter, the versioned filter tree, the pivot — plus
  // two things the schema does not allow, so the allowlist is exercised and
  // not merely imported.
  const PARSE_ASSERTIONS = `const params = new URLSearchParams({
  page: "3",
  limit: "10",
  q: "ada",
  sort: "team:desc,secret:asc",
  f_team: "ops",
  f_password: "x",
  ft: \`1.\${JSON.stringify({
    combinator: "and",
    conditions: [
      { key: "team", op: "eq", value: "ops" },
      { combinator: "or", conditions: [{ key: "amount", op: "gt", value: 5 }] },
    ],
  })}\`,
  pivot: "rows:team;cols:quarter;sum:amount",
});

const query = parseTableQuery(\`https://example.test/api?\${params}\`, {
  columns: ["team", "amount", "quarter"],
});

const wrong = [];
const check = (what, ok) => {
  if (!ok) wrong.push(what);
};
check("paging", query.page === 3 && query.limit === 10 && query.offset === 20);
check("search", query.search === "ada");
check(
  "sort chain",
  query.sort.length === 1 &&
    query.sort[0].key === "team" &&
    query.sort[0].dir === "desc"
);
check("column filter", query.filters.team === "ops");
check("filter tree", query.filterTree?.conditions.length === 2);
check(
  "pivot",
  query.pivot?.rows[0] === "team" &&
    query.pivot?.columns[0] === "quarter" &&
    query.pivot?.measures[0].agg === "sum"
);
// The allowlist is the reason the package exists: a column the schema never
// named must be reported, not passed through to a query.
check(
  "rejects an unknown filter column",
  query.rejected.some((r) => r.param === "f_password")
);
check(
  "rejects an unknown sort column",
  query.rejected.some((r) => r.param === "sort" && r.value === "secret")
);
if (wrong.length > 0)
  throw new Error(\`server parse wrong in a React-free app: \${wrong.join(", ")}\`);
`;
  writeFileSync(
    join(nodeDir, "parse.mjs"),
    `import { parseTableQuery } from "@adapttable/server";\n\n${PARSE_ASSERTIONS}console.log("react-free esm ok");\n`
  );
  writeFileSync(
    join(nodeDir, "parse.cjs"),
    `const { parseTableQuery } = require("@adapttable/server");\n\n${PARSE_ASSERTIONS}console.log("react-free cjs ok");\n`
  );

  process.stdout.write("pnpm install (server alone, no peers) … ");
  run(
    process.execPath,
    [PNPM_CLI, "install", "--no-frozen-lockfile"],
    nodeDir,
    "pnpm install (react-free)"
  );
  console.log("ok");

  process.stdout.write("no React on disk … ");
  const nodeModules = join(nodeDir, "node_modules");
  const reactCopies = [
    ...(existsSync(join(nodeModules, "react")) ? ["node_modules/react"] : []),
    // pnpm's real installs live in the store, and the link above is only made
    // for a direct dependency — a transitive React would show up here only.
    ...readdirSync(join(nodeModules, ".pnpm"))
      .filter((entry) => /^react@/.test(entry))
      .map((entry) => `node_modules/.pnpm/${entry}`),
  ];
  if (reactCopies.length > 0) {
    console.error(
      `\n✗ the React-free scratch app installed React anyway:\n  ` +
        reactCopies.join("\n  ") +
        `\n  A backend that installs @adapttable/server must not need it.`
    );
    process.exit(1);
  }
  console.log("ok");

  process.stdout.write("server parses a query without React (ESM) … ");
  run(process.execPath, ["parse.mjs"], nodeDir, "react-free ESM parse");
  console.log("ok");

  process.stdout.write("server parses a query without React (CJS) … ");
  run(process.execPath, ["parse.cjs"], nodeDir, "react-free CJS parse");
  console.log("ok");

  // ── 8. Vite production build ──────────────────────────────────────────
  const viteDir = scratch("vite");
  mkdirSync(join(viteDir, "src"), { recursive: true });
  writeFileSync(
    join(viteDir, "package.json"),
    JSON.stringify(
      {
        name: "consumer-vite",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: { ...CORE, ...UNSTYLED, ...REACT },
        overrides: OVERRIDES,
        devDependencies: {
          typescript: "^6.0.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          "@vitejs/plugin-react": "^5.0.0",
          vite: "^7.0.0",
        },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(viteDir, "vite.config.ts"),
    `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({ plugins: [react()] });
`
  );
  writeFileSync(
    join(viteDir, "index.html"),
    `<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`
  );
  writeFileSync(
    join(viteDir, "src", "main.tsx"),
    `import { createRoot } from "react-dom/client";
import { DataTable, type ColumnDef } from "@adapttable/unstyled";

${ROWS_TSX}

createRoot(document.getElementById("root")!).render(
  <DataTable data={ROWS} columns={columns} rowKey={(r) => r.id} />
);
`
  );
  process.stdout.write("vite: npm install … ");
  run(NPM_BIN, ["install", "--no-audit", "--no-fund"], viteDir, "vite install");
  console.log("ok");
  process.stdout.write("vite build … ");
  run(bin(viteDir, "vite"), ["build"], viteDir, "vite build");
  if (statSync(join(viteDir, "dist", "index.html")).size === 0) {
    console.error("\n✗ vite build produced an empty index.html");
    process.exit(1);
  }
  console.log("ok");

  // ── 9. Next.js App Router build + prerender ───────────────────────────
  const nextDir = scratch("next");
  mkdirSync(join(nextDir, "app"), { recursive: true });
  writeFileSync(
    join(nextDir, "package.json"),
    JSON.stringify(
      {
        name: "consumer-next",
        version: "0.0.0",
        private: true,
        dependencies: { ...CORE, ...UNSTYLED, ...REACT, next: "latest" },
        overrides: OVERRIDES,
        devDependencies: {
          typescript: "^6.0.0",
          // Next's build-time TS check hard-requires @types/node alongside
          // the react types whenever a tsconfig is present.
          "@types/node": "^24.0.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
        },
      },
      null,
      2
    )
  );
  writeFileSync(
    join(nextDir, "app", "layout.tsx"),
    `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
  );
  writeFileSync(
    join(nextDir, "app", "table.tsx"),
    `"use client";
import { DataTable, type ColumnDef } from "@adapttable/unstyled";

${ROWS_TSX}

export function Table() {
  return <DataTable data={ROWS} columns={columns} rowKey={(r) => r.id} />;
}
`
  );
  writeFileSync(
    join(nextDir, "app", "page.tsx"),
    `import { Table } from "./table";

export default function Page() {
  return <Table />;
}
`
  );
  process.stdout.write("next: npm install … ");
  run(NPM_BIN, ["install", "--no-audit", "--no-fund"], nextDir, "next install");
  console.log("ok");
  process.stdout.write("next build (App Router, prerender) … ");
  run(bin(nextDir, "next"), ["build"], nextDir, "next build");
  // The App Router prerenders the page at build time — a client component
  // still server-renders, so the rows must be IN the emitted HTML. This is
  // the SSR proof: a window/document touch during render breaks it.
  const prerendered = readFileSync(
    join(nextDir, ".next", "server", "app", "index.html"),
    "utf8"
  );
  if (!prerendered.includes("Harness Alpha")) {
    console.error(
      "\n✗ next prerender does not contain the table rows — SSR render failed"
    );
    process.exit(1);
  }
  console.log("ok");

  console.log("\nconsumer-harness: every packed-tarball check passed.");
}

main();
