/**
 * The pivot-to-table mapping.
 *
 * The point of this module is that it reuses shipped mechanisms rather than
 * inventing parallel ones, so the tests worth having are the ones that check
 * the reuse actually lines up: the columns it produces have to feed
 * `headerGroupRows` and come back out as the tree the engine computed, spans
 * included, and the grand total has to land in the footer exactly once — not
 * both there and in the body, which is how a pivot ends up showing its total
 * twice.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { headerGroupRows } from "../columns/headerGroups";
import type { PivotField } from "./pivotConfigModel";
import { pivot, type PivotConfig, type PivotRow } from "./pivotModel";
import { PIVOT_ROW_COLUMN_KEY, pivotTableModel } from "./pivotTableModel";

interface Sale {
  team: string;
  region: string;
  quarter: string;
  amount: number;
}

const SALES: Sale[] = [
  { team: "Alpha", region: "EU", quarter: "Q1", amount: 10 },
  { team: "Alpha", region: "EU", quarter: "Q2", amount: 20 },
  { team: "Beta", region: "US", quarter: "Q1", amount: 30 },
  { team: "Beta", region: "US", quarter: "Q2", amount: 40 },
];

const FIELDS: PivotField[] = [
  { key: "team", label: "Team" },
  { key: "region", label: "Region" },
  { key: "quarter", label: "Quarter" },
  { key: "amount", label: "Amount" },
];

const base: PivotConfig = {
  rows: ["team"],
  columns: ["quarter"],
  measures: [{ key: "amount", agg: "sum" }],
};

/** The model for one configuration, with the fields captioned. */
const modelFor = (config: PivotConfig, collapsed?: ReadonlySet<string>) =>
  pivotTableModel(pivot(SALES, config, { collapsed }), { fields: FIELDS });

/** What a row-header cell renders, as an element. */
function renderRowHeader(
  model: ReturnType<typeof pivotTableModel>,
  row: PivotRow
): HTMLElement {
  const { container } = render(<>{model.columns[0]?.accessor?.(row)}</>);
  return container.querySelector<HTMLElement>(
    '[data-adapttable-part="pivot-row-header"]'
  )!;
}

describe("pivotTableModel", () => {
  it("puts the row header first, then one column per leaf", () => {
    const result = pivot(SALES, base);
    const model = pivotTableModel(result);

    expect(model.columns).toHaveLength(result.columnLeaves.length + 1);
    expect(model.columns[0]?.key).toBe(PIVOT_ROW_COLUMN_KEY);
    // Every leaf is addressable, and the cell it renders is the leaf's own.
    const alpha = model.rows.find((row) => row.label === "Alpha")!;
    expect(model.columns[1]?.accessor?.(alpha)).toBe(alpha.cells[0]);
    expect(model.columns.at(-1)?.accessor?.(alpha)).toBe(alpha.cells.at(-1));
  });

  it("hands the leaf to the column that renders it", () => {
    const result = pivot(SALES, base);
    const model = pivotTableModel(result);

    expect(model.columns[1]?.meta?.pivotLeaf).toBe(result.columnLeaves[0]);
  });

  it("turns the column tree into header groups with the engine's spans", () => {
    const result = pivot(SALES, {
      ...base,
      columns: ["region", "quarter"],
      grandTotals: false,
    });
    const model = pivotTableModel(result);

    const rows = headerGroupRows(model.columns)!;
    // One header row per level of the tree.
    expect(rows).toHaveLength(2);
    // The corner: a gap over the row-header column, spanning it and no more.
    expect(rows[0]?.[0]).toMatchObject({ label: null, span: 1 });
    // The outer level, label for label and span for span.
    expect(rows[0]?.slice(1).map((cell) => [cell.label, cell.span])).toEqual(
      result.columnTree.map((node) => [node.label, node.span])
    );
    // The inner level, under the first outer node.
    expect(rows[1]?.slice(1, 3).map((cell) => cell.label)).toEqual(
      result.columnTree[0]?.children.map((child) => child.label)
    );
  });

  it("labels the grand-total column and sits it outside the tree", () => {
    const result = pivot(SALES, {
      ...base,
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "count" },
      ],
    });
    const model = pivotTableModel(result, { fields: FIELDS });

    const cells = headerGroupRows(model.columns)![0]!;
    const total = cells.at(-1)!;
    expect(total.label).toBe("Total");
    // Both measures under it: the total column is a column pair, like every
    // other path in the tree.
    expect(total.span).toBe(2);
    expect(model.columns.at(-2)?.header).toBe("sum Amount");
    expect(model.columns.at(-1)?.header).toBe("count Amount");
  });

  it("renames the grand-total column from the labels", () => {
    const model = pivotTableModel(pivot(SALES, base), {
      labels: { pivotTotal: "Totaal" },
    });

    expect(headerGroupRows(model.columns)!.at(-1)!.at(-1)?.label).toBe(
      "Totaal"
    );
  });

  it("makes the grand total the footer rather than a line", () => {
    const model = modelFor(base);

    expect(model.rows.some((row) => row.kind === "grandTotal")).toBe(false);
    const footer = model.summaryRow!(model.rows);
    expect(footer[PIVOT_ROW_COLUMN_KEY]).toBe("Grand total");
    // One footer cell per leaf column, in the same order the body uses.
    const total = pivot(SALES, base).rows.at(-1)!;
    expect(footer["pivot-0"]).toBe(total.cells[0]);
    expect(footer["pivot-2"]).toBe(total.cells[2]);
  });

  it("captions the footer from the labels", () => {
    const model = pivotTableModel(pivot(SALES, base), {
      labels: { pivotGrandTotal: "Eindtotaal" },
    });

    expect(model.summaryRow!([])[PIVOT_ROW_COLUMN_KEY]).toBe("Eindtotaal");
  });

  it("has no footer when the pivot has no grand total", () => {
    const model = modelFor({ ...base, grandTotals: false });

    expect(model.summaryRow).toBeUndefined();
    expect(model.rows.some((row) => row.kind === "grandTotal")).toBe(false);
  });

  it("keeps the folded group's own line and the same grand total", () => {
    const nested: PivotConfig = { ...base, rows: ["region", "team"] };
    const open = modelFor(nested);
    const folded = modelFor(nested, new Set(["EU"]));

    expect(folded.rows.length).toBeLessThan(open.rows.length);
    // The subtotal line survives with its numbers; only the detail goes.
    const subtotal = folded.rows.find((row) => row.key === "EU")!;
    expect(subtotal.kind).toBe("subtotal");
    expect(folded.columns[1]?.accessor?.(subtotal)).toBe(subtotal.cells[0]);
    // Folding changes what is shown, never what is computed.
    expect(folded.summaryRow!([])).toEqual(open.summaryRow!([]));
  });

  it("identifies a row by the engine's own line key", () => {
    const model = modelFor(base);

    expect(model.rows.map(model.rowKey)).toEqual(
      model.rows.map((row) => row.key)
    );
  });

  it("names the row-header part and indents by depth", () => {
    const model = modelFor({ ...base, rows: ["region", "team"] });
    const leaf = model.rows.find((row) => row.depth === 1)!;

    const cell = renderRowHeader(model, leaf);
    expect(cell).toHaveAttribute("data-pivot-kind", "leaf");
    expect(cell).toHaveStyle({ paddingInlineStart: "16px" });
  });

  it("leaves the outermost line unindented, and honours indent 0", () => {
    const model = modelFor({ ...base, rows: ["region", "team"] });
    const outer = model.rows.find((row) => row.depth === 0)!;
    const inner = model.rows.find((row) => row.depth === 1)!;

    expect(renderRowHeader(model, outer).getAttribute("style")).toBeNull();
    const flat = pivotTableModel(
      pivot(SALES, { ...base, rows: ["region", "team"] }),
      { indent: 0 }
    );
    expect(renderRowHeader(flat, inner).getAttribute("style")).toBeNull();
  });

  it("lets the host render the row header — a fold control belongs there", () => {
    const onFold = vi.fn();
    const model = pivotTableModel(pivot(SALES, base), {
      renderRowHeader: (row) => (
        <button type="button" onClick={() => onFold(row.key)}>
          {row.label}
        </button>
      ),
    });
    const alpha = model.rows[0]!;

    render(<>{model.columns[0]?.accessor?.(alpha)}</>);
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    expect(onFold).toHaveBeenCalledWith(alpha.key);
    // …and it does not reach the footer: a fold control on the grand total
    // would have nothing to fold, and a renderer that assumed a label would
    // leave that cell blank — the grand-total line's own label is empty.
    expect(model.summaryRow!([])[PIVOT_ROW_COLUMN_KEY]).toBe("Grand total");
  });

  it("reads every line as text, for the places an element cannot go", () => {
    const model = modelFor(base);
    const total = pivot(SALES, base).rows.at(-1)!;

    expect(model.columns[0]?.formatValue?.(model.rows[0]!)).toBe("Alpha");
    expect(model.columns[0]?.formatValue?.(total)).toBe("Grand total");
  });

  it("names the corner cell, and takes a caption for it", () => {
    expect(pivotTableModel(pivot(SALES, base)).columns[0]?.header).toBe("Rows");
    expect(
      pivotTableModel(pivot(SALES, base), { rowHeader: "Team / Region" })
        .columns[0]?.header
    ).toBe("Team / Region");
  });

  it("captions a measure from its key when no fields are given", () => {
    const model = pivotTableModel(pivot(SALES, base));

    expect(model.columns[1]?.header).toBe("sum amount");
  });

  it("groups nothing when nothing splits the columns", () => {
    const model = modelFor({ ...base, columns: [] });

    // No column dimensions: one column per measure, no tree, and no
    // grand-total column — it would repeat the only column there is.
    expect(model.columns).toHaveLength(2);
    expect(headerGroupRows(model.columns)).toBeNull();
  });

  it("aligns the numbers to the end and leaves the header alone", () => {
    const model = modelFor(base);

    expect(model.columns[0]?.align).toBeUndefined();
    expect(model.columns[1]?.align).toBe("end");
  });
});
