/** Fresh Angular consumers compile and render the exact component init writes. */
import { execFile } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { type InitIO, runInit } from "./init";

const execute = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const fixtureRoot = fileURLToPath(
  new URL("../test-fixtures/angular-app/", import.meta.url)
);
const rootRequire = createRequire(join(repoRoot, "package.json"));
const angularRequire = createRequire(
  join(repoRoot, "packages/angular/adapter-ng-zorro/package.json")
);
const workspacePackages: Readonly<Record<string, string>> = {
  "@adapttable/core": "packages/shared/core",
  "@adapttable/angular": "packages/angular/angular",
  "@adapttable/angular-unstyled": "packages/angular/adapter-angular-unstyled",
  "@adapttable/ng-zorro": "packages/angular/adapter-ng-zorro",
};
const expectedRows = [
  ["Ada Lovelace", "ada@example.com", "Engineer"],
  ["Alan Turing", "alan@example.com", "Founder"],
  ["Grace Hopper", "grace@example.com", "Admiral"],
];

interface PackageManifest {
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/** Use the real filesystem, including the existing-file guard in init. */
function fixtureIO(root: string): InitIO {
  return {
    readFile: (path) =>
      existsSync(join(root, path))
        ? readFileSync(join(root, path), "utf8")
        : undefined,
    writeFile: (path, contents) => {
      const destination = join(root, path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, contents);
    },
    exists: (path) => existsSync(join(root, path)),
    listRootFiles: () => readdirSync(root),
    log: () => undefined,
  };
}

/** Incomplete app sources become TypeScript only once their table is generated. */
function materializeApp(root: string): void {
  cpSync(fixtureRoot, root, { recursive: true });
  for (const path of ["src/main.ts", "src/app/app.ts"]) {
    renameSync(join(root, `${path}.template`), join(root, path));
  }
}

/** Resolve through installed manifests rather than pnpm's private store layout. */
function packageDirectory(name: string): string {
  const workspace = workspacePackages[name];
  if (workspace) return join(repoRoot, workspace);
  const require =
    name === "typescript" || name === "jsdom" ? rootRequire : angularRequire;
  return dirname(require.resolve(`${name}/package.json`));
}

/** Simulate the printed install with already-installed, built package exports. */
function linkDependencies(root: string, names: readonly string[]): void {
  for (const name of new Set([...names, "jsdom"])) {
    const destination = join(root, "node_modules", name);
    mkdirSync(dirname(destination), { recursive: true });
    symlinkSync(packageDirectory(name), destination, "junction");
  }
}

/**
 * Keep the official builder and the emitted app outside Vitest's React transform.
 * The child only reads the generated component. It imports the builder's browser
 * output and exercises its live DOM; there is no substitute table or source alias.
 */
const buildAndRender = String.raw`
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const require = createRequire(join(root, "package.json"));
const buildRequire = createRequire(require.resolve("@angular/build/package.json"));
const architectRequire = createRequire(buildRequire.resolve("@angular-devkit/architect/package.json"));
const { Architect } = architectRequire("@angular-devkit/architect");
const { WorkspaceNodeModulesArchitectHost } = architectRequire("@angular-devkit/architect/node");
const { logging, workspaces } = architectRequire("@angular-devkit/core");
const { NodeJsSyncHost } = architectRequire("@angular-devkit/core/node");
const { JSDOM, VirtualConsole } = require("jsdom");
const logger = new logging.Logger("angular-scaffold");
logger.subscribe((entry) => process.stderr.write(entry.message + "\n"));
const workspaceHost = workspaces.createWorkspaceHost(new NodeJsSyncHost());
const { workspace } = await workspaces.readWorkspace(join(root, "angular.json"), workspaceHost);
const architect = new Architect(new WorkspaceNodeModulesArchitectHost(workspace, root));
const build = await architect.scheduleTarget({ project: "fixture", target: "build" }, {}, { logger });
try {
  const result = await build.result;
  assert.equal(result.success, true, "The official Angular application build must succeed");
} finally {
  await build.stop();
}

const output = join(root, "dist", "browser");
const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => runtimeErrors.push(error.message));
const dom = new JSDOM(readFileSync(join(output, "index.html"), "utf8"), {
  url: "http://localhost/",
  pretendToBeVisual: true,
  virtualConsole,
});
const window = dom.window;
// jsdom supplies the DOM. Layout-only APIs are deliberately left absent, as in
// the kits' existing DOM tests; neither rendering nor sort state is mocked.
for (const name of [
  "window", "document", "navigator", "location", "history", "localStorage",
  "sessionStorage", "Node", "Element", "HTMLElement", "SVGElement", "Document",
  "DocumentFragment", "ShadowRoot", "Event", "MouseEvent", "KeyboardEvent",
  "CustomEvent", "MutationObserver", "HTMLInputElement", "HTMLButtonElement",
  "HTMLSelectElement", "HTMLTextAreaElement",
]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
}
for (const name of [
  "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle",
  "addEventListener", "removeEventListener",
]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: window[name].bind(window) });
}
const originalError = console.error;
console.error = (...args) => {
  runtimeErrors.push(args.map(String).join(" "));
  originalError(...args);
};
let application;
try {
  const scripts = [...window.document.querySelectorAll('script[type="module"][src]')];
  assert.equal(scripts.length, 1, "The built index must load its browser entry");
  const entry = scripts[0].getAttribute("src");
  assert.ok(entry, "The browser entry must have a source");
  await import(pathToFileURL(join(output, entry)).href);
  assert.ok(globalThis.angularFixtureApplication, "The emitted app must bootstrap");
  application = await globalThis.angularFixtureApplication;
  await application.whenStable();

  const document = window.document;
  const table = document.querySelector('[data-adapttable-part="table"]');
  assert.ok(table, "The generated table must render its real kit surface");
  const headers = [...table.querySelectorAll('[data-adapttable-part="header-cell"]')];
  const headerLabels = headers.map((header) => header.textContent.trim());
  const nameHeader = headers.find((header) => header.textContent.trim() === "Name");
  assert.ok(nameHeader, "The generated Name column must render");
  const sortButton = nameHeader.querySelector("button");
  assert.ok(sortButton, "The generated Name column must be sortable");
  const rows = () => [...table.querySelectorAll('[data-adapttable-part="row"]')].map(
    (row) => [...row.querySelectorAll('[data-adapttable-part="cell"]')].map(
      (cell) => cell.textContent.trim()
    )
  );
  const initialRows = rows();
  sortButton.click();
  await application.whenStable();
  const ascendingRows = rows();
  const ascendingSort = nameHeader.getAttribute("aria-sort");
  sortButton.click();
  await application.whenStable();
  const descendingRows = rows();
  const descendingSort = nameHeader.getAttribute("aria-sort");

  writeFileSync(join(root, "rendered.json"), JSON.stringify({
    headerLabels,
    initialRows,
    ascendingRows,
    descendingRows,
    ascendingSort,
    descendingSort,
    tableCount: document.querySelectorAll('[data-adapttable-part="table"]').length,
    themedTable: table.closest("nz-table") !== null,
    themedSortButton: sortButton.classList.contains("ant-btn"),
    runtimeErrors,
  }));
} finally {
  if (application) application.destroy();
  dom.window.close();
  console.error = originalError;
}
`;

interface RenderedApp {
  headerLabels: string[];
  initialRows: string[][];
  ascendingRows: string[][];
  descendingRows: string[][];
  ascendingSort: string;
  descendingSort: string;
  tableCount: number;
  themedTable: boolean;
  themedSortButton: boolean;
  runtimeErrors: string[];
}

// Each builder owns a fresh app and one worker; the two full builds never overlap.
describe("init in a fresh Angular application", { concurrent: false }, () => {
  it.each([
    {
      kit: "angular-unstyled",
      adapter: "@adapttable/angular-unstyled",
      themed: false,
    },
    { kit: "ng-zorro", adapter: "@adapttable/ng-zorro", themed: true },
  ])(
    "builds and renders the $kit scaffold and sorts its actual rows",
    async ({ kit, adapter, themed }) => {
      const root = mkdtempSync(join(tmpdir(), "adapttable-angular-scaffold-"));
      try {
        materializeApp(root);
        const manifestPath = join(root, "package.json");
        const manifest = JSON.parse(
          readFileSync(manifestPath, "utf8")
        ) as PackageManifest;
        if (themed) {
          manifest.dependencies["ng-zorro-antd"] = "^22.1.1";
          writeFileSync(manifestPath, JSON.stringify(manifest));
          writeFileSync(
            join(root, "src/styles.css"),
            '@import "ng-zorro-antd/ng-zorro-antd.min.css";\n'
          );
        }
        const result = runInit(fixtureIO(root));
        expect(result.framework).toBe("angular");
        expect(result.kit).toBe(kit);
        expect(result.adapter).toBe(adapter);
        expect(result.written).toEqual(["src/app/peopleTable.ts"]);
        expect(existsSync(join(root, "src/PeopleTable.tsx"))).toBe(false);

        for (const specifier of result.packages) {
          const versionStart = specifier.indexOf("@", 1);
          const name =
            versionStart === -1 ? specifier : specifier.slice(0, versionStart);
          const installed = JSON.parse(
            readFileSync(join(packageDirectory(name), "package.json"), "utf8")
          ) as PackageManifest;
          manifest.dependencies[name] = installed.version;
        }
        writeFileSync(manifestPath, JSON.stringify(manifest));
        linkDependencies(root, [
          ...Object.keys(manifest.dependencies),
          ...Object.keys(manifest.devDependencies),
        ]);
        await execute(
          process.execPath,
          ["--input-type=module", "--eval", buildAndRender],
          {
            cwd: root,
            env: { ...process.env, NG_BUILD_MAX_WORKERS: "1" },
            timeout: 120000,
            maxBuffer: 4 * 1024 * 1024,
          }
        ).catch((error: unknown) => {
          const failure = error as Error & { stdout?: string; stderr?: string };
          throw new Error(
            `${failure.message}\n${failure.stdout ?? ""}\n${failure.stderr ?? ""}`,
            { cause: error }
          );
        });
        const rendered = JSON.parse(
          readFileSync(resolve(root, "rendered.json"), "utf8")
        ) as RenderedApp;
        expect(rendered.runtimeErrors).toEqual([]);
        expect(rendered.headerLabels).toEqual(["Name", "Email", "Role"]);
        expect(rendered.initialRows).toEqual(expectedRows);
        expect(rendered.ascendingRows).toEqual(expectedRows);
        expect(rendered.ascendingSort).toBe("ascending");
        expect(rendered.descendingRows).toEqual([...expectedRows].reverse());
        expect(rendered.descendingSort).toBe("descending");
        expect(rendered.tableCount).toBe(1);
        expect(rendered.themedTable).toBe(themed);
        expect(rendered.themedSortButton).toBe(themed);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    150000
  );
});
