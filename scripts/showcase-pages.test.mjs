import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import {
  adapterByKey,
  builtAdapters,
  frameworkOf,
  MATRIX_FEATURES,
  matrixPages,
} from "../apps/showcase/matrix.mjs";
import { REPLACED_PAGES, SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";
import { demoRootOf, demoRoute, FRAMEWORK } from "./site.mjs";
import { indexableRoutes, isRedirectPage } from "./sitemap-routes.mjs";

const SHOWCASE = fileURLToPath(new URL("../apps/showcase/", import.meta.url));

const INDEX = "index.html";

const VUE_PREVIEW_ENTRIES = new Map([
  ["", "src/vue/entry-native.ts"],
  ["workspace", "src/vue/workspace/entry-workspace.ts"],
  ["assistant", "src/vue/entry-assistant.ts"],
  ["table-surfaces", "src/vue/entry-table-surfaces.ts"],
  ["table-footers", "src/vue/entry-table-footers.ts"],
  ["filter-editing", "src/vue/entry-filter-editing.ts"],
  ["composition", "src/vue/entry-composition.ts"],
  ["hierarchy", "src/vue/entry-hierarchy.ts"],
  ["rows", "src/vue/entry-rows.ts"],
  ["selection-contract", "src/vue/entry-selection-contract.ts"],
  ["view-controls", "src/vue/entry-view-controls.ts"],
  ["column-menu", "src/vue/column-menu/entry-column-menu.ts"],
  ["navigation", "src/vue/navigation/entry-navigation.ts"],
  ["actions", "src/vue/actions/entry-actions.ts"],
  ["specialized", "src/vue/specialized/entry-specialized.ts"],
  ["feature-union", "src/vue/feature-union/entry-feature-union.ts"],
]);

const STANDALONE_ENTRIES = new Map([
  ["main", "src/main.tsx"],
  ["all-options", "src/entry-all-options.tsx"],
  ["agent-approval", "src/entry-agent-approval.tsx"],
  ["mcp-app", "src/entry-mcp-app.tsx"],
  ["angular-main", "src/angular/entry-demo.ts"],
  ["angular-all-options", "src/angular/entry-demo.ts"],
  ...[...VUE_PREVIEW_ENTRIES].map(([slug, entry]) => [
    slug ? `vue-unstyled-${slug}` : "vue-unstyled",
    entry,
  ]),
]);

/** Not page directories: build output, dependencies, static assets, source. */
const NOT_PAGES = new Set(["dist", "node_modules", "public", "src"]);

/**
 * The HTML entries that exist on disk, in the manifest's own path spelling.
 *
 * Walked rather than listed one level deep: the demo is adapter-first, so a
 * feature page lives at `mantine/saved-views/index.html` and a scan that only
 * reads the top level would report a hundred and twenty-eight pages as
 * missing while the manifest lists them.
 */
const entriesOnDisk = () => {
  const found = existsSync(join(SHOWCASE, INDEX)) ? [`./${INDEX}`] : [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(join(SHOWCASE, dir), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory() || NOT_PAGES.has(entry.name)) continue;
      const rel = `${prefix}${entry.name}`;
      if (existsSync(join(SHOWCASE, rel, INDEX)))
        found.push(`./${rel}/${INDEX}`);
      walk(rel, `${rel}/`);
    }
  };
  walk("", "");
  return found.sort((a, b) => a.localeCompare(b));
};

const sorted = (values) => [...values].sort((a, b) => a.localeCompare(b));

/** The shared module every page entry loads its kit stylesheets from. */
const KIT_STYLES = "./kitStyles";

/**
 * The static kit stylesheets that module owns. MUI, Chakra, Ant Design and
 * `@adapttable/base-ui` inject their own CSS at runtime, and Radix Themes'
 * 800 KB sheet loads with the Radix chunk — these two are the whole eager set.
 */
const KIT_SHEETS = ["@mantine/core/styles.css", "./tailwind.css"];

/** The one non-kit stylesheet an entry loads directly: the showcase's chrome. */
const CHROME_SHEET = "./styles.css";

const MODULE_SCRIPT = /<script\b[^>]*\btype="module"[^>]*>/gi;

const SRC = /\bsrc="([^"]+)"/;

const SIDE_EFFECT_IMPORT = /^import\s+"([^"]+)";/gm;

/** The module script a page's HTML boots, as a path under the showcase root. */
const entryModuleOf = (html, pageHtml) => {
  const tag = (html.match(MODULE_SCRIPT) ?? []).find((candidate) =>
    SRC.test(candidate)
  );
  const src = tag?.match(SRC)?.[1];
  if (!src) return undefined;
  // Root-absolute entries use the showcase root; relative entries use the
  // HTML document's directory, including the Angular live/lab front doors.
  return src.startsWith("/")
    ? src.slice(1)
    : posix.normalize(posix.join(posix.dirname(pageHtml), src));
};

/** The booting pages of React's kits, whose entries carry the switcher. */
const reactPages = () =>
  bootingPages().filter(({ page }) => page.framework === FRAMEWORK);

const sideEffectImportsIn = (source) =>
  [...source.matchAll(SIDE_EFFECT_IMPORT)].map((match) => match[1]);

/** Every page that boots a bundle, as `{ page, module, source }`. */
const bootingPages = () =>
  SHOWCASE_PAGES.map((page) => {
    const html = readFileSync(join(SHOWCASE, page.html), "utf8");
    const module = entryModuleOf(html, page.html);
    return {
      page,
      module,
      source: module ? readFileSync(join(SHOWCASE, module), "utf8") : null,
    };
  }).filter((entry) => entry.module);

function assertStandaloneEntry(page, source, entry) {
  assert.ok(STANDALONE_ENTRIES.has(page.key), page.html);
  assert.equal(entry, STANDALONE_ENTRIES.get(page.key), page.html);
  if (page.framework === "angular") {
    const lab = page.key === "angular-all-options";
    assert.equal(page.key, lab ? "angular-all-options" : "angular-main");
    assert.equal(page.route, demoRoute(lab ? "all-options" : "", "angular"));
    assert.equal(page.indexable, true, page.html);
    assert.ok(source.includes(`data-angular-mode="${lab ? "lab" : "live"}"`));
    assert.doesNotMatch(source, /data-matrix-page/);
  } else if (page.framework === "vue") {
    const preview = [...VUE_PREVIEW_ENTRIES].find(
      ([slug]) => page.key === (slug ? `vue-unstyled-${slug}` : "vue-unstyled")
    );
    assert.ok(preview, page.html);
    const [slug] = preview;
    assert.equal(
      page.route,
      slug ? `/vue/demo/unstyled/${slug}/` : "/vue/demo/unstyled/"
    );
    assert.equal(page.indexable, false);
    assert.doesNotMatch(source, /data-matrix-page/);
  } else {
    assert.equal(page.framework, "react", page.html);
  }
}

describe("the showcase page manifest", () => {
  it("lists every page directory, and only pages that exist", () => {
    assert.deepEqual(
      sorted(SHOWCASE_PAGES.map((page) => page.html)),
      entriesOnDisk()
    );
  });

  it("keeps every implemented Vue preview distinct from the other unstyled families", () => {
    const vue = SHOWCASE_PAGES.filter((page) => page.framework === "vue");
    assert.deepEqual(
      vue,
      [...VUE_PREVIEW_ENTRIES.keys()].map((slug) => ({
        key: slug ? `vue-unstyled-${slug}` : "vue-unstyled",
        html: slug
          ? `./vue/unstyled/${slug}/index.html`
          : "./vue/unstyled/index.html",
        route: slug ? `/vue/demo/unstyled/${slug}/` : "/vue/demo/unstyled/",
        indexable: false,
        framework: "vue",
      }))
    );
    assert.ok(
      SHOWCASE_PAGES.some((page) => page.route === "/angular/demo/unstyled/")
    );
    const indexed = indexableRoutes(SHOWCASE_PAGES);
    for (const page of vue) {
      assert.equal(indexed.includes(page.route), false, page.route);
    }
    assert.equal(
      matrixPages().some((page) => page.framework === "vue"),
      false
    );
    const component = readFileSync(
      join(SHOWCASE, "src/vue/NativeDemo.vue"),
      "utf8"
    );
    assert.match(component, /from "@adapttable\/vue-unstyled"/);
    assert.doesNotMatch(
      component,
      /@adapttable\/(?:core|react|angular|unstyled)["/]/
    );
  });

  it("registers row-reordering and aggregation for every published adapter", () => {
    const slugs = ["row-reordering", "aggregation"];
    for (const slug of slugs) {
      assert.ok(
        MATRIX_FEATURES.some((feature) => feature.slug === slug),
        slug
      );
    }
    const routes = new Set(
      SHOWCASE_PAGES.filter((page) => page.indexable).map((page) => page.route)
    );
    const adapters = builtAdapters();
    assert.equal(adapters.length, 8);
    for (const adapter of adapters) {
      for (const slug of slugs) {
        const route = demoRoute(`${adapter.key}/${slug}`);
        assert.ok(routes.has(route), route);
      }
    }
    assert.equal(routes.has(demoRoute("bootstrap/row-reordering")), false);
    assert.equal(routes.has(demoRoute("bootstrap/aggregation")), false);
  });

  it("gives every page its own key and its own route", () => {
    const keys = SHOWCASE_PAGES.map((page) => page.key);
    const routes = SHOWCASE_PAGES.map((page) => page.route);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(new Set(routes).size, routes.length);
  });

  it("routes every page under its framework's demo root with a trailing slash", () => {
    for (const { route, framework } of SHOWCASE_PAGES) {
      const root = demoRootOf(framework ?? FRAMEWORK);
      assert.equal(route.startsWith(root), true, route);
      assert.equal(route.endsWith("/"), true, route);
    }
  });

  it("boots each page's framework entry, and no bundle from a redirect", () => {
    const matrix = new Map(
      matrixPages().map((page) => [`./${page.dir}/index.html`, page])
    );
    for (const page of SHOWCASE_PAGES) {
      const source = readFileSync(join(SHOWCASE, page.html), "utf8");
      if (page.framework === null) {
        assert.equal(isRedirectPage(source), true, page.html);
        assert.equal(entryModuleOf(source, page.html), undefined, page.html);
        continue;
      }
      const entry = entryModuleOf(source, page.html);
      assert.ok(entry, page.html);
      assert.equal(
        (source.match(MODULE_SCRIPT) ?? []).filter((tag) => SRC.test(tag))
          .length,
        1,
        `${page.html} must bootstrap exactly one module`
      );
      const spec = matrix.get(page.html);
      if (!spec) {
        assertStandaloneEntry(page, source, entry);
        continue;
      }
      const adapter = adapterByKey(spec.adapter);
      assert.ok(adapter, spec.adapter);
      assert.equal(page.framework, adapter.framework, page.html);
      assert.equal(`/${entry}`, frameworkOf(adapter).entry, page.html);
    }
  });

  it("forwards replaced addresses and keeps labs out of the sitemap without a refresh", () => {
    const replaced = new Set(
      REPLACED_PAGES.map(([from]) => `./${from}/index.html`)
    );
    for (const { html, indexable } of SHOWCASE_PAGES) {
      if (indexable) continue;
      const source = readFileSync(join(SHOWCASE, html), "utf8");
      if (replaced.has(html)) {
        assert.equal(isRedirectPage(source), true, html);
        continue;
      }
      assert.equal(isRedirectPage(source), false, html);
      assert.ok(entryModuleOf(source, html), html);
    }
  });
});

/**
 * Every React page carries a kit switcher, so every React page can be asked
 * to render any React kit — and a kit whose stylesheet never loaded renders
 * bare HTML. The stylesheets therefore belong to one shared module, and this
 * walks the manifest to prove no React page entry skips it. An Angular page
 * lazily loads the selected kit through either its matrix or live/lab entry.
 */
describe("the kit stylesheets every showcase page loads", () => {
  it("boots a module from every page that is not a redirect", () => {
    for (const page of SHOWCASE_PAGES) {
      const html = readFileSync(join(SHOWCASE, page.html), "utf8");
      const module = entryModuleOf(html, page.html);
      if (isRedirectPage(html)) continue;
      assert.ok(module, `${page.html} boots no module script`);
      assert.equal(
        existsSync(join(SHOWCASE, module)),
        true,
        `${page.html} boots ${module}, which does not exist`
      );
    }
  });

  it("imports the shared kit-styles module from every React page entry", () => {
    for (const { page, module, source } of reactPages()) {
      assert.ok(
        sideEffectImportsIn(source).includes(KIT_STYLES),
        `${module} (${page.route}) does not import "${KIT_STYLES}" — every kit ` +
          `the switcher offers on that page would render unstyled`
      );
    }
  });

  it("leaves every kit stylesheet to that module alone", () => {
    for (const { module, source } of reactPages()) {
      for (const imported of sideEffectImportsIn(source)) {
        if (imported === KIT_STYLES || imported === CHROME_SHEET) continue;
        assert.ok(
          !imported.endsWith(".css"),
          `${module} imports "${imported}" directly — kit stylesheets belong ` +
            `in "${KIT_STYLES}", which every entry already loads`
        );
      }
    }
  });

  it("loads the showcase chrome and no kit stylesheet on an Angular page", () => {
    const angular = bootingPages().filter(
      ({ page }) => page.framework === "angular"
    );
    assert.ok(angular.length > 0, "no Angular page boots a module");
    assert.deepEqual(sorted(new Set(angular.map(({ module }) => module))), [
      "src/angular/entry-demo.ts",
      "src/angular/entry-matrix.ts",
    ]);
    for (const { module, source } of angular) {
      const sheets = sideEffectImportsIn(source).filter((imported) =>
        imported.endsWith(".css")
      );
      assert.deepEqual(sheets, [`.${CHROME_SHEET}`], module);
      assert.equal(sideEffectImportsIn(source).includes(KIT_STYLES), false);
    }
  });

  it("carries every static kit stylesheet in that module", () => {
    const source = readFileSync(join(SHOWCASE, "src/kitStyles.ts"), "utf8");
    const imports = sideEffectImportsIn(source);
    for (const sheet of KIT_SHEETS) {
      assert.ok(
        imports.includes(sheet),
        `src/kitStyles.ts no longer imports "${sheet}" — the pages that ` +
          `depend on it import the module, not the sheet`
      );
    }
  });

  it("loads Angular kit styles only through lazy kit modules in both modes", () => {
    const ngZorro = readFileSync(
      join(SHOWCASE, "src/angular/kits/ngZorro.ts"),
      "utf8"
    );
    const unstyled = readFileSync(
      join(SHOWCASE, "src/angular/kits/unstyled.ts"),
      "utf8"
    );
    const kitModules = [
      "angularCdk",
      "aria",
      "material",
      "ngBootstrap",
      "ngZorro",
      "ngxBootstrap",
      "spartan",
      "taigaUi",
      "unstyled",
    ];
    for (const module of ["entry-matrix.ts", "entry-demo.ts"]) {
      const entry = readFileSync(join(SHOWCASE, "src/angular", module), "utf8");
      assert.match(
        entry,
        /case "ng-zorro":\s*return import\("\.\/kits\/ngZorro"\)/
      );
      const entrySource = ts.createSourceFile(
        module,
        entry,
        ts.ScriptTarget.Latest,
        true
      );
      const eagerImports = entrySource.statements
        .filter(ts.isImportDeclaration)
        .filter((statement) => !statement.importClause?.isTypeOnly);
      assert.equal(
        eagerImports.some(
          (statement) =>
            ts.isStringLiteral(statement.moduleSpecifier) &&
            statement.moduleSpecifier.text.includes("/kits/")
        ),
        false,
        `${module} must not eagerly import a kit`
      );
      const lazy = [];
      const visit = (node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const specifier = node.arguments[0];
          if (
            specifier &&
            ts.isStringLiteral(specifier) &&
            specifier.text.startsWith("./kits/")
          ) {
            lazy.push(specifier.text);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(entrySource);
      assert.deepEqual(
        sorted(lazy),
        sorted(kitModules.map((kit) => `./kits/${kit}`)),
        module
      );
      for (const specifier of lazy) {
        assert.ok(
          existsSync(join(SHOWCASE, "src/angular", `${specifier}.ts`)),
          specifier
        );
      }
    }
    const nativeSheets = ts
      .createSourceFile("ngZorro.ts", ngZorro, ts.ScriptTarget.Latest, true)
      .statements.filter(ts.isImportDeclaration)
      .filter((statement) => statement.importClause?.name)
      .map((statement) => statement.moduleSpecifier.text);
    for (const sheet of [
      "ng-zorro-antd/ng-zorro-antd.min.css?url",
      "ng-zorro-antd/ng-zorro-antd.dark.min.css?url",
    ]) {
      assert.ok(nativeSheets.includes(sheet), `${sheet} is not lazy-loaded`);
    }
    assert.equal(
      sideEffectImportsIn(ngZorro).some((sheet) =>
        sheet.startsWith("ng-zorro-antd/")
      ),
      false,
      "native themes must be activated individually, rather than both globally"
    );
    assert.doesNotMatch(unstyled, /ng-zorro-antd|ngZorro\.css|kits\/ngZorro/);
  });
});
