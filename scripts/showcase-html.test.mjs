import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  featuresOf,
  frameworkOf,
  MATRIX_FEATURES,
  matrixPages,
  VUE_KIT_LAB_PAGES,
  VUE_KIT_PAGES,
  VUE_NATIVE_BASELINE,
  VUE_NATIVE_PAGES,
} from "../apps/showcase/matrix.mjs";
import {
  featurePage,
  landingPage,
  nativeVuePage,
  readShowcaseHtml,
  showcaseHtmlFiles,
} from "./build-showcase-html.mjs";
import { demoRoute, docsReferenceRoute, docsRoute, siteUrl } from "./site.mjs";

const ANGULAR_MODES = new Map([
  ["angular-main", { mode: "live", route: demoRoute("", "angular") }],
  [
    "angular-all-options",
    { mode: "lab", route: demoRoute("all-options", "angular") },
  ],
]);

/**
 * The showcase's generated HTML is what is on disk.
 *
 * Every adapter × feature page is written from `apps/showcase/matrix.mjs` by
 * `scripts/build-showcase-html.mjs`, and the result is committed — Vite reads
 * the files as build inputs and the dev server serves them straight off disk.
 * Committed generated files drift the moment someone edits the source and
 * forgets to regenerate, and the drift is invisible: the page still builds, it
 * just serves last week's title to Google.
 *
 * So the gate compares them. A failure here has one fix — run the writer.
 */
describe("the generated showcase pages", () => {
  const files = showcaseHtmlFiles();

  it("writes one page per matrix entry and per replaced address", () => {
    // Twenty-two pages per React adapter — a landing plus twenty-one
    // features — across all eight kits; the same twenty-two for each of the
    // nine Angular kits and the eight Vue kits; and the eight replaced
    // top-level addresses, two Angular modes, sixteen native Vue previews,
    // seven kit order desks and five real-control labs. Kit `/accessibility/`
    // URLs are matrix pages again, not redirects to editing. Written out rather
    // than recomputed from the matrix: the writer reads that same list, so a
    // derived count would agree with itself no matter what it produced.
    assert.equal(
      files.length,
      8 * 22 + 9 * (1 + 21) + 8 * (1 + 21) + 8 + 2 + 16 + 7 + 5
    );
    assert.equal(new Set(files.map((file) => file.dir)).size, files.length);
  });

  it("writes the Vue base preview without indexability or parity claims", () => {
    const { dir, html } = nativeVuePage();
    assert.equal(dir, "vue/unstyled/preview");
    assert.match(html, /name="robots" content="noindex, follow"/);
    assert.ok(
      html.includes(`href="${siteUrl("/vue/demo/unstyled/preview/")}"`)
    );
    assert.ok(html.includes(VUE_NATIVE_BASELINE.notice));
    assert.match(html, /href="\.\.\/\.\.\/\.\.\/third-party-notices\.txt"/);
    assert.match(html, /src="\.\.\/\.\.\/\.\.\/src\/vue\/entry-native\.ts"/);
    assert.doesNotMatch(html, /data-matrix-page|entry-matrix|npm install/);
    // The Vue Unstyled kit's own landing owns the kit's address.
    assert.ok(
      matrixPages().some(
        (page) =>
          page.framework === "vue" &&
          page.path === "unstyled" &&
          page.feature === null
      )
    );
  });

  it("registers each implemented Vue feature preview exactly once", () => {
    assert.deepEqual(
      VUE_NATIVE_PAGES.map((page) => page.path),
      [
        "unstyled/preview",
        "unstyled/workspace",
        "unstyled/assistant",
        "unstyled/table-surfaces",
        "unstyled/table-footers",
        "unstyled/filter-editing",
        "unstyled/composition",
        "unstyled/hierarchy",
        "unstyled/row-controls",
        "unstyled/selection-contract",
        "unstyled/view-controls",
        "unstyled/column-menu",
        "unstyled/navigation",
        "unstyled/actions",
        "unstyled/specialized",
        "unstyled/feature-union",
      ]
    );
    for (const page of VUE_NATIVE_PAGES) {
      const generated = files.filter((file) => file.dir === page.dir);
      assert.equal(generated.length, 1, page.dir);
      assert.match(
        generated[0].html,
        /name="robots" content="noindex, follow"/
      );
      assert.ok(generated[0].html.includes(page.entry.slice(1)), page.dir);
      assert.ok(
        generated[0].html.includes(siteUrl(demoRoute(page.path, "vue"))),
        page.dir
      );
    }
  });

  it("generates seven genuine Vue kit order desks without a parity claim", () => {
    assert.deepEqual(
      VUE_KIT_PAGES.map((page) => page.path),
      [
        "element-plus/orders",
        "vuetify/orders",
        "naive-ui/orders",
        "reka-ui/orders",
        "shadcn-vue/orders",
        "nuxt-ui/orders",
        "quasar/orders",
      ]
    );
    for (const page of VUE_KIT_PAGES)
      assert.equal(page.path, `${page.kit}/orders`);
    for (const page of VUE_KIT_PAGES) {
      const generated = files.filter((file) => file.dir === page.dir);
      assert.equal(generated.length, 1, page.dir);
      assert.match(
        generated[0].html,
        /name="robots" content="noindex, follow"/
      );
      assert.ok(
        generated[0].html.includes(siteUrl(demoRoute(page.path, "vue"))),
        page.dir
      );
      assert.ok(generated[0].html.includes(page.entry.slice(1)), page.dir);
      assert.match(
        generated[0].html,
        /Preview of table controls, selection, search, pagination and presentation settings/
      );
    }
  });

  it("generates each real-control Vue kit lab exactly once without indexing it", () => {
    assert.deepEqual(
      VUE_KIT_LAB_PAGES.map((page) => page.path),
      [
        "shadcn-vue/filter-panel",
        "shadcn-vue/feature-parity",
        "shadcn-vue/action-surfaces",
        "nuxt-ui/workspace",
        "naive-ui/filter-panel",
      ]
    );
    for (const page of VUE_KIT_LAB_PAGES) {
      const generated = files.filter((file) => file.dir === page.dir);
      assert.equal(generated.length, 1, page.dir);
      assert.match(
        generated[0].html,
        /name="robots" content="noindex, follow"/
      );
      assert.ok(
        generated[0].html.includes(siteUrl(demoRoute(page.path, "vue"))),
        page.dir
      );
      assert.ok(generated[0].html.includes(page.entry.slice(1)), page.dir);
      assert.ok(generated[0].html.includes(page.notice), page.dir);
      assert.equal(
        VUE_KIT_PAGES.some((preview) => preview.path === page.path),
        false
      );
    }
  });

  it("gives every Angular kit a destination for every matrix feature", () => {
    const expected = MATRIX_FEATURES.map((feature) => feature.slug).sort();
    for (const kit of builtAdapters("angular")) {
      assert.deepEqual(
        featuresOf(kit)
          .map((feature) => feature.slug)
          .sort(),
        expected,
        `${kit.key} leaves a feature without an Angular destination`
      );
    }
  });

  it("indexes every registered Angular kit landing and feature page", () => {
    const pages = matrixPages().filter((page) => page.framework === "angular");
    assert.equal(pages.length, 198);
    for (const page of pages) {
      assert.equal(page.indexable, true, page.dir);
      const kit = adapterByKey(page.adapter);
      const generated = page.feature
        ? featurePage(kit, featureBySlug(page.feature))
        : landingPage(kit);
      assert.ok(
        generated.html.includes(
          'name="robots" content="index, follow, max-image-preview:large"'
        ),
        page.dir
      );
    }
  });

  it("gives every Vue kit the pages every React kit has", () => {
    const expected = MATRIX_FEATURES.map((feature) => feature.slug).sort();
    const kits = builtAdapters("vue");
    assert.equal(kits.length, 8);
    for (const kit of kits)
      assert.deepEqual(
        featuresOf(kit)
          .map((feature) => feature.slug)
          .sort(),
        expected,
        `${kit.key} leaves a feature without a Vue destination`
      );
    const perKit = (framework) =>
      matrixPages().filter((page) => page.framework === framework).length /
      builtAdapters(framework).length;
    assert.equal(perKit("vue"), perKit("react"));
  });

  it("indexes every Vue kit landing and feature page under the Vue demo root", () => {
    const pages = matrixPages().filter((page) => page.framework === "vue");
    assert.equal(pages.length, 176);
    for (const page of pages) {
      assert.equal(page.indexable, true, page.dir);
      assert.equal(page.dir, `vue/${page.path}`);
      const kit = adapterByKey(page.adapter);
      const generated = page.feature
        ? featurePage(kit, featureBySlug(page.feature))
        : landingPage(kit);
      assert.equal(generated.dir, page.dir);
      assert.ok(
        generated.html.includes(
          `<link rel="canonical" href="${siteUrl(demoRoute(page.path, "vue"))}"`
        ),
        page.dir
      );
      assert.ok(
        generated.html.includes(`data-matrix-page="${page.path}"`),
        page.dir
      );
      assert.ok(
        generated.html.includes(
          'name="robots" content="index, follow, max-image-preview:large"'
        ),
        page.dir
      );
    }
    // Vue Unstyled keeps the kit's npm homepage address.
    assert.ok(pages.some((page) => page.dir === "vue/unstyled"));
  });

  it("states on every Vue install line that publication comes first", () => {
    for (const kit of builtAdapters("vue")) {
      const { html } = landingPage(kit);
      assert.ok(
        html.includes("# Runs once the Vue packages are published to npm"),
        kit.key
      );
    }
  });

  it("links Angular showcase pages to Angular guides and preserves shared references", () => {
    for (const kit of builtAdapters("angular")) {
      assert.ok(
        landingPage(kit).html.includes(
          `href="${siteUrl(docsRoute("angular/getting-started"))}"`
        )
      );
      for (const feature of featuresOf(kit)) {
        const { html } = featurePage(kit, feature);
        for (const page of feature.docs)
          assert.ok(
            html.includes(
              `href="${siteUrl(docsReferenceRoute(page, "angular"))}"`
            ),
            `${kit.key}/${feature.slug}: ${page}`
          );
      }
      const { html } = featurePage(kit, featureBySlug("filtering"));
      assert.ok(
        html.includes(`href="${siteUrl(docsRoute("angular/filtering"))}"`)
      );
      assert.equal(
        html.includes(`href="${siteUrl(docsRoute("filtering"))}"`),
        false
      );
    }
    for (const kit of builtAdapters("react")) {
      assert.ok(
        landingPage(kit).html.includes(
          `href="${siteUrl(docsRoute("getting-started"))}"`
        )
      );
      const { html } = featurePage(kit, featureBySlug("filtering"));
      assert.ok(html.includes(`href="${siteUrl(docsRoute("filtering"))}"`));
    }
  });

  it("matches what is committed", () => {
    const stale = files
      .filter((file) => readShowcaseHtml(file.dir) !== file.html)
      .map((file) => file.dir);
    assert.deepEqual(
      stale,
      [],
      `these pages are not what matrix.mjs writes — run ` +
        `\`node scripts/build-showcase-html.mjs\`:\n  ${stale.join("\n  ")}`
    );
  });

  it("gives every indexable page its own title and description", () => {
    const live = files.filter(
      (file) => !file.html.includes('http-equiv="refresh"')
    );
    const titles = live.map(
      (file) => /<title>([^<]+)<\/title>/.exec(file.html)?.[1]
    );
    const descriptions = live.map(
      (file) =>
        /<meta name="description" content="([^"]+)"/.exec(file.html)?.[1]
    );
    // Two pages competing for the same search is one page losing it.
    assert.equal(new Set(titles).size, live.length);
    assert.equal(new Set(descriptions).size, live.length);
    for (const description of descriptions) {
      assert.ok(description && description.length > 40, description);
    }
  });

  it("names the v3 row-reordering and aggregation capabilities in static HTML", () => {
    // React's code on React's pages; the Angular kit's own page states what
    // it renders.
    const react = new Set(builtAdapters("react").map((adapter) => adapter.key));
    const reactFiles = files.filter((file) =>
      react.has(file.dir.split("/")[0] ?? "")
    );
    const reorder = reactFiles.filter((file) =>
      file.dir.endsWith("/row-reordering")
    );
    const aggregation = reactFiles.filter((file) =>
      file.dir.endsWith("/aggregation")
    );
    assert.equal(reorder.length, 8);
    assert.equal(aggregation.length, 8);
    for (const file of reorder) {
      assert.match(file.html, /movePolicy/);
      assert.match(file.html, /onGroupMove|grouped/);
      assert.match(file.html, /onTreeMove|tree/);
      assert.match(file.html, /rowReorder/);
    }
    for (const file of aggregation) {
      assert.match(file.html, /pinnedSummaryRows/);
      assert.match(file.html, /summaryRow/);
      assert.match(file.html, /groupAggregates/);
    }
  });

  it("names the v3 AI integration capabilities in static HTML", () => {
    const ai = files.filter((file) => file.dir.endsWith("/ai"));
    assert.equal(ai.length, 25);
    const vueDirs = new Set(
      matrixPages()
        .filter((page) => page.framework === "vue")
        .map((page) => page.dir)
    );
    const vue = ai.filter((file) => vueDirs.has(file.dir));
    assert.equal(vue.length, 8);
    for (const file of vue) {
      assert.match(file.html, /useTableAssistant/);
      assert.match(file.html, /tableAgent/);
      assert.match(file.html, /@adapttable\/ai-vue/);
      assert.match(file.html, /session\.execute/);
      assert.match(file.html, /No language model or API key is needed/);
      assert.doesNotMatch(file.html, /ai-angular|injectTableAssistant/);
    }
    const angularDirs = new Set(
      matrixPages()
        .filter((page) => page.framework === "angular")
        .map((page) => page.dir)
    );
    const angular = ai.filter((file) => angularDirs.has(file.dir));
    assert.deepEqual(angular.map((file) => file.dir).sort(), [
      "angular-cdk/ai",
      "aria/ai",
      "material/ai",
      "ng-bootstrap/ai",
      "ng-zorro/ai",
      "ngx-bootstrap/ai",
      "spartan/ai",
      "taiga-ui/ai",
      "unstyled/ai",
    ]);
    for (const file of angular) {
      assert.match(file.html, /injectTableAssistant/);
      assert.match(file.html, /tableAgent/);
      assert.match(file.html, /session\.execute/);
      assert.match(file.html, /No language model or API key is needed/);
      assert.match(file.html, /approved write updates the host/);
      assert.doesNotMatch(file.html, /Connect backend/);
    }
    const reactDirs = new Set(
      matrixPages()
        .filter((page) => page.framework === "react")
        .map((page) => page.dir)
    );
    const react = ai.filter((file) => reactDirs.has(file.dir));
    assert.equal(react.length, 8);
    for (const file of react) {
      assert.match(file.html, /tableAgent/);
      assert.match(file.html, /session\.execute|catalog/);
      assert.match(file.html, /agentApproval/);
      // Crawlers see the current conversational interface, with an honest
      // distinction between scripted scenarios and a connected model.
      assert.match(file.html, /AI table assistant/);
      assert.match(
        file.html,
        /deterministic local scenarios, not a language model/
      );
      assert.match(file.html, /Connect backend/);
      assert.doesNotMatch(file.html, /never grouping or pivoting/);
    }
  });

  it("serves matrix code and mode-specific live/lab fallbacks without JavaScript", () => {
    const matrixDirs = new Set(matrixPages().map((page) => page.dir));
    for (const file of files) {
      if (file.html.includes('http-equiv="refresh"')) continue;
      const main = /<main[\s\S]*?<\/main>/.exec(file.html)?.[0] ?? "";
      assert.match(main, /<h1>/, `${file.dir} serves no h1`);
      assert.equal(
        (main.match(/<h1>/g) ?? []).length,
        1,
        `${file.dir} serves more than one h1`
      );
      const vuePage = [
        ...VUE_NATIVE_PAGES,
        ...VUE_KIT_PAGES,
        ...VUE_KIT_LAB_PAGES,
      ].find((page) => page.dir === file.dir);
      if (vuePage) {
        assert.ok(main.includes(vuePage.description), file.dir);
        assert.ok(main.includes(vuePage.notice), file.dir);
        assert.doesNotMatch(main, /<pre><code>|npm install/);
        continue;
      }
      const mode = ANGULAR_MODES.get(file.dir);
      if (mode) {
        assert.match(
          file.html,
          new RegExp(`<div id="root" data-angular-mode="${mode.mode}">`),
          file.dir
        );
        assert.ok(
          file.html.includes(
            `<link rel="canonical" href="${siteUrl(mode.route)}"`
          ),
          file.dir
        );
        assert.match(main, /<p>[^<]{40,}<\/p>/, file.dir);
        assert.ok(
          main.includes(`href="${docsRoute("angular/getting-started")}"`),
          file.dir
        );
        assert.match(file.html, /src="\.\.\/src\/angular\/entry-demo\.ts"/);
        assert.doesNotMatch(file.html, /data-matrix-page|entry-matrix/);
        continue;
      }
      assert.ok(
        matrixDirs.has(file.dir),
        `unclassified live page: ${file.dir}`
      );
      assert.match(main, /<pre><code>/, `${file.dir} serves no code`);
      assert.ok(
        main.split(/\s+/).length > 80,
        `${file.dir} serves too little copy to read as a page`
      );
    }
  });
});

/**
 * A kit's pages boot the entry of the framework it is built on and say that
 * framework's name — the React pages above do it through the same lookup a kit
 * from another framework would. The fixture is a Svelte kit the showcase does
 * not ship: it is handed to the page writers directly, never added to the
 * matrix.
 */
describe("the framework a kit is built on", () => {
  const files = new Map(showcaseHtmlFiles().map((file) => [file.dir, file]));

  it("boots every matrix page from its adapter's framework entry", () => {
    for (const page of matrixPages()) {
      const adapter = adapterByKey(page.adapter);
      assert.ok(adapter, page.adapter);
      const { entry } = frameworkOf(adapter);
      assert.equal(page.framework, adapter.framework);
      assert.ok(
        files
          .get(page.dir)
          ?.html.includes(`<script type="module" src="${entry}"></script>`),
        `${page.dir} does not boot ${entry}`
      );
    }
  });

  const svelte = {
    key: "svelte",
    label: "Svelte",
    binding: "@adapttable/svelte",
    entry: "/src/svelte/entry-matrix.ts",
  };
  const mantine = adapterByKey("mantine");
  assert.ok(mantine);
  const verdant = {
    ...mantine,
    key: "verdant",
    framework: "svelte",
    label: "Verdant",
    pkg: "@adapttable/verdant",
    peer: "verdant-ui",
    install: "pnpm add @adapttable/verdant @adapttable/core verdant-ui",
  };
  const formulas = featureBySlug("formulas");
  assert.ok(formulas);

  it("serves a kit from another framework through that framework's entry and code", () => {
    const feature = {
      ...formulas,
      snippets: {
        svelte:
          '<script lang="ts">\nimport { DataTable } from "{pkg}";\n</script>',
      },
    };
    const { dir, html } = featurePage(verdant, feature, svelte);
    assert.equal(dir, "verdant/formulas");
    assert.match(
      html,
      /<script type="module" src="\/src\/svelte\/entry-matrix\.ts"><\/script>/
    );
    assert.doesNotMatch(html, /entry-matrix\.tsx/);
    assert.match(html, /Replaced by Svelte on mount/);
    assert.match(html, /Includes Svelte integration code\./);
    assert.match(
      html,
      /import \{ DataTable \} from &quot;@adapttable\/verdant&quot;/
    );
    assert.doesNotMatch(html, /@adapttable\/react/);

    const landing = landingPage(verdant, svelte);
    assert.match(landing.html, /<title>Verdant Svelte data table examples/);
    assert.match(landing.html, /@adapttable\/svelte connects it to Svelte\./);
    assert.match(landing.html, /src="\/src\/svelte\/entry-matrix\.ts"/);
  });

  it("refuses to show a Svelte kit the code written for React", () => {
    assert.throws(
      () => featurePage(verdant, formulas, svelte),
      /"formulas" has no Svelte code for Verdant/
    );
  });

  it("refuses a kit whose framework the showcase does not serve", () => {
    assert.throws(
      () => landingPage(verdant),
      /Verdant is built on "svelte", which SHOWCASE_FRAMEWORKS does not serve/
    );
  });
});
