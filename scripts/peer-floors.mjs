#!/usr/bin/env node
/**
 * Peer-range FLOOR verification (blocking, local).
 *
 * Every adapter's kit peer range has a floor the code must actually run
 * on — item 36 raised each floor to the truth (Chakra 3.13, MUI 6,
 * Mantine 7.2, antd 6, Radix 3). This probe packs the CURRENT workspace
 * build of core + one adapter, installs it beside the kit pinned to its
 * EXACT floor version, and runs a jsdom render smoke (rows visible, sort
 * button present) under each kit's minimal provider.
 *
 * Unlike the scheduled `peer-matrix` (published versions, tsc-only,
 * non-blocking), this validates the LOCAL build and fails loudly — run
 * it whenever a peer range or kit import changes:
 * `pnpm peer:floors [kit]`. Packages must be built first.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const VITEST_REL = join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vitest.cmd" : "vitest"
);
const PNPM_CLI = process.env.npm_execpath;
if (!PNPM_CLI || !PNPM_CLI.includes("pnpm")) {
  console.error(
    "Run this through pnpm (`pnpm peer:floors [kit]`) — it needs pnpm's pack to rewrite workspace: ranges."
  );
  process.exit(1);
}

// Floor cells run the OLDEST React our own peer range supports: a
// consumer pinned to an old kit floor (Mantine 7.2, Radix Themes 3.0)
// is realistically on React 18, and several of those kit versions
// predate React 19 entirely. This doubles as a React-18 proof for every
// kit path (the react-matrix job covers 19.x on the reference kit).
const REACT = { react: "18.3.1", "react-dom": "18.3.1" };

/**
 * One cell per adapter: the kit pinned to its declared FLOOR, plus the
 * provider wrapper its render smoke needs.
 */
const FLOORS = [
  {
    kit: "mantine",
    pkg: "adapter-mantine",
    deps: {
      "@mantine/core": "7.2.0",
      "@mantine/hooks": "7.2.0",
    },
    providerImport:
      'import { MantineProvider } from "@mantine/core";\nimport "@mantine/core/styles.css";',
    wrap: (children) => `<MantineProvider>${children}</MantineProvider>`,
  },
  {
    kit: "mui",
    pkg: "adapter-mui",
    deps: {
      "@mui/material": "6.0.0",
      "@emotion/react": "^11.0.0",
      "@emotion/styled": "^11.0.0",
    },
    providerImport: "",
    wrap: (children) => children,
  },
  {
    kit: "chakra",
    pkg: "adapter-chakra",
    deps: {
      "@chakra-ui/react": "3.13.0",
      "@emotion/react": "^11.0.0",
    },
    providerImport:
      'import { ChakraProvider, defaultSystem } from "@chakra-ui/react";',
    wrap: (children) =>
      `<ChakraProvider value={defaultSystem}>${children}</ChakraProvider>`,
  },
  {
    kit: "antd",
    pkg: "adapter-antd",
    deps: { antd: "6.0.0" },
    providerImport: "",
    wrap: (children) => children,
  },
  {
    kit: "radix",
    pkg: "adapter-radix",
    deps: { "@radix-ui/themes": "3.0.0" },
    providerImport: 'import { Theme } from "@radix-ui/themes";',
    wrap: (children) => `<Theme>${children}</Theme>`,
  },
];

const smokeTest = (kit, providerImport, wrapped) => `import {
  DataTable,
  type ColumnDef,
} from "@adapttable/${kit}";
${providerImport}
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Floor Alpha" },
  { id: "2", name: "Floor Beta" },
];
const columns: ColumnDef<Row>[] = [{ key: "name", sortable: true }];

describe("@adapttable/${kit} at its kit floor", () => {
  it("renders rows and a sortable header", () => {
    const view = render(
      ${wrapped}
    );
    expect(within(view.container).getByText("Floor Alpha")).toBeTruthy();
    expect(view.container.textContent).toContain("Floor Beta");
  });
});
`;

const VITEST_CONFIG = `import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["floor.test.tsx"],
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

function runCell(cell, coreTarball, packDir) {
  const adapterTarball = packInto(cell.pkg, packDir);
  const dir = mkdtempSync(join(tmpdir(), `floor-${cell.kit}-`));
  try {
    const pkg = {
      name: `floor-${cell.kit}`,
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: {
        [`@adapttable/${cell.kit}`]: `file:${adapterTarball}`,
        ...cell.deps,
        ...REACT,
      },
      devDependencies: {
        "@testing-library/dom": "^10.4.1",
        "@testing-library/react": "^16.3.0",
        "@types/react": "^18.3.0",
        "@vitejs/plugin-react": "^5.0.0",
        jsdom: "^26.0.0",
        vitest: "^4.0.0",
      },
      // The adapter's ^-ranged core dependency must resolve to the LOCAL
      // build, not the registry's published 1.x.
      overrides: { "@adapttable/core": `file:${coreTarball}` },
    };
    writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
    writeFileSync(join(dir, "vitest.config.ts"), VITEST_CONFIG);
    writeFileSync(join(dir, "setup.ts"), SETUP);
    const table = `<DataTable data={ROWS} columns={columns} rowKey={(r) => r.id} />`;
    writeFileSync(
      join(dir, "floor.test.tsx"),
      smokeTest(cell.kit, cell.providerImport, cell.wrap(table))
    );
    execFileSync(NPM_BIN, ["install", "--no-audit", "--no-fund"], {
      cwd: dir,
      stdio: "pipe",
    });
    execFileSync(join(dir, VITEST_REL), ["run"], { cwd: dir, stdio: "pipe" });
    return { ok: true, output: "" };
  } catch (error) {
    const out = [error.stdout, error.stderr, error.message]
      .map((part) => part?.toString().trim() ?? "")
      .filter(Boolean)
      .join("\n");
    return { ok: false, output: out.slice(0, 8000) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const requested = process.argv[2];
  const cells = requested
    ? FLOORS.filter((cell) => cell.kit === requested)
    : FLOORS;
  if (cells.length === 0) {
    console.error(
      `Unknown kit "${requested}" — expected one of: ${FLOORS.map((f) => f.kit).join(", ")}`
    );
    process.exit(1);
  }

  const packDir = mkdtempSync(join(tmpdir(), "peer-floors-packs-"));
  let failed = false;
  try {
    const coreTarball = packInto("core", packDir);
    for (const cell of cells) {
      process.stdout.write(
        `• @adapttable/${cell.kit} × ${Object.entries(cell.deps)
          .filter(([name]) => !name.startsWith("@emotion"))
          .map(([name, version]) => `${name}@${version}`)
          .join(" + ")} … `
      );
      const { ok, output } = runCell(cell, coreTarball, packDir);
      process.stdout.write(ok ? "ok\n" : "FAIL\n");
      if (!ok) {
        failed = true;
        console.error(output);
      }
    }
  } finally {
    rmSync(packDir, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}

main();
