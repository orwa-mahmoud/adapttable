#!/usr/bin/env node
/**
 * React version compatibility matrix (blocking).
 *
 * Every package promises `react: ^18.0.0 || ^19.0.0`, but the workspace
 * develops against one React version — an import of a newer-React-only API
 * (the `useEffectEvent` regression) passes every local test and crashes any
 * consumer on an older release line. This probe packs the CURRENT workspace
 * build of `@adapttable/core` + `@adapttable/unstyled` into a throwaway npm
 * project pinned to one React version and runs a real jsdom smoke: render,
 * sort, page, search, and a server-tier `onQueryChange` fetch.
 *
 * Blocking by contract: a failing version is a broken peer-range promise, so
 * the process exits non-zero. Run all versions (`pnpm react:matrix`) or one
 * (`pnpm react:matrix 18.3.1`) — via pnpm, which the script relies on for
 * `pnpm pack`. Packages must be built first
 * (`pnpm turbo run build --filter=@adapttable/unstyled...`).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The oldest supported 18.x with createRoot semantics, each 19 minor's
// floor, and the current 19.2 line the workspace itself develops on.
const ALL_VERSIONS = ["18.3.1", "19.0.0", "19.2.7"];
// Executables come from fixed locations, never a bare name off a (possibly
// writable) PATH: npm ships beside the running node, and pnpm — needed for
// `pnpm pack`, which rewrites `workspace:` ranges to real versions (npm's
// pack does not) — is the very launcher that ran this script, exposed via
// `npm_execpath` when invoked as `pnpm react:matrix`.
const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const PNPM_CLI = process.env.npm_execpath;
if (!PNPM_CLI || !PNPM_CLI.includes("pnpm")) {
  console.error(
    "Run this through pnpm (`pnpm react:matrix [version]`) — it needs pnpm's pack to rewrite workspace: ranges."
  );
  process.exit(1);
}
const VITEST_REL = join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vitest.cmd" : "vitest"
);

const VITEST_CONFIG = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", include: ["compat.test.tsx"] },
});
`;

const TEST = `import { type ColumnDef, DataTable } from "@adapttable/unstyled";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { version } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each table syncs its state to the (jsdom) URL; start every test clean.
beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  qty: number;
}

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  name: \`Item \${String(i + 1).padStart(2, "0")}\`,
  qty: i,
}));

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  {
    key: "qty",
    header: "Qty",
    accessor: (r) => String(r.qty),
    sortValue: (r) => r.qty,
    sortable: true,
  },
];

describe(\`AdaptTable on React \${version}\`, () => {
  it("runs on the expected React version", () => {
    expect(version).toBe("__REACT_VERSION__");
  });

  it("renders, sorts, pages and searches on the frontend tier", async () => {
    render(<DataTable data={ROWS} columns={columns} rowKey={(r) => r.id} />);

    // Render: first page (default limit 25) is visible, page 2 is not.
    expect(screen.getByText("Item 01")).toBeTruthy();
    expect(screen.queryByText("Item 26")).toBeNull();

    // Sort: toggle Qty to descending; highest qty lands on page 1.
    const qtySort = screen.getByRole("button", { name: /qty/i });
    fireEvent.click(qtySort); // asc
    fireEvent.click(qtySort); // desc
    await waitFor(() => {
      expect(screen.getByText("Item 30")).toBeTruthy();
    });
    fireEvent.click(qtySort); // back to the cleared state for paging

    // Page: next page shows the tail rows.
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() => {
      expect(screen.getByText("Item 26")).toBeTruthy();
    });

    // Search (filter): debounced commit narrows to one row.
    const search = screen.getByPlaceholderText("Search…");
    fireEvent.change(search, { target: { value: "Item 03" } });
    await waitFor(
      () => {
        expect(screen.getByText("Item 03")).toBeTruthy();
        expect(screen.queryByText("Item 01")).toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("runs a server-tier fetch through onQueryChange", async () => {
    const seen: Array<{ page: number; search: string }> = [];
    const onQueryChange = vi.fn(
      (query: { page: number; search: string }, _info: unknown) => {
        seen.push({ page: query.page, search: query.search });
        return Promise.resolve();
      }
    );

    render(
      <DataTable
        data={ROWS.slice(0, 25)}
        total={30}
        onQueryChange={onQueryChange}
        columns={columns}
        rowKey={(r) => r.id}
      />
    );

    // The mount fire delivers the initial consolidated query.
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalled();
    });
    expect(seen[0]).toEqual({ page: 1, search: "" });
    expect(screen.getByText("Item 01")).toBeTruthy();

    // Paging emits a new query instead of slicing locally.
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() => {
      expect(seen.some((q) => q.page === 2)).toBe(true);
    });
  });
});
`;

/** Pack one workspace package into `dest`, returning the tarball path. */
function packInto(pkgDir, dest) {
  const out = execFileSync(
    process.execPath,
    [PNPM_CLI, "pack", "--pack-destination", dest],
    {
      cwd: join(REPO_ROOT, "packages", pkgDir),
      encoding: "utf8",
    }
  );
  // pnpm prints the tarball path as the last non-empty line.
  const lines = out.trim().split("\n");
  return lines[lines.length - 1].trim();
}

/** Run the smoke suite against one pinned React version. */
function runVersion(reactVersion, tarballs) {
  const dir = mkdtempSync(join(tmpdir(), `react-matrix-${reactVersion}-`));
  try {
    const pkg = {
      name: `compat-react-${reactVersion}`,
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@adapttable/core": `file:${tarballs.core}`,
        "@adapttable/unstyled": `file:${tarballs.unstyled}`,
        react: reactVersion,
        "react-dom": reactVersion,
      },
      devDependencies: {
        "@testing-library/dom": "^10.4.1",
        "@testing-library/react": "^16.3.0",
        jsdom: "^26.0.0",
        vitest: "^4.0.0",
      },
    };
    writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
    writeFileSync(join(dir, "vitest.config.ts"), VITEST_CONFIG);
    writeFileSync(
      join(dir, "compat.test.tsx"),
      TEST.replace("__REACT_VERSION__", reactVersion)
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
  if (requested && !ALL_VERSIONS.includes(requested)) {
    console.error(
      `Unknown React version "${requested}" — expected one of: ${ALL_VERSIONS.join(", ")}`
    );
    process.exit(1);
  }
  const versions = requested ? [requested] : ALL_VERSIONS;

  const packDir = mkdtempSync(join(tmpdir(), "react-matrix-packs-"));
  let failed = false;
  try {
    const tarballs = {
      core: packInto("core", packDir),
      unstyled: packInto("adapter-unstyled", packDir),
    };
    for (const version of versions) {
      process.stdout.write(`• React ${version} … `);
      const { ok, output } = runVersion(version, tarballs);
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
