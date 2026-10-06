/** Compile the Angular guides' actual examples, including their templates. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { it } from "node:test";

import { ANGULAR_DOCS } from "./angular-docs.mjs";
import { entrySource } from "./feature-entry-source.mjs";
import { listPackages, packageDir, REPO_ROOT } from "./packages.mjs";

const SHOWCASE = join(REPO_ROOT, "apps", "showcase");
const URL_GUIDE = "angular/url-state.md";

/** These standalone values are consumed by the surrounding guide's host. */
const FRAGMENT_EXPORTS = new Map([
  ["angular/getting-started.md", "features"],
  ["angular/features.md", "features"],
  ["angular/filter-tree.md", "rule"],
]);

function codeBlocks(markdown) {
  return [...markdown.matchAll(/^```(\w+)\r?\n([\s\S]*?)^```\s*$/gm)].map(
    (match) => ({
      language: match[1],
      code: match[2],
      line: markdown.slice(0, match.index).split("\n").length + 1,
    })
  );
}

/** Resolve every advertised kit entry through its authored ng-packagr source. */
function angularKitSourcePaths() {
  const paths = {};
  for (const pkg of listPackages()) {
    if (pkg.group !== "angular" || !pkg.name.startsWith("adapter-")) continue;
    const manifest = JSON.parse(
      readFileSync(join(pkg.dir, "package.json"), "utf8")
    );
    for (const key of Object.keys(manifest.exports ?? {})) {
      if (key !== "." && key.slice(2).includes(".")) continue;
      const specifier =
        key === "." ? manifest.name : `${manifest.name}/${key.slice(2)}`;
      const source = entrySource(specifier);
      assert.ok(
        source,
        `${specifier} must resolve to an authored source entry`
      );
      paths[specifier] = [source];
    }
  }
  return paths;
}

/** Source resolution follows the showcase snippet test; no dist build needed. */
function projectConfig(files) {
  const angular = packageDir("angular");
  const ai = packageDir("ai");
  const aiAngular = packageDir("ai-angular");
  const core = packageDir("core");
  const i18n = packageDir("i18n");
  return {
    extends: join(SHOWCASE, "src", "angular", "tsconfig.json"),
    compilerOptions: {
      noEmit: true,
      types: [],
      paths: {
        "@adapttable/ai": [join(ai, "src", "index.ts")],
        "@adapttable/ai/ag-ui": [join(ai, "src", "agui.ts")],
        "@adapttable/ai/ai-sdk": [join(ai, "src", "aiSdk.ts")],
        "@adapttable/ai/mcp-apps": [join(ai, "src", "mcpApps.ts")],
        "@adapttable/ai/*": [join(ai, "src", "*.ts")],
        "@adapttable/ai-angular": [join(aiAngular, "src", "index.ts")],
        "@adapttable/angular": [join(angular, "src", "index.ts")],
        "@adapttable/angular/features": [join(angular, "src", "features.ts")],
        "@adapttable/angular/adapter": [join(angular, "src", "adapter.ts")],
        "@adapttable/angular/*": [join(angular, "*", "index.ts")],
        ...angularKitSourcePaths(),
        "@adapttable/core": [join(core, "src", "index.ts")],
        "@adapttable/core/*": [join(core, "src", "*.ts")],
        "@adapttable/i18n": [join(i18n, "src", "index.ts")],
      },
    },
    angularCompilerOptions: {
      strictTemplates: true,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
    },
    // Replace the showcase's include list rather than compiling its demos too.
    files,
    include: [],
  };
}

/**
 * URL state intentionally shows contextual fragments. Supply only the omitted
 * host data/columns and imports; compile its HTML unchanged as an external
 * template and its actual provider call as an ApplicationConfig provider.
 */
function urlStateHost(templateFile) {
  return `
import { Component, type ApplicationConfig } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

export const appConfig: ApplicationConfig = {
  providers: [tableUrlProvider],
};

interface Person { id: string; name: string }
interface Order { id: string; total: number }

@Component({
  selector: "docs-url-state-host",
  standalone: true,
  imports: [AdaptDataTable],
  templateUrl: "./${templateFile}",
})
export class UrlStateHost {
  readonly people: Person[] = [{ id: "ada", name: "Ada" }];
  readonly peopleColumns: ColumnDef<Person>[] = [{ key: "name" }];
  readonly personKey = (person: Person) => person.id;
  readonly orders: Order[] = [{ id: "order-1", total: 25 }];
  readonly orderColumns: ColumnDef<Order>[] = [{ key: "total" }];
  readonly orderKey = (order: Order) => order.id;
}
`;
}

it("compiles every Angular guide's TypeScript examples and strict component templates", () => {
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-angular-docs-"));
  try {
    // Resolve installed peers through their actual package exports, including
    // nested entries such as localize/init and platform-browser/animations.
    // Only this disposable link is removed; the showcase dependencies stay put.
    symlinkSync(
      join(SHOWCASE, "node_modules"),
      join(scratch, "node_modules"),
      "junction"
    );
    const files = [];
    const sources = [];
    assert.ok(ANGULAR_DOCS.length > 0, "no Angular guides are registered");
    assert.ok(ANGULAR_DOCS.includes(URL_GUIDE), "URL state guide is missing");

    for (const page of ANGULAR_DOCS) {
      const blocks = codeBlocks(
        readFileSync(join(REPO_ROOT, "docs", page), "utf8")
      );
      const snippets = blocks.filter(({ language }) =>
        ["ts", "typescript"].includes(language)
      );
      assert.ok(snippets.length > 0, `${page} has no TypeScript example`);
      if (page !== URL_GUIDE) {
        assert.ok(
          snippets.some(({ code }) =>
            /@(Component|Injectable)\s*\(/.test(code)
          ),
          `${page} must include a complete component or injectable example`
        );
      }

      for (const snippet of snippets) {
        const file = `${basename(page, ".md")}-${snippet.line}.ts`;
        // Padding keeps diagnostics on the original Markdown line numbers.
        let source = "\n".repeat(snippet.line - 1) + snippet.code;
        if (page === URL_GUIDE) {
          const templates = blocks.filter(
            ({ language }) => language === "html"
          );
          assert.equal(
            snippets.length,
            1,
            "update the URL host for new TS fragments"
          );
          assert.equal(
            templates.length,
            1,
            "update the URL host for new templates"
          );
          const template = templates[0];
          const templateFile = `url-state-${template.line}.html`;
          writeFileSync(
            join(scratch, templateFile),
            "\n".repeat(template.line - 1) + template.code
          );
          source += urlStateHost(templateFile);
        } else if (!/@(Component|Injectable)\s*\(/.test(snippet.code)) {
          const exported = FRAGMENT_EXPORTS.get(page);
          if (exported) source += `\nexport { ${exported} };\n`;
        }
        writeFileSync(join(scratch, file), source);
        files.push(file);
        sources.push(`${file}: docs/${page}:${snippet.line}`);
      }
    }

    writeFileSync(
      join(scratch, "tsconfig.json"),
      JSON.stringify(projectConfig(files), null, 2)
    );
    const require = createRequire(join(SHOWCASE, "package.json"));
    const compilerPackage =
      require.resolve("@angular/compiler-cli/package.json");
    const compilerManifest = JSON.parse(readFileSync(compilerPackage, "utf8"));
    const ngc = join(dirname(compilerPackage), compilerManifest.bin.ngc);
    // One bounded process checks the full batch, including Angular templates.
    const result = spawnSync(
      process.execPath,
      ["--max-old-space-size=3072", ngc, "-p", join(scratch, "tsconfig.json")],
      { encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 }
    );
    const diagnostics = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const context = `${files.length} examples from ${ANGULAR_DOCS.length} Angular guides:\n${sources.join("\n")}\n${diagnostics}`;
    assert.ifError(result.error);
    assert.equal(
      result.signal,
      null,
      `Angular compiler was terminated\n${context}`
    );
    assert.equal(
      result.status,
      0,
      `Angular documentation does not compile\n${context}`
    );
    assert.equal(
      diagnostics.trim(),
      "",
      `Angular compiler reported diagnostics\n${context}`
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
