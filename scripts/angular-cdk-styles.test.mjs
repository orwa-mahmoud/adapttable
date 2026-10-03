import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JSDOM } from "jsdom";

const root = new URL(
  "../packages/angular/adapter-angular-cdk/",
  import.meta.url
);
const css = await readFile(new URL("styles.css", root), "utf8");
const template = await readFile(new URL("src/dataTable.html", root), "utf8");

function fixture() {
  const dom = new JSDOM(`
    <style>${css}</style>
    <div data-adapttable-kit="angular-cdk" data-adapttable-part="root">
      <div data-adapttable-part="scroll-box"></div>
      <ul data-adapttable-part="cards">
        <li data-adapttable-part="card">
          <div data-adapttable-part="card-row">
            <span data-adapttable-part="card-label">Name</span>
            <span data-adapttable-part="card-value">UnbrokenValue</span>
          </div>
        </li>
        <li data-adapttable-part="summary-card"></li>
      </ul>
    </div>
    <div id="outside" data-adapttable-part="card"></div>
  `);
  const style = (part) => {
    const element = dom.window.document.querySelector(
      `[data-adapttable-part="${part}"]`
    );
    assert.ok(element, part);
    return dom.window.getComputedStyle(element);
  };
  return { dom, style };
}

test("CDK table containment is attached to the actual kit root", () => {
  assert.match(
    template,
    /data-adapttable-part="root"\s+data-adapttable-kit="angular-cdk"/u
  );
  const { dom, style } = fixture();
  try {
    assert.equal(style("root").display, "block");
    assert.equal(Number.parseFloat(style("root").minInlineSize), 0);
    assert.equal(style("scroll-box").overflow, "auto");
    assert.equal(style("scroll-box").maxInlineSize, "100%");
  } finally {
    dom.window.close();
  }
});

test("CDK cards have their own nonzero box and shrinkable wrapping content", () => {
  const { dom, style } = fixture();
  try {
    assert.equal(style("cards").display, "grid");
    assert.equal(style("cards").gridTemplateColumns, "minmax(0, 1fr)");
    assert.equal(style("cards").gridAutoRows, "max-content");
    assert.equal(style("cards").maxInlineSize, "100%");
    for (const part of ["card", "summary-card"]) {
      const card = style(part);
      assert.equal(card.boxSizing, "border-box");
      assert.equal(Number.parseFloat(card.minInlineSize), 0);
      // Empty cards still have a measurable box before field views render.
      assert.ok(Number.parseFloat(card.paddingTop) > 0);
      assert.ok(Number.parseFloat(card.paddingBottom) > 0);
    }
    assert.equal(style("card-row").display, "flex");
    for (const part of ["card-label", "card-value"]) {
      assert.equal(Number.parseFloat(style(part).minInlineSize), 0);
      assert.equal(style(part).overflowWrap, "anywhere");
      assert.equal(style(part).flexShrink, "1");
    }
    const outside = dom.window.document.querySelector("#outside");
    assert.ok(outside);
    assert.notEqual(
      dom.window.getComputedStyle(outside).paddingTop,
      style("card").paddingTop
    );
  } finally {
    dom.window.close();
  }
});
