import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  featuresOf,
  fillTemplate,
  snippetFor,
} from "../apps/showcase/matrix.mjs";
import { packageDir, REPO_ROOT, resolvePackagePath } from "./packages.mjs";

const MANTINE = adapterByKey("mantine");
if (!MANTINE) throw new Error("mantine adapter missing");
const fill = (text) => fillTemplate(text, MANTINE);

const corePkg = JSON.parse(
  readFileSync(resolvePackagePath("core/package.json"), "utf8")
);
const mantinePkg = JSON.parse(
  readFileSync(resolvePackagePath("adapter-mantine/package.json"), "utf8")
);

describe("v3 showcase snippets compile", () => {
  it("row-reordering imports published factories", () => {
    const snippet = fill(featureBySlug("row-reordering").snippet);
    assert.match(snippet, /from "@adapttable\/react"/);
    assert.match(snippet, /applyRowReorder/);
    assert.match(snippet, /from "@adapttable\/mantine\/row-reorder"/);
    assert.match(snippet, /rowReorder/);
    assert.match(snippet, /movePolicy: "confirm"/);
    assert.ok(corePkg.exports["."]);
    assert.ok(mantinePkg.exports["./row-reorder"]);
    assert.match(
      readFileSync(resolvePackagePath("react/src/index.ts"), "utf8"),
      /applyRowReorder/
    );
    assert.match(
      readFileSync(
        resolvePackagePath("adapter-mantine/src/row-reorder.tsx"),
        "utf8"
      ),
      /export const rowReorder/
    );
  });

  it("aggregation imports published factories", () => {
    const snippet = fill(featureBySlug("aggregation").snippet);
    assert.match(snippet, /import \{ aggregate \} from "@adapttable\/react"/);
    assert.match(snippet, /from "@adapttable\/mantine\/grouping-panel"/);
    assert.match(snippet, /from "@adapttable\/mantine\/pinned-summary-rows"/);
    assert.match(snippet, /summaryRow=\{budgetSum\}/);
    assert.ok(mantinePkg.exports["./grouping-panel"]);
    assert.ok(mantinePkg.exports["./pinned-summary-rows"]);
    assert.match(
      readFileSync(resolvePackagePath("react/src/index.ts"), "utf8"),
      /export \{ aggregate \} from/
    );
    assert.match(
      readFileSync(
        resolvePackagePath("adapter-mantine/src/grouping-panel.tsx"),
        "utf8"
      ),
      /export const groupingPanel/
    );
    assert.match(
      readFileSync(
        resolvePackagePath("adapter-mantine/src/pinned-summary-rows.ts"),
        "utf8"
      ),
      /export \{ pinnedSummaryRows \}/
    );
  });

  it("ai imports published session factories", () => {
    const snippet = fill(featureBySlug("ai").snippet);
    assert.match(snippet, /from "@adapttable\/ai-react"/);
    assert.match(snippet, /tableAgent/);
    assert.match(snippet, /from "@adapttable\/mantine"/);
    assert.match(snippet, /agentApproval/);
    assert.match(snippet, /from "@adapttable\/mantine\/filters"/);
    assert.match(snippet, /from "@adapttable\/mantine\/editing"/);
    assert.ok(mantinePkg.exports["./filters"]);
    assert.ok(mantinePkg.exports["./editing"]);
  });
});

/**
 * Every Angular kit's page code compiles against the Angular packages' source:
 * written to a scratch project that extends the showcase's Angular tsconfig,
 * with the one type the page code leaves to the reader — the row — declared
 * beside it, as the React snippets leave it too.
 */
describe("Angular showcase snippets compile", () => {
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-snippets-"));
  after(() => rmSync(scratch, { recursive: true, force: true }));

  const ROW =
    "interface Person { id: string; name: string; team: string; status: string; budget: number; email: string; hiredAt: string }\n";

  /** The scratch project's config: the showcase's, pointed at source. */
  const tsconfig = () => {
    const angular = packageDir("angular");
    const ai = packageDir("ai");
    const aiAngular = packageDir("ai-angular");
    const kit = packageDir("adapter-angular-unstyled");
    const core = packageDir("core");
    const i18n = packageDir("i18n");
    const showcase = join(REPO_ROOT, "apps", "showcase");
    return {
      extends: join(showcase, "src", "angular", "tsconfig.json"),
      compilerOptions: {
        noEmit: true,
        noUnusedLocals: false,
        types: [],
        paths: {
          "@angular/*": [join(showcase, "node_modules", "@angular", "*")],
          "@adapttable/ai": [join(ai, "src", "index.ts")],
          "@adapttable/ai/ag-ui": [join(ai, "src", "agui.ts")],
          "@adapttable/ai/ai-sdk": [join(ai, "src", "aiSdk.ts")],
          "@adapttable/ai/mcp-apps": [join(ai, "src", "mcpApps.ts")],
          "@adapttable/ai/*": [join(ai, "src", "*.ts")],
          "@adapttable/ai-angular": [join(aiAngular, "src", "index.ts")],
          "@adapttable/angular": [join(angular, "src", "index.ts")],
          "@adapttable/angular/*": [join(angular, "*", "index.ts")],
          "@adapttable/angular-unstyled": [join(kit, "src", "index.ts")],
          "@adapttable/angular-unstyled/*": [join(kit, "*", "index.ts")],
          "@adapttable/i18n": [join(i18n, "src", "index.ts")],
          "@adapttable/core": [join(core, "src", "index.ts")],
          "@adapttable/core/*": [join(core, "src", "*.ts")],
        },
      },
      include: ["./*.ts"],
    };
  };

  it("type-checks the code on every Angular feature page", () => {
    const kits = builtAdapters("angular");
    assert.ok(kits.length > 0, "no Angular kit has pages");
    const written = [];
    for (const kit of kits) {
      for (const feature of featuresOf(kit)) {
        const code = fillTemplate(snippetFor(feature, kit), kit);
        const file = `${kit.key}-${feature.slug}.ts`;
        writeFileSync(join(scratch, file), `${code}\n${ROW}`);
        written.push(file);
      }
    }
    writeFileSync(
      join(scratch, "tsconfig.json"),
      JSON.stringify(tsconfig(), null, 2)
    );
    const tsc = createRequire(
      join(REPO_ROOT, "apps", "showcase", "package.json")
    ).resolve("typescript/bin/tsc");
    const result = spawnSync(process.execPath, [tsc, "-p", scratch], {
      encoding: "utf8",
    });
    assert.equal(
      result.status,
      0,
      `the Angular page code does not compile (${written.length} files):\n${result.stdout}${result.stderr}`
    );
  });
});
