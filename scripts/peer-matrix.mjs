#!/usr/bin/env node
/**
 * Peer-dependency compatibility matrix (non-blocking).
 *
 * Every adapter advertises a WIDE kit peer range (Mantine 7–9, MUI 5–9, …) but
 * the normal CI installs only one version of each. A claimed-but-broken major
 * would then be discovered by a user, not by us. This probe installs the
 * OLDEST and NEWEST supported major of each adapter's kit into a throwaway dir
 * and `tsc --noEmit`s a tiny file that imports the adapter — surfacing a public
 * API / type mismatch against that major.
 *
 * It NEVER narrows a range or fails the build: a failing cell is a finding,
 * written to `ai_docs/peer-matrix-findings.md` (private) for a human to triage.
 * Run standalone (`node scripts/peer-matrix.mjs`) or from the scheduled
 * `peer-matrix` workflow.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Absolute executable paths — never a bare name resolved off a (possibly
// writable) PATH: npm ships beside the running node, and each scratch dir's
// tsc is installed locally under node_modules/.bin.
const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const TSC_REL = join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);
const TYPESCRIPT = "^6.0.0";
const REACT = {
  react: "^19.0.0",
  "react-dom": "^19.0.0",
};
const REACT_TYPES = {
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",
};

/**
 * One row per adapter. `deps(major)` returns the kit peer packages pinned to
 * that major; `majors` is `[oldest, newest]` of the supported range (a single
 * entry when the range spans one major).
 */
const MATRIX = [
  {
    adapter: "mantine",
    majors: [7, 9],
    // The declared v7 floor is 7.2 (stickyHeaderOffset), not 7.0.
    deps: (m) => ({
      "@mantine/core": m === 7 ? "^7.2.0" : `^${m}.0.0`,
      "@mantine/hooks": m === 7 ? "^7.2.0" : `^${m}.0.0`,
    }),
  },
  {
    adapter: "mui",
    majors: [6, 9],
    deps: (m) => ({
      "@mui/material": `^${m}.0.0`,
      "@emotion/react": "^11.0.0",
      "@emotion/styled": "^11.0.0",
    }),
  },
  {
    adapter: "chakra",
    majors: [3],
    deps: () => ({
      // The declared floor is 3.13 (InputGroup/CloseButton/Wrap exports).
      "@chakra-ui/react": "^3.13.0",
      "@emotion/react": "^11.0.0",
    }),
  },
  { adapter: "antd", majors: [6], deps: () => ({ antd: "^6.0.0" }) },
  {
    adapter: "radix",
    majors: [3],
    deps: () => ({ "@radix-ui/themes": "^3.0.0" }),
  },
];

const PROBE = `import { DataTable, type ColumnDef } from "__PKG__";

interface Row {
  id: string;
  name: string;
}
const columns: ColumnDef<Row>[] = [{ key: "name", sortable: true }];

export function Probe({ data }: { data: Row[] }) {
  return <DataTable data={data} columns={columns} rowKey={(r) => r.id} />;
}
`;

const TSCONFIG = {
  compilerOptions: {
    jsx: "react-jsx",
    strict: true,
    moduleResolution: "bundler",
    module: "ESNext",
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    skipLibCheck: true,
    noEmit: true,
  },
  include: ["probe.tsx"],
};

/** Install one adapter against one kit major and typecheck the probe. */
function runCell(adapter, major, kitDeps) {
  const dir = mkdtempSync(join(tmpdir(), `peer-${adapter}-${major}-`));
  try {
    const pkg = {
      name: `probe-${adapter}-${major}`,
      version: "0.0.0",
      private: true,
      dependencies: {
        "@adapttable/core": "^1.0.0",
        [`@adapttable/${adapter}`]: "^1.0.0",
        ...kitDeps,
        ...REACT,
      },
      devDependencies: { typescript: TYPESCRIPT, ...REACT_TYPES },
    };
    writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify(TSCONFIG, null, 2)
    );
    writeFileSync(
      join(dir, "probe.tsx"),
      PROBE.replace("__PKG__", `@adapttable/${adapter}`)
    );
    // `--legacy-peer-deps` so a strict npm peer clash never blocks the install —
    // `tsc` is the real signal we want, not npm's own peer resolver.
    execFileSync(
      NPM_BIN,
      ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"],
      { cwd: dir, stdio: "pipe" }
    );
    execFileSync(join(dir, TSC_REL), ["--noEmit"], { cwd: dir, stdio: "pipe" });
    return { ok: true, output: "" };
  } catch (error) {
    const out =
      error.stdout?.toString() ||
      error.stderr?.toString() ||
      String(error.message ?? error);
    return { ok: false, output: out.slice(0, 4000) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const results = [];
  for (const { adapter, majors, deps } of MATRIX) {
    for (const major of majors) {
      process.stdout.write(`• @adapttable/${adapter} × kit v${major} … `);
      const { ok, output } = runCell(adapter, major, deps(major));
      process.stdout.write(ok ? "ok\n" : "FAIL\n");
      results.push({ adapter, major, ok, output });
    }
  }

  const failures = results.filter((r) => !r.ok);
  console.log(
    `\nPeer matrix: ${results.length - failures.length}/${results.length} cells passed.`
  );

  if (failures.length > 0) {
    const dir = join(REPO_ROOT, "ai_docs");
    mkdirSync(dir, { recursive: true });
    const body = [
      "# Peer-matrix findings (private — triage, do not narrow ranges reflexively)",
      "",
      "A cell below installs the named kit major with the current published",
      "adapter and typechecks a table that imports it. A failure means the",
      "adapter's advertised peer range may be broken for that major — verify,",
      "then either fix the adapter or tighten the peer range in a follow-up.",
      "",
      ...failures.flatMap((f) => [
        `## @adapttable/${f.adapter} × kit v${f.major}`,
        "",
        "```",
        f.output.trim(),
        "```",
        "",
      ]),
    ].join("\n");
    writeFileSync(join(dir, "peer-matrix-findings.md"), `${body}\n`);
    console.log(
      `${failures.length} cell(s) failed — details in ai_docs/peer-matrix-findings.md`
    );
  }

  // Non-blocking by contract: always exit 0 so a scheduled run never pages.
  process.exit(0);
}

main();
