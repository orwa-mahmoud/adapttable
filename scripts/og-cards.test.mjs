/** Check social card content, framework labels and title layout for docs pages. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JSDOM } from "jsdom";

import { ANGULAR_DOCS } from "./angular-docs.mjs";
import { ogCardMetadata, ogCardSvg, wrapCardTitle } from "./og-cards.mjs";
import { VUE_DOCS } from "./vue-docs.mjs";

describe("social card metadata", () => {
  it("labels every Vue guide as experimental without a React kit claim", () => {
    const cards = ogCardMetadata().filter((card) => card.framework === "vue");
    assert.deepEqual(
      cards.map((card) => `${card.slug}.md`),
      VUE_DOCS
    );
    for (const card of cards) {
      assert.match(card.footer, /Experimental Vue/);
      assert.doesNotMatch(card.footer, /React|every UI kit/);
      assert.ok(wrapCardTitle(card.title).length <= 3);
    }
  });
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

  for (const [title, escapedTitle] of [
    ['<script> & "title"', "&lt;script&gt; &amp; &quot;title&quot;"],
    ['<SCRIPT> & "title"', "&lt;SCRIPT&gt; &amp; &quot;title&quot;"],
  ]) {
    it(`escapes all user-visible strings and declares exact dimensions (${title})`, () => {
      const card = {
        title,
        kicker: "A < B",
        footer: "It’s 'safe' & visible",
      };
      const svg = ogCardSvg(card);
      const document = new JSDOM(svg, { contentType: "image/svg+xml" }).window
        .document;
      const root = document.documentElement;
      assert.equal(root.localName, "svg");
      assert.equal(root.namespaceURI, "http://www.w3.org/2000/svg");
      assert.equal(root.getAttribute("width"), "1200");
      assert.equal(root.getAttribute("height"), "630");
      assert.equal(root.getAttribute("viewBox"), "0 0 1200 630");
      assert.equal(root.getAttribute("aria-labelledby"), "card-title");
      assert.equal(
        [...document.querySelectorAll("*")].some(
          (element) => element.localName.toLowerCase() === "script"
        ),
        false
      );
      const accessibleTitle = document.querySelector("title#card-title");
      assert.equal(accessibleTitle.textContent, card.title);
      assert.equal(accessibleTitle.childElementCount, 0);
      const visibleTitle = document.querySelector('text[font-size="64"]');
      assert.deepEqual(
        [...visibleTitle.children].map((line) => ({
          tag: line.localName,
          text: line.textContent,
          children: line.childElementCount,
        })),
        [{ tag: "tspan", text: card.title, children: 0 }]
      );
      const kicker = document.querySelector('text[y="216"]');
      assert.equal(kicker.textContent, card.kicker.toUpperCase());
      assert.equal(kicker.childElementCount, 0);
      const footer = document.querySelector('text[y="554"]');
      assert.equal(footer.textContent, card.footer);
      assert.equal(footer.childElementCount, 0);
      assert.ok(svg.includes(`<title id="card-title">${escapedTitle}</title>`));
      assert.match(svg, /A &lt; B/);
      assert.match(svg, /&#39;safe&#39; &amp; visible/);
      assert.equal(ogCardSvg(card), svg);
      assert.throws(
        () => ogCardSvg({ ...card, title: "a ".repeat(100) }),
        /more than three lines/
      );
    });
  }

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
