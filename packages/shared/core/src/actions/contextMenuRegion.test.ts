/**
 * Reading a context-menu target back out of the DOM.
 *
 * The parts are public contract with the same names in every kit, which is
 * what makes this possible at all. What it has to get right is precedence —
 * a cell is inside a row, and a header cell is not a row at all — and every
 * way the answer can legitimately be "there is no menu here".
 */
import { describe, expect, it } from "vitest";

import { resolveContextTarget } from "./contextMenuRegion";

interface Row {
  id: string;
}
const ROWS: Record<string, Row> = { "1": { id: "1" } };
const rowFor = (id: string) => ROWS[id];

function build(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

const TABLE = `
  <table>
    <thead>
      <tr>
        <th data-adapttable-part="header-cell" data-column-key="name">
          <span id="in-header">Name</span>
        </th>
        <th data-adapttable-part="header-cell"><span id="no-key">?</span></th>
      </tr>
    </thead>
    <tbody>
      <tr data-adapttable-part="row" data-row-id="1">
        <td data-adapttable-part="cell" data-column-key="name">
          <span id="in-cell">Ada</span>
        </td>
        <td data-adapttable-part="cell"><span id="cell-no-key">?</span></td>
        <td data-adapttable-part="selection-cell">
          <input id="in-row-gap" type="checkbox" />
        </td>
      </tr>
      <tr data-adapttable-part="row"><td id="row-no-id">x</td></tr>
      <tr data-adapttable-part="row" data-row-id="gone"><td id="row-gone">x</td></tr>
    </tbody>
  </table>
  <p id="outside">elsewhere</p>
`;

const at = (id: string) => document.getElementById(id)!;

describe("resolveContextTarget", () => {
  it("finds the header a click landed in", () => {
    build(TABLE);
    const found = resolveContextTarget<Row>(at("in-header"), rowFor);

    expect(found?.target).toEqual({ kind: "header", columnKey: "name" });
    expect(found?.element.tagName).toBe("TH");
  });

  it("finds the cell, not the row, when the click was in one", () => {
    build(TABLE);
    const found = resolveContextTarget<Row>(at("in-cell"), rowFor);

    expect(found?.target).toEqual({
      kind: "cell",
      row: ROWS["1"],
      rowId: "1",
      columnKey: "name",
    });
    expect(found?.element.tagName).toBe("TD");
  });

  it("falls back to the row for a click on the row but not in a cell", () => {
    build(TABLE);
    // The selection checkbox sits in its own part, not in a data cell —
    // right-clicking it is a menu for the row, not for a column.
    const found = resolveContextTarget<Row>(at("in-row-gap"), rowFor);

    expect(found?.target).toEqual({ kind: "row", row: ROWS["1"], rowId: "1" });
    expect(found?.element.tagName).toBe("TR");
  });

  it("treats a cell with no column as its row", () => {
    build(TABLE);
    const found = resolveContextTarget<Row>(at("cell-no-key"), rowFor);

    expect(found?.target.kind).toBe("row");
  });

  // Everything that resolves to nothing at all. Each row keeps the name of
  // the case it stands for, so a regression still says which one answered.
  it.each([
    { name: "has no answer for a header with no column", id: "no-key" },
    { name: "has no answer for a row with no id", id: "row-no-id" },
    { name: "has no answer for a row that is no longer there", id: "row-gone" },
    { name: "has no answer outside the table", id: "outside" },
  ])("$name", ({ id }) => {
    build(TABLE);

    expect(resolveContextTarget<Row>(at(id), rowFor)).toBeNull();
  });

  it("reads a pinned row, which names its side instead of row", () => {
    build(`
      <table><tbody>
        <tr data-adapttable-part="pinned-top" data-row-id="1">
          <td data-adapttable-part="cell" data-column-key="name">
            <span id="pinned-cell">Ada</span>
          </td>
        </tr>
        <tr data-adapttable-part="pinned-bottom" data-row-id="1">
          <td id="pinned-gap">x</td>
        </tr>
      </tbody></table>
    `);

    expect(
      resolveContextTarget<Row>(at("pinned-cell"), rowFor)?.target
    ).toEqual({ kind: "cell", row: ROWS["1"], rowId: "1", columnKey: "name" });
    expect(resolveContextTarget<Row>(at("pinned-gap"), rowFor)?.target).toEqual(
      {
        kind: "row",
        row: ROWS["1"],
        rowId: "1",
      }
    );
  });
});
