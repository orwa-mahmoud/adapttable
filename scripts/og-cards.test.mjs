/** Check social card content, framework labels and title layout for docs pages. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ANGULAR_DOCS } from "./angular-docs.mjs";
import { ogCardMetadata, ogCardSvg, wrapCardTitle } from "./og-cards.mjs";

describe("social card metadata", () => {
  it("gives all fifty Angular sources their own card and framework text", () => {
    const cards = ogCardMetadata();
    const angular = cards.filter((card) => card.framework === "angular");
    assert.deepEqual(
      angular.map((card) => `${card.slug}.md`).sort(),
      [...ANGULAR_DOCS].sort()
    );
    for (const card of angular) {
      assert.match(card.kicker, /^Angular · /);
      assert.match(card.footer, /Angular/);
      assert.doesNotMatch(card.footer, /React/);
      assert.ok(wrapCardTitle(card.title).length <= 3);
    }
    const hydration = angular.find((card) => card.slug === "angular/ssr-rsc");
    assert.equal(hydration.title, "SSR & hydration");
    assert.equal(
      cards.find((card) => card.slug === "ssr-rsc").title,
      "SSR & RSC"
    );
    assert.equal(
      cards.find((card) => card.slug === "concepts").framework,
      "shared"
    );
  });

  it("preserves standalone React migration and comparison titles", () => {
    const cards = ogCardMetadata();
    assert.equal(
      cards.find((card) => card.slug === "comparison").title,
      "AdaptTable vs ag-Grid, MUI X & TanStack Table"
    );
    assert.equal(
      cards.find((card) => card.slug === "migrate-from-v2").title,
      "Migrate from AdaptTable v2"
    );
    assert.equal(
      cards.find((card) => card.slug === "filtering").footer,
      "Headless React data table · one API, every UI kit"
    );
  });
});

describe("browser-free SVG cards", () => {
  it("wraps deterministically without dropping words or long labels", () => {
    assert.deepEqual(
      wrapCardTitle("Angular command palette and context menus", 24),
      ["Angular command palette", "and context menus"]
    );
    assert.deepEqual(wrapCardTitle("abcdefghijk", 4), ["abcd", "efgh", "ijk"]);
    assert.throws(() => wrapCardTitle("label", 0), /positive integer/);
  });

  it("escapes all user-visible strings and declares exact dimensions", () => {
    const card = {
      title: '<script> & "title"',
      kicker: "A < B",
      footer: "It’s 'safe' & visible",
    };
    const svg = ogCardSvg(card);
    assert.match(svg, /width="1200" height="630" viewBox="0 0 1200 630"/);
    assert.doesNotMatch(svg, /<script>/);
    assert.match(svg, /&lt;script&gt; &amp; &quot;title&quot;/);
    assert.match(svg, /A &lt; B/);
    assert.match(svg, /&#39;safe&#39; &amp; visible/);
    assert.equal(ogCardSvg(card), svg);
    assert.throws(
      () => ogCardSvg({ ...card, title: "a ".repeat(100) }),
      /more than three lines/
    );
  });

  it("renders every registered title without clipping it to a fixed line count", () => {
    for (const card of ogCardMetadata()) {
      const svg = ogCardSvg(card);
      const lines = wrapCardTitle(card.title);
      assert.equal(
        (svg.match(/<tspan x="76"/g) ?? []).length,
        lines.length,
        card.slug
      );
      assert.match(svg, /y="554"/);
    }
  });
});
