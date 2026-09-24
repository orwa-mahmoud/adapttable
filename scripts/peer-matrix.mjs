#!/usr/bin/env node
/**
 * Peer-dependency compatibility matrix (non-blocking).
 *
 * Every adapter advertises a WIDE kit peer range (Mantine 7–9, MUI 6–9, …) but
 * the normal CI installs only one version of each. A claimed-but-broken major
 * would then be discovered by a user, not by us. This probe installs the
 * OLDEST and NEWEST supported major of each adapter's kit into a throwaway
 * dir, `tsc --noEmit`s a tiny file that imports the adapter, then mounts the
 * table in jsdom and clicks the sort control — a type mismatch AND a runtime
 * break both surface, each attributed to its phase (install/resolve/tsc/render).
 *
 * It NEVER narrows a range or fails the build: a failing cell is a finding —
 * `reports/peer-matrix/findings.md` for humans, `summary.json` beside it for
 * the workflow, which drives one tracking issue from it. Run standalone
 * (`node scripts/peer-matrix.mjs`) or from the scheduled `peer-matrix` workflow.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = join(REPO_ROOT, "reports", "peer-matrix");
// The probe must test the major users currently install, so ranges are
// derived from the workspace versions — a hardcoded range silently kept
// testing v1 after the 2.0.0 release. Versioning is independent per
// package, so each one gets its own major.
function workspaceMajor(pkgDir) {
  return Number(
    JSON.parse(
      readFileSync(join(REPO_ROOT, "packages", pkgDir, "package.json"), "utf8")
    ).version.split(".")[0]
  );
}
const CORE_MAJOR = workspaceMajor("core");
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
const VITEST_REL = join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vitest.cmd" : "vitest"
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
    providerImport:
      'import { MantineProvider } from "@mantine/core";\nimport "@mantine/core/styles.css";',
    wrap: (children) => `<MantineProvider>${children}</MantineProvider>`,
  },
  {
    adapter: "mui",
    majors: [6, 9],
    deps: (m) => ({
      // The declared v6 floor is 6.1.2: below it a fresh install resolves
      // the latest @mui/utils against an older ModalManager and the filter
      // popover crashes in getScrollbarSize.
      "@mui/material": m === 6 ? "^6.1.2" : `^${m}.0.0`,
      "@emotion/react": "^11.0.0",
      "@emotion/styled": "^11.0.0",
    }),
    providerImport: "",
    wrap: (children) => children,
  },
  {
    adapter: "chakra",
    majors: [3],
    deps: () => ({
      // The declared floor is 3.13 (InputGroup/CloseButton/Wrap exports).
      "@chakra-ui/react": "^3.13.0",
      "@emotion/react": "^11.0.0",
    }),
    providerImport:
      'import { ChakraProvider, defaultSystem } from "@chakra-ui/react";',
    wrap: (children) =>
      `<ChakraProvider value={defaultSystem}>${children}</ChakraProvider>`,
  },
  {
    adapter: "antd",
    majors: [6],
    deps: () => ({ antd: "^6.0.0" }),
    providerImport: "",
    wrap: (children) => children,
  },
  {
    adapter: "radix",
    majors: [3],
    deps: () => ({ "@radix-ui/themes": "^3.0.0" }),
    providerImport: 'import { Theme } from "@radix-ui/themes";',
    wrap: (children) => `<Theme>${children}</Theme>`,
  },
  {
    adapter: "base-ui",
    majors: [1],
    // The declared floor is 1.6, not 1.0.
    deps: () => ({ "@base-ui/react": "^1.6.0" }),
    providerImport: "",
    wrap: (children) => children,
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

/**
 * The render probe: mount the published adapter against the installed kit
 * major and click the sort control. Types passing while render throws is
 * exactly the blind spot a tsc-only cell leaves open.
 */
const renderTest = (adapter, providerImport, wrapped) => `import {
  DataTable,
  type ColumnDef,
} from "@adapttable/${adapter}";
${providerImport}
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Probe Alpha" },
  { id: "2", name: "Probe Beta" },
];
const columns: ColumnDef<Row>[] = [{ key: "name", sortable: true }];

describe("@adapttable/${adapter} against this kit major", () => {
  it("renders rows and survives a sort click", () => {
    const view = render(
      ${wrapped}
    );
    expect(within(view.container).getByText("Probe Alpha")).toBeTruthy();
    expect(view.container.textContent).toContain("Probe Beta");
    const sortControl =
      view.container.querySelector("thead button") ??
      view.container.querySelector("th[aria-sort]") ??
      view.container.querySelector("th");
    expect(sortControl).toBeTruthy();
    fireEvent.click(sortControl as Element);
    expect(view.container.textContent).toContain("Probe Alpha");
    expect(view.container.textContent).toContain("Probe Beta");
  });
});
`;

const VITEST_CONFIG = `import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["probe.test.tsx"],
    setupFiles: ["./setup.ts"],
  },
});
`;

// The browser APIs kit providers touch that jsdom lacks — the same stubs
// the workspace's own vitest setups install.
const SETUP = `if (typeof window !== "undefined") {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.scrollTo ??= (() => undefined) as typeof window.scrollTo;
}
export {};
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
function runCell(row, major, kitDeps) {
  const { adapter } = row;
  const dir = mkdtempSync(join(tmpdir(), `peer-${adapter}-${major}-`));
  const expectedMajors = {
    core: CORE_MAJOR,
    [adapter]: workspaceMajor(`adapter-${adapter}`),
  };
  // `phase` narrows a failure to the stage that produced it, for the JSON
  // summary and the tracking issue: install | resolve | tsc | render.
  let phase = "install";
  try {
    const pkg = {
      name: `probe-${adapter}-${major}`,
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@adapttable/core": `^${expectedMajors.core}.0.0`,
        [`@adapttable/${adapter}`]: `^${expectedMajors[adapter]}.0.0`,
        ...kitDeps,
        ...REACT,
      },
      devDependencies: {
        typescript: TYPESCRIPT,
        ...REACT_TYPES,
        "@testing-library/dom": "^10.4.1",
        "@testing-library/react": "^16.3.0",
        "@vitejs/plugin-react": "^5.0.0",
        jsdom: "^29.0.0",
        vitest: "^4.0.0",
      },
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
    writeFileSync(join(dir, "vitest.config.ts"), VITEST_CONFIG);
    writeFileSync(join(dir, "setup.ts"), SETUP);
    const table = `<DataTable data={ROWS} columns={columns} rowKey={(r) => r.id} />`;
    writeFileSync(
      join(dir, "probe.test.tsx"),
      renderTest(adapter, row.providerImport, row.wrap(table))
    );
    // `--legacy-peer-deps` so a strict npm peer clash never blocks the install —
    // `tsc` is the real signal we want, not npm's own peer resolver.
    execFileSync(
      NPM_BIN,
      ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"],
      { cwd: dir, stdio: "pipe" }
    );
    // A cell only proves anything if npm actually resolved the major under
    // test — a silently substituted older major would pass tsc and lie.
    phase = "resolve";
    for (const [name, expected] of Object.entries(expectedMajors)) {
      const resolved = JSON.parse(
        readFileSync(
          join(dir, "node_modules", "@adapttable", name, "package.json"),
          "utf8"
        )
      ).version;
      if (Number(resolved.split(".")[0]) !== expected) {
        return {
          ok: false,
          phase,
          output: `@adapttable/${name} resolved to ${resolved}, expected major ${expected}`,
        };
      }
    }
    phase = "tsc";
    execFileSync(join(dir, TSC_REL), ["--noEmit"], { cwd: dir, stdio: "pipe" });
    phase = "render";
    execFileSync(join(dir, VITEST_REL), ["run"], { cwd: dir, stdio: "pipe" });
    return { ok: true, phase: "done", output: "" };
  } catch (error) {
    const out =
      error.stdout?.toString() ||
      error.stderr?.toString() ||
      String(error.message ?? error);
    return { ok: false, phase, output: out.slice(0, 4000) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const results = [];
  for (const row of MATRIX) {
    for (const major of row.majors) {
      process.stdout.write(`• @adapttable/${row.adapter} × kit v${major} … `);
      const { ok, phase, output } = runCell(row, major, row.deps(major));
      process.stdout.write(ok ? "ok\n" : `FAIL (${phase})\n`);
      results.push({ adapter: row.adapter, major, ok, phase, output });
    }
  }

  const failures = results.filter((r) => !r.ok);
  console.log(
    `\nPeer matrix: ${results.length - failures.length}/${results.length} cells passed.`
  );

  // Machine-readable summary, written on EVERY run (green included) — the
  // workflow uploads it and drives the tracking issue from it.
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "summary.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        coreMajor: CORE_MAJOR,
        passed: results.length - failures.length,
        failed: failures.length,
        cells: results.map(({ adapter, major, ok, phase, output }) => ({
          adapter,
          major,
          ok,
          phase,
          ...(ok ? {} : { output: output.slice(0, 1500) }),
        })),
      },
      null,
      2
    )}\n`
  );

  if (failures.length > 0) {
    const body = [
      "# Peer-matrix findings — triage, do not narrow ranges reflexively",
      "",
      "A cell below installs the named kit major with the current published",
      "adapter, typechecks a table that imports it, then mounts it in jsdom",
      "and clicks the sort control. A failure means the adapter's advertised",
      "peer range may be broken for that major — verify, then either fix the",
      "adapter or tighten the peer range in a follow-up.",
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
    writeFileSync(join(REPORT_DIR, "findings.md"), `${body}\n`);
    console.log(
      `${failures.length} cell(s) failed — details in reports/peer-matrix/findings.md`
    );
  }

  // Non-blocking by contract: always exit 0 so a scheduled run never pages.
  process.exit(0);
}

main();
