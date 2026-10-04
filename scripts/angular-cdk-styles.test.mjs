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

function fixture(density = "comfortable", dir = "ltr") {
  const content = `
    <div data-adapttable-part="toolbar">
      <div data-adapttable-part="search-field">
        <span data-adapttable-part="search-icon">Search</span>
        <input data-adapttable-cdk-control data-adapttable-part="search" />
      </div>
      <button data-adapttable-cdk-control>Filters</button>
      <button data-adapttable-cdk-control>Saved views</button>
      <button data-adapttable-cdk-control>Columns</button>
    </div>
    <div data-adapttable-part="scroll-box">
      <table data-adapttable-part="table">
        <thead><tr>
          <th data-adapttable-part="selection-header">Select</th>
          <th data-adapttable-part="header-cell"><button data-adapttable-cdk-control data-adapttable-part="sort-button">Name</button></th>
          <th data-adapttable-part="actions-header">Actions</th>
        </tr></thead>
        <tbody>
          <tr data-adapttable-part="row">
            <td data-adapttable-part="selection-cell">Selected</td>
            <td data-adapttable-part="cell">Ada</td>
            <td data-adapttable-part="actions-cell">Edit</td>
            <td data-adapttable-part="column-spacer-end" style="width: 100px; min-width: 100px; padding: 0; border: 0"></td>
          </tr>
          <tr data-adapttable-part="virtual-spacer"><td style="height: 40px; padding: 0"></td></tr>
        </tbody>
      </table>
    </div>
    <div data-adapttable-part="footer">
      <label>Rows per page <select data-adapttable-cdk-control data-adapttable-part="rows-per-page"><option>25</option></select></label>
      <span>Showing 1–25 of 100</span>
      <div data-adapttable-part="pager"><span>Page 1 of 4</span><button data-adapttable-cdk-control>Previous</button><button data-adapttable-cdk-control>Next</button></div>
    </div>
    <ul data-adapttable-part="cards">
      <li data-adapttable-part="card">
        <div data-adapttable-part="card-row">
          <span data-adapttable-part="card-label">Name</span>
          <span data-adapttable-part="card-value">UnbrokenValue</span>
        </div>
      </li>
      <li data-adapttable-part="summary-card"></li>
    </ul>
  `;
  const dom = new JSDOM(`
    <style>html { font-size: 16px; } ${css}</style>
    <div id="inside" data-adapttable-kit="angular-cdk" data-adapttable-part="root" data-density="${density}" dir="${dir}">${content}</div>
    <div id="outside" data-adapttable-part="root" data-density="${density}" dir="${dir}">${content}</div>
  `);
  const style = (part, scope = "inside") => {
    const element = dom.window.document.querySelector(
      part === "root"
        ? `#${scope}`
        : `#${scope} [data-adapttable-part="${part}"]`
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
    assert.equal(style("table").borderCollapse, "separate");
    assert.equal(Number.parseFloat(style("table").borderSpacing), 0);
    assert.equal(style("table").inlineSize, "100%");
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
    assert.notEqual(
      style("card", "outside").paddingTop,
      style("card").paddingTop
    );
  } finally {
    dom.window.close();
  }
});

for (const density of ["comfortable", "compact"]) {
  for (const dir of ["ltr", "rtl"]) {
    test(`CDK ${density} ${dir} layout wraps controls and separates rows within its root`, () => {
      const { dom, style } = fixture(density, dir);
      try {
        for (const part of ["toolbar", "footer", "pager"]) {
          assert.equal(style(part).display, "flex", part);
          assert.equal(style(part).flexWrap, "wrap", part);
          assert.equal(style(part).alignItems, "center", part);
          assert.equal(Number.parseFloat(style(part).minInlineSize), 0, part);
          assert.ok(Number.parseFloat(style(part).gap) > 0, part);
          assert.notEqual(style(part, "outside").display, "flex", part);
        }
        assert.equal(style("search-field").display, "flex");
        assert.equal(style("search-field").flexGrow, "1");
        assert.equal(style("search-field").flexShrink, "1");
        assert.equal(Number.parseFloat(style("search-field").minInlineSize), 0);
        assert.equal(style("search").inlineSize, "100%");
        assert.equal(Number.parseFloat(style("search").minInlineSize), 0);
        // Reading-order alignment must not hard-code a physical side.
        assert.equal(style("pager").marginInlineStart, "auto");
        assert.notEqual(style("pager").marginLeft, "auto");
        assert.notEqual(style("pager").marginRight, "auto");
        assert.notEqual(style("pager", "outside").marginInlineStart, "auto");
        assert.equal(style("header-cell").textAlign, "start");
        const padding = density === "compact" ? "6px" : "10px";
        for (const part of [
          "header-cell",
          "selection-header",
          "actions-header",
          "cell",
          "selection-cell",
          "actions-cell",
        ]) {
          assert.equal(style(part).paddingTop, padding, part);
          assert.equal(style(part).paddingBottom, padding, part);
          assert.equal(style(part).paddingLeft, "12px", part);
          assert.equal(style(part).paddingRight, "12px", part);
          // jsdom preserves logical border shorthands without expanding them.
          assert.match(style(part).borderBlockEnd, /^1px\s+solid\s/u, part);
          assert.notEqual(style(part, "outside").paddingTop, padding, part);
          assert.doesNotMatch(
            style(part, "outside").borderBlockEnd,
            /^1px\s+solid\s/u,
            part
          );
        }
        assert.equal(style("sort-button").paddingTop, "0px");
        assert.equal(style("sort-button").borderTopWidth, "0px");
        assert.equal(style("column-spacer-end").paddingTop, "0px");
        assert.equal(style("column-spacer-end").width, "100px");
        assert.doesNotMatch(
          style("column-spacer-end").borderBlockEnd,
          /^1px\s+solid\s/u
        );
        const virtualCell = dom.window.document.querySelector(
          '#inside [data-adapttable-part="virtual-spacer"] > td'
        );
        assert.ok(virtualCell);
        const virtualStyle = dom.window.getComputedStyle(virtualCell);
        assert.equal(virtualStyle.paddingTop, "0px");
        assert.equal(virtualStyle.height, "40px");
        assert.doesNotMatch(virtualStyle.borderBlockEnd, /^1px\s+solid\s/u);
        assert.equal(style("table").borderCollapse, "separate");
        assert.equal(Number.parseFloat(style("table").borderSpacing), 0);
      } finally {
        dom.window.close();
      }
    });
  }
}
