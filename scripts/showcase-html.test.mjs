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
} from "../apps/showcase/matrix.mjs";
import {
  featurePage,
  landingPage,
  readShowcaseHtml,
  showcaseHtmlFiles,
} from "./build-showcase-html.mjs";
import { docsReferenceRoute, docsRoute, siteUrl } from "./site.mjs";

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
    // features — across all eight kits; both Angular kits' landings
    // plus all twenty-one feature destinations; and the eight replaced top-level
    // addresses. Kit `/accessibility/` URLs are matrix pages again, not
    // redirects to editing. Written out rather than recomputed from the
    // matrix: the writer reads that same list, so a derived count would agree
    // with itself no matter what it produced.
    assert.equal(files.length, 8 * 22 + 2 * (1 + 21) + 8);
    assert.equal(new Set(files.map((file) => file.dir)).size, files.length);
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

  it("indexes every published Angular kit landing and feature page", () => {
    const pages = matrixPages().filter((page) => page.framework === "angular");
    assert.equal(pages.length, 44);
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
    assert.equal(ai.length, 10);
    const angularDirs = new Set(
      matrixPages()
        .filter((page) => page.framework === "angular")
        .map((page) => page.dir)
    );
    const angular = ai.filter((file) => angularDirs.has(file.dir));
    assert.deepEqual(angular.map((file) => file.dir).sort(), [
      "ng-zorro/ai",
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

  it("serves each page's own code and copy without JavaScript", () => {
    for (const file of files) {
      if (file.html.includes('http-equiv="refresh"')) continue;
      const main = /<main[\s\S]*?<\/main>/.exec(file.html)?.[0] ?? "";
      assert.match(main, /<h1>/, `${file.dir} serves no h1`);
      assert.equal(
        (main.match(/<h1>/g) ?? []).length,
        1,
        `${file.dir} serves more than one h1`
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
 * from another framework would. The fixture is a Vue kit the showcase does not
 * ship: it is handed to the page writers directly, never added to the matrix.
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

  const vue = {
    key: "vue",
    label: "Vue",
    binding: "@adapttable/vue",
    entry: "/src/vue/entry-matrix.ts",
  };
  const mantine = adapterByKey("mantine");
  assert.ok(mantine);
  const verdant = {
    ...mantine,
    key: "verdant",
    framework: "vue",
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
        vue: '<script setup lang="ts">\nimport { DataTable } from "{pkg}";\n</script>',
      },
    };
    const { dir, html } = featurePage(verdant, feature, vue);
    assert.equal(dir, "verdant/formulas");
    assert.match(
      html,
      /<script type="module" src="\/src\/vue\/entry-matrix\.ts"><\/script>/
    );
    assert.doesNotMatch(html, /entry-matrix\.tsx/);
    assert.match(html, /Replaced by Vue on mount/);
    assert.match(html, /Includes Vue integration code\./);
    assert.match(
      html,
      /import \{ DataTable \} from &quot;@adapttable\/verdant&quot;/
    );
    assert.doesNotMatch(html, /@adapttable\/react/);

    const landing = landingPage(verdant, vue);
    assert.match(landing.html, /<title>Verdant Vue data table examples/);
    assert.match(landing.html, /@adapttable\/vue connects it to Vue\./);
    assert.match(landing.html, /src="\/src\/vue\/entry-matrix\.ts"/);
  });

  it("refuses to show a Vue kit the code written for React", () => {
    assert.throws(
      () => featurePage(verdant, formulas, vue),
      /"formulas" has no Vue code for Verdant/
    );
  });

  it("refuses a kit whose framework the showcase does not serve", () => {
    assert.throws(
      () => landingPage(verdant),
      /Verdant is built on "vue", which SHOWCASE_FRAMEWORKS does not serve/
    );
  });
});
