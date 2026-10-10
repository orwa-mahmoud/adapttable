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
  ["preview", "src/vue/entry-native.ts"],
  ["workspace", "src/vue/workspace/entry-workspace.ts"],
  ["assistant", "src/vue/entry-assistant.ts"],
  ["table-surfaces", "src/vue/entry-table-surfaces.ts"],
  ["table-footers", "src/vue/entry-table-footers.ts"],
  ["filter-editing", "src/vue/entry-filter-editing.ts"],
  ["composition", "src/vue/entry-composition.ts"],
  ["hierarchy", "src/vue/entry-hierarchy.ts"],
  ["row-controls", "src/vue/entry-rows.ts"],
  ["selection-contract", "src/vue/entry-selection-contract.ts"],
  ["view-controls", "src/vue/entry-view-controls.ts"],
  ["column-menu", "src/vue/column-menu/entry-column-menu.ts"],
  ["navigation", "src/vue/navigation/entry-navigation.ts"],
  ["actions", "src/vue/actions/entry-actions.ts"],
  ["specialized", "src/vue/specialized/entry-specialized.ts"],
  ["feature-union", "src/vue/feature-union/entry-feature-union.ts"],
]);

const VUE_KIT_PREVIEW_ENTRIES = new Map([
  ["element-plus", "src/vue/kits/entry-element-plus.ts"],
  ["vuetify", "src/vue/kits/entry-vuetify.ts"],
  ["naive-ui", "src/vue/kits/entry-naive-ui.ts"],
  ["reka-ui", "src/vue/kits/entry-reka-ui.ts"],
  ["shadcn-vue", "src/vue/kits/entry-shadcn-vue.ts"],
  ["nuxt-ui", "src/vue/kits/entry-nuxt-ui.ts"],
  ["quasar", "src/vue/kits/entry-quasar.ts"],
]);

const VUE_KIT_LAB_ENTRIES = new Map([
  ["shadcn-vue/filter-panel", "src/vue/kits/entry-shadcn-filter-panel.ts"],
  ["shadcn-vue/feature-parity", "src/vue/kits/entry-shadcn-feature-parity.ts"],
  [
    "shadcn-vue/action-surfaces",
    "src/vue/kits/entry-shadcn-action-surfaces.ts",
  ],
  ["nuxt-ui/workspace", "src/vue/kits/entry-nuxt-workspace.ts"],
  ["naive-ui/filter-panel", "src/vue/kits/entry-naive-filter-panel.ts"],
]);

const VUE_KIT_LAB_WRAPPERS = new Map([
  ["nuxt-ui/workspace", "NuxtWorkspaceShowcase.vue"],
  ["naive-ui/filter-panel", "NaiveFilterPanelShowcase.vue"],
]);

const STANDALONE_ENTRIES = new Map([
  ["main", "src/main.tsx"],
  ["all-options", "src/entry-all-options.tsx"],
  ["agent-approval", "src/entry-agent-approval.tsx"],
  ["mcp-app", "src/entry-mcp-app.tsx"],
  ...[...VUE_KIT_PREVIEW_ENTRIES].map(([kit, entry]) => [
    `vue-${kit}-orders`,
    entry,
  ]),
  ...[...VUE_KIT_LAB_ENTRIES].map(([path, entry]) => [
    `vue-${path.replaceAll("/", "-")}`,
    entry,
  ]),
  ["angular-main", "src/angular/entry-demo.ts"],
  ["angular-all-options", "src/angular/entry-demo.ts"],
  ...[...VUE_PREVIEW_ENTRIES].map(([slug, entry]) => [
    `vue-unstyled-${slug}`,
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
    const lab = [...VUE_KIT_LAB_ENTRIES.keys()].find(
      (path) => page.key === `vue-${path.replaceAll("/", "-")}`
    );
    if (lab) {
      assert.equal(page.route, `/vue/demo/${lab}/`);
      assert.equal(page.indexable, false);
      assert.doesNotMatch(source, /data-matrix-page/);
      return;
    }
    const kit = [...VUE_KIT_PREVIEW_ENTRIES.keys()].find(
      (key) => page.key === `vue-${key}-orders`
    );
    if (kit) {
      assert.equal(page.route, `/vue/demo/${kit}/orders/`);
      assert.equal(page.indexable, false);
      assert.doesNotMatch(source, /data-matrix-page/);
      return;
    }
    const preview = [...VUE_PREVIEW_ENTRIES].find(
      ([slug]) => page.key === `vue-unstyled-${slug}`
    );
    assert.ok(preview, page.html);
    const [slug] = preview;
    assert.equal(page.route, `/vue/demo/unstyled/${slug}/`);
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
    const previewKeys = new Set(
      [...VUE_PREVIEW_ENTRIES.keys()].map((slug) => `vue-unstyled-${slug}`)
    );
    const vue = SHOWCASE_PAGES.filter((page) => previewKeys.has(page.key));
    assert.deepEqual(
      vue,
      [...VUE_PREVIEW_ENTRIES.keys()].map((slug) => ({
        key: `vue-unstyled-${slug}`,
        html: `./vue/unstyled/${slug}/index.html`,
        route: `/vue/demo/unstyled/${slug}/`,
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
    // The previews sit beside the Vue Unstyled kit's indexed matrix pages,
    // which own the kit's own address and the feature addresses.
    const matrix = matrixPages().filter(
      (page) => page.framework === "vue" && page.adapter === "vue-unstyled"
    );
    assert.equal(matrix.length, MATRIX_FEATURES.length + 1);
    for (const page of matrix) {
      assert.ok(indexed.includes(demoRoute(page.path, "vue")), page.path);
      assert.equal(previewKeys.has(page.dir.replaceAll("/", "-")), false);
    }
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

  it("registers each actual Vue kit entry separately from complete feature parity", () => {
    for (const [kit, entry] of VUE_KIT_PREVIEW_ENTRIES) {
      const pages = SHOWCASE_PAGES.filter(
        (page) => page.key === `vue-${kit}-orders`
      );
      assert.deepEqual(pages, [
        {
          key: `vue-${kit}-orders`,
          html: `./vue/${kit}/orders/index.html`,
          route: `/vue/demo/${kit}/orders/`,
          indexable: false,
          framework: "vue",
        },
      ]);
      const source = readFileSync(join(SHOWCASE, entry), "utf8");
      assert.match(source, /createApp/);
      assert.doesNotMatch(
        source,
        /@adapttable\/(?:core|react|angular|unstyled)["/]/
      );
    }
  });

  it("boots real-control Vue labs separately from the seven basic kit previews", () => {
    const indexed = indexableRoutes(SHOWCASE_PAGES);
    for (const [path, entry] of VUE_KIT_LAB_ENTRIES) {
      const key = `vue-${path.replaceAll("/", "-")}`;
      assert.deepEqual(
        SHOWCASE_PAGES.filter((page) => page.key === key),
        [
          {
            key,
            html: `./vue/${path}/index.html`,
            route: `/vue/demo/${path}/`,
            indexable: false,
            framework: "vue",
          },
        ]
      );
      assert.equal(indexed.includes(`/vue/demo/${path}/`), false);
      const source = readFileSync(join(SHOWCASE, entry), "utf8");
      assert.match(source, /createApp\(Fixture\)/);
      // Each lab mounts its own kit's fixture, directly or through a showcase
      // wrapper component.
      const wrapper = VUE_KIT_LAB_WRAPPERS.get(path);
      if (wrapper) assert.ok(source.includes(`from "./${wrapper}"`), path);
      const mounted = wrapper
        ? readFileSync(join(SHOWCASE, "src/vue/kits", wrapper), "utf8")
        : source;
      assert.ok(
        mounted.includes(`packages/vue/adapter-${path.split("/")[0]}/`),
        path
      );
      assert.doesNotMatch(
        source,
        /@adapttable\/(?:core|react|angular|unstyled)["/]/
      );
    }
    const nuxt = readFileSync(
      join(SHOWCASE, VUE_KIT_LAB_ENTRIES.get("nuxt-ui/workspace")),
      "utf8"
    );
    assert.match(nuxt, /import "\.\/nuxt-ui\.css"/);
    assert.match(nuxt, /from "@nuxt\/ui\/vue-plugin"/);
    assert.match(nuxt, /\.use\(ui\)\.mount\("#root"\)/);
    const fixture = readFileSync(
      join(SHOWCASE, "src/vue/kits/NuxtWorkspaceShowcase.vue"),
      "utf8"
    );
    assert.match(
      fixture,
      /packages\/vue\/adapter-nuxt-ui\/browser\/workspace\/NuxtWorkspaceFixture\.vue/
    );
    assert.match(fixture, /<Fixture \/>/);
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
