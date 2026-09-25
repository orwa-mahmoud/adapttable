#!/usr/bin/env node
/**
 * Packed v3 migration rehearsal.
 *
 * For every published adapter, a representative v2 app is rewritten two ways
 * — the junior preset and the senior individual imports — then type-checked
 * against the tarballs a consumer installs. The same packed CLI moves the
 * one mechanical alias import and reports the enabling props without
 * guessing. A second run on the rewritten file is a no-op.
 *
 *   pnpm build && pnpm migrate:rehearse
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { packageDir, packageNames } from "./packages.mjs";
import {
  HEADLESS_V3,
  KITS,
  v2MinimalApp,
  v2PropsMustFail,
  v2RichApp,
  v3MinimalApp,
  v3PresetApp,
} from "./v3-migration-fixtures.mjs";

const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const PNPM_CLI = process.env.npm_execpath;
if (!PNPM_CLI || !PNPM_CLI.includes("pnpm")) {
  console.error(
    "Run this through pnpm (`pnpm migrate:rehearse`) — it needs pnpm's pack."
  );
  process.exit(1);
}

const KIT_PEERS = {
  antd: { antd: "6.0.0" },
  "base-ui": { "@base-ui/react": "1.6.0" },
  chakra: { "@chakra-ui/react": "3.13.0", "@emotion/react": "^11.0.0" },
  mantine: { "@mantine/core": "7.2.0", "@mantine/hooks": "7.2.0" },
  mui: {
    "@mui/material": "6.1.2",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0",
  },
  radix: { "@radix-ui/themes": "3.0.0" },
  shadcn: {},
  unstyled: {},
};

function packInto(pkgDir, dest) {
  const out = execFileSync(
    process.execPath,
    [PNPM_CLI, "pack", "--pack-destination", dest],
    { cwd: packageDir(pkgDir), encoding: "utf8" }
  );
  const lines = out.trim().split("\n");
  return lines[lines.length - 1].trim();
}

function run(cmd, args, cwd, label) {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    const out = [error.stdout, error.stderr, error.message]
      .map((part) => part?.toString().trim() ?? "")
      .filter(Boolean)
      .join("\n");
    console.error(`\n✗ ${label}\n${out.slice(-8000)}`);
    process.exit(1);
  }
}

function bin(dir, name) {
  return join(
    dir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name
  );
}

/** migrate-v3 exits 1 when enabling props remain — that report is the proof. */
function migrateOutput(cli, cwd, args) {
  try {
    return execFileSync(process.execPath, [cli, "migrate-v3", ...args], {
      cwd,
      encoding: "utf8",
    });
  } catch (error) {
    return [error.stdout, error.stderr]
      .map((part) => part?.toString() ?? "")
      .join("");
  }
}

function main() {
  const packDir = mkdtempSync(join(tmpdir(), "v3-rehearse-packs-"));
  const scratch = mkdtempSync(join(tmpdir(), "v3-rehearse-"));
  const scratches = [scratch];
  process.on("exit", () => {
    for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
    rmSync(packDir, { recursive: true, force: true });
  });

  const tarballs = {};
  for (const dir of packageNames()) {
    const pkg = JSON.parse(
      readFileSync(join(packageDir(dir), "package.json"), "utf8")
    );
    if (pkg.private === true) continue;
    process.stdout.write(`packing ${pkg.name} … `);
    tarballs[pkg.name] = packInto(dir, packDir);
    console.log("ok");
  }

  const overrides = Object.fromEntries(
    Object.entries(tarballs).map(([name, file]) => [name, `file:${file}`])
  );
  const tsconfig = {
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
  };

  function writeApp(dir, name, dependencies, files) {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify(
        {
          name,
          version: "0.0.0",
          private: true,
          type: "module",
          dependencies,
          overrides,
          devDependencies: {
            typescript: "^6.0.0",
            "@types/react": "^18.3.0",
          },
        },
        null,
        2
      )
    );
    const include = [];
    for (const [file, source] of Object.entries(files)) {
      writeFileSync(join(dir, file), source);
      include.push(file);
    }
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({ ...tsconfig, include }, null, 2)
    );
    run(
      NPM_BIN,
      ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"],
      dir,
      `npm install ${name}`
    );
    run(bin(dir, "tsc"), ["-p", "tsconfig.json"], dir, `tsc ${name}`);
  }

  writeApp(
    scratch,
    "v3-rehearse-headless",
    {
      react: "18.3.1",
      "react-dom": "18.3.1",
      "@adapttable/core": `file:${tarballs["@adapttable/core"]}`,
      "@adapttable/react": `file:${tarballs["@adapttable/react"]}`,
      "@adapttable/cli": `file:${tarballs["@adapttable/cli"]}`,
    },
    { "headless.tsx": HEADLESS_V3 }
  );
  writeFileSync(join(scratch, "mantine-v2-rich.tsx"), v2RichApp("mantine"));
  writeFileSync(
    join(scratch, "mantine-v2-minimal.tsx"),
    v2MinimalApp("mantine")
  );
  console.log("headless + packed CLI ok");

  for (const kit of KITS) {
    const kitDir = mkdtempSync(join(tmpdir(), `v3-rehearse-${kit}-`));
    scratches.push(kitDir);
    const kitPkg = `@adapttable/${kit}`;
    const dependencies = {
      react: "18.3.1",
      "react-dom": "18.3.1",
      "@adapttable/core": `file:${tarballs["@adapttable/core"]}`,
      "@adapttable/react": `file:${tarballs["@adapttable/react"]}`,
      [kitPkg]: `file:${tarballs[kitPkg]}`,
      ...KIT_PEERS[kit],
    };
    if (kit === "shadcn") {
      dependencies["@adapttable/unstyled"] =
        `file:${tarballs["@adapttable/unstyled"]}`;
    }
    process.stdout.write(`${kit} preset + minimal + refusals … `);
    writeApp(kitDir, `v3-rehearse-${kit}`, dependencies, {
      "v3-preset.tsx": v3PresetApp(kit),
      "v3-minimal.tsx": v3MinimalApp(kit),
      "v2-fail.tsx": v2PropsMustFail(kit),
    });
    console.log("ok");
  }

  const cli = join(
    scratch,
    "node_modules",
    "@adapttable",
    "cli",
    "dist",
    "cli.js"
  );
  const rich = join(scratch, "mantine-v2-rich.tsx");
  const lean = join(scratch, "mantine-v2-minimal.tsx");
  process.stdout.write("packed migrate-v3 moves adapter aliases … ");
  const first = migrateOutput(cli, scratch, [rich, lean]);
  if (!/moved 1 adapter import/.test(first)) {
    console.error(`\n✗ expected one moved import, got:\n${first}`);
    process.exit(1);
  }
  const rewritten = readFileSync(rich, "utf8");
  if (!rewritten.includes("@adapttable/react/adapter")) {
    console.error("\n✗ migrate-v3 did not move headerGroupRows to /adapter");
    process.exit(1);
  }
  if (!rewritten.includes("enableColumnMenu")) {
    console.error("\n✗ migrate-v3 guessed an enabling-prop rewrite");
    process.exit(1);
  }
  const rewrittenLean = readFileSync(lean, "utf8");
  if (
    !rewrittenLean.includes("enableColumnMenu") ||
    !rewrittenLean.includes("exportCsv")
  ) {
    console.error("\n✗ migrate-v3 rewrote the lean v2 enabling props");
    process.exit(1);
  }
  if (!/ambiguous migration/.test(first)) {
    console.error(
      `\n✗ enabling props should be reported, not rewritten:\n${first}`
    );
    process.exit(1);
  }
  console.log("ok");

  process.stdout.write("packed migrate-v3 second run is a no-op … ");
  const second = migrateOutput(cli, scratch, [rich, lean, "--check"]);
  if (!second.includes("Would update 0 file")) {
    console.error(`\n✗ second run was not a no-op:\n${second}`);
    process.exit(1);
  }
  console.log("ok");

  console.log(
    `v3 migration rehearsal: ${KITS.length} kits × preset + minimal + ` +
      `removed-prop refusal; headless unchanged; migrate-v3 idempotent`
  );
}

main();
