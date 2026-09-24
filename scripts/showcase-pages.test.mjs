import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { builtAdapters, MATRIX_FEATURES } from "../apps/showcase/matrix.mjs";
import { REPLACED_PAGES, SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";
import { DEMO_ROOT, demoRoute } from "./site.mjs";
import { isRedirectPage } from "./sitemap-routes.mjs";

const SHOWCASE = fileURLToPath(new URL("../apps/showcase/", import.meta.url));

const INDEX = "index.html";

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
const entryModuleOf = (html) => {
  const tag = (html.match(MODULE_SCRIPT) ?? []).find((candidate) =>
    SRC.test(candidate)
  );
  const src = tag?.match(SRC)?.[1];
  // Vite resolves a root-absolute `src` against the showcase package root.
  return src?.startsWith("/") ? src.slice(1) : src;
};

const sideEffectImportsIn = (source) =>
  [...source.matchAll(SIDE_EFFECT_IMPORT)].map((match) => match[1]);

/** Every page that boots a bundle, as `{ page, module, source }`. */
const bootingPages = () =>
  SHOWCASE_PAGES.map((page) => {
    const html = readFileSync(join(SHOWCASE, page.html), "utf8");
    const module = entryModuleOf(html);
    return {
      page,
      module,
      source: module ? readFileSync(join(SHOWCASE, module), "utf8") : null,
    };
  }).filter((entry) => entry.module);

describe("the showcase page manifest", () => {
  it("lists every page directory, and only pages that exist", () => {
    assert.deepEqual(
      sorted(SHOWCASE_PAGES.map((page) => page.html)),
      entriesOnDisk()
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

  it("routes every page under the demo root with a trailing slash", () => {
    for (const { route } of SHOWCASE_PAGES) {
      assert.equal(route.startsWith(DEMO_ROOT), true, route);
      assert.equal(route.endsWith("/"), true, route);
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
      assert.ok(entryModuleOf(source), html);
    }
  });
});

/**
 * Every page carries a kit switcher, so every page can be asked to render any
 * kit — and a kit whose stylesheet never loaded renders bare HTML. The
 * stylesheets therefore belong to one shared module, and this walks the
 * manifest to prove no page entry skips it.
 */
describe("the kit stylesheets every showcase page loads", () => {
  it("boots a module from every page that is not a redirect", () => {
    for (const page of SHOWCASE_PAGES) {
      const html = readFileSync(join(SHOWCASE, page.html), "utf8");
      const module = entryModuleOf(html);
      if (isRedirectPage(html)) continue;
      assert.ok(module, `${page.html} boots no module script`);
      assert.equal(
        existsSync(join(SHOWCASE, module)),
        true,
        `${page.html} boots ${module}, which does not exist`
      );
    }
  });

  it("imports the shared kit-styles module from every page entry", () => {
    for (const { page, module, source } of bootingPages()) {
      assert.ok(
        sideEffectImportsIn(source).includes(KIT_STYLES),
        `${module} (${page.route}) does not import "${KIT_STYLES}" — every kit ` +
          `the switcher offers on that page would render unstyled`
      );
    }
  });

  it("leaves every kit stylesheet to that module alone", () => {
    for (const { module, source } of bootingPages()) {
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
});
