/**
 * The pivot-to-table mapping.
 *
 * The columns have to carry the engine's header groups, the grand total has
 * to land in the footer exactly once, and the row header has to name its part.
 */
import type { CellContext } from "@adapttable/angular";
import {
  pivot,
  type PivotConfig,
  type PivotField,
  type PivotRow,
} from "@adapttable/core";
import {
  Component,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { PIVOT_ROW_COLUMN_KEY, pivotTableModel } from "./pivotTableModel";
import { AdaptPivotRowHeader } from "./rowHeader";

@Component({
  template: `<ng-template #fold let-row let-value="value"
    ><button type="button" (click)="folded.set(row.key)">
      {{ value }}
    </button></ng-template
  >`,
})
class FoldTemplateHost {
  readonly fold =
    viewChild.required<TemplateRef<CellContext<PivotRow>>>("fold");
  readonly folded = signal("");
}

@Component({
  template: `<button
    type="button"
    (click)="folded.set(row().key)"
    [attr.aria-expanded]="folded() !== row().key"
  >
    {{ row().label }}
  </button>`,
})
class FoldComponent {
  readonly row = input.required<PivotRow>();
  readonly folded = signal("");
}

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

const modelFor = (config: PivotConfig, collapsed?: ReadonlySet<string>) =>
  pivotTableModel(pivot(SALES, config, { collapsed }), { fields: FIELDS });

/** The row-header element for one line. */
function headerCell(model: ReturnType<typeof pivotTableModel>, row: PivotRow) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [AdaptPivotRowHeader] });
  const fixture = TestBed.createComponent(AdaptPivotRowHeader);
  fixture.componentRef.setInput("row", row);
  fixture.componentRef.setInput("column", model.columns[0]);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector("span") as HTMLElement;
}

describe("pivotTableModel", () => {
  it("puts the row header first, then one column per leaf", () => {
    const result = pivot(SALES, base);
    const model = pivotTableModel(result);

    expect(model.columns).toHaveLength(result.columnLeaves.length + 1);
    expect(model.columns[0]?.key).toBe(PIVOT_ROW_COLUMN_KEY);
    expect(model.columns[0]?.cell).toBe(AdaptPivotRowHeader);
    const alpha = model.rows.find((row) => row.label === "Alpha")!;
    expect(model.columns[1]?.accessor?.(alpha)).toBe(alpha.cells[0]);
    expect(model.columns.at(-1)?.accessor?.(alpha)).toBe(alpha.cells.at(-1));
    expect(model.columns[1]?.meta?.pivotLeaf).toBe(result.columnLeaves[0]);
  });

  it("turns the column tree into header groups", () => {
    const model = pivotTableModel(
      pivot(SALES, { ...base, columns: ["region", "quarter"] }),
      { fields: FIELDS }
    );
    const grouped = model.columns.filter((column) => column.group);

    expect(grouped[0]?.group).toEqual(["EU", "Q1"]);
  });

  it("puts the grand total in the footer and not the body", () => {
    const model = modelFor(base);
    const footer = model.summaryRow!(model.rows);
    const total = pivot(SALES, base).rows.at(-1)!;

    expect(model.rows.some((row) => row.kind === "grandTotal")).toBe(false);
    expect(footer[PIVOT_ROW_COLUMN_KEY]).toBe("Grand total");
    expect(footer["pivot-0"]).toBe(total.cells[0]);
  });

  it("captions the footer from the labels, and the corner from the host", () => {
    const model = pivotTableModel(pivot(SALES, base), {
      labels: { pivotGrandTotal: "Eindtotaal" },
      rowHeader: "Team",
    });

    expect(model.summaryRow!([])[PIVOT_ROW_COLUMN_KEY]).toBe("Eindtotaal");
    expect(model.columns[0]?.header).toBe("Team");
  });

  it("has no footer when the pivot has no grand total", () => {
    const model = modelFor({ ...base, grandTotals: false });

    expect(model.summaryRow).toBeUndefined();
    expect(model.rows.some((row) => row.kind === "grandTotal")).toBe(false);
  });

  it("keeps a folded group's line and the same grand total", () => {
    const nested: PivotConfig = { ...base, rows: ["region", "team"] };
    const open = modelFor(nested);
    const folded = modelFor(nested, new Set(["EU"]));

    expect(folded.rows.some((row) => row.label === "EU")).toBe(true);
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
    const cell = headerCell(model, leaf);

    expect(cell.getAttribute("data-adapttable-part")).toBe("pivot-row-header");
    expect(cell.getAttribute("data-pivot-kind")).toBe("leaf");
    expect(cell.style.paddingInlineStart).toBe("16px");
  });

  it("leaves the outermost line unindented, and honours indent 0", () => {
    const model = modelFor({ ...base, rows: ["region", "team"] });
    const outer = model.rows.find((row) => row.depth === 0)!;
    const inner = model.rows.find((row) => row.depth === 1)!;
    const flat = pivotTableModel(
      pivot(SALES, { ...base, rows: ["region", "team"] }),
      { fields: FIELDS, indent: 0 }
    );

    expect(headerCell(model, outer).style.paddingInlineStart).toBe("");
    expect(headerCell(flat, inner).style.paddingInlineStart).toBe("");
  });

  it("lets the host caption the row header, and not the footer", () => {
    const model = pivotTableModel(pivot(SALES, base), {
      renderRowHeader: (row) => `Fold ${row.label}`,
    });
    const alpha = model.rows[0]!;

    expect(headerCell(model, alpha).textContent).toBe("Fold Alpha");
    expect(model.columns[0]?.formatValue?.(alpha)).toBe("Alpha");
    expect(model.summaryRow!([])[PIVOT_ROW_COLUMN_KEY]).toBe("Grand total");
  });

  it("renders a host template fold control with row context and keeps focus after folding", () => {
    TestBed.resetTestingModule();
    const host = TestBed.createComponent(FoldTemplateHost);
    host.detectChanges();
    const model = pivotTableModel(
      pivot(SALES, { ...base, rows: ["region", "team"] }),
      {
        renderRowHeader: () => host.componentInstance.fold(),
        labels: { pivotGrandTotal: "Eindtotaal" },
      }
    );
    const row = model.rows.find((line) => line.depth === 1)!;
    const fixture = TestBed.createComponent(AdaptPivotRowHeader);
    fixture.componentRef.setInput("row", row);
    fixture.componentRef.setInput("column", model.columns[0]);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
    try {
      const span = fixture.nativeElement.querySelector("span") as HTMLElement;
      const button = span.querySelector("button")!;
      expect(button?.textContent?.trim()).toBe(row.label);
      button.focus();
      button.click();
      fixture.detectChanges();
      expect(host.componentInstance.folded()).toBe(row.key);
      expect(document.activeElement).toBe(button);
      expect(span.getAttribute("data-adapttable-part")).toBe(
        "pivot-row-header"
      );
      expect(span.style.paddingInlineStart).toBe("16px");
      expect(model.columns[0]?.formatValue?.(row)).toBe(row.label);
      expect(model.summaryRow!([])[PIVOT_ROW_COLUMN_KEY]).toBe("Eindtotaal");
    } finally {
      fixture.destroy();
      host.destroy();
    }
  });

  it("renders a component fold control with declared row inputs and updates its state", () => {
    const model = pivotTableModel(pivot(SALES, base), {
      renderRowHeader: () => FoldComponent,
    });
    const row = model.rows[0]!;
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(AdaptPivotRowHeader);
    fixture.componentRef.setInput("row", row);
    fixture.componentRef.setInput("column", model.columns[0]);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
    try {
      const button = fixture.nativeElement.querySelector(
        "button"
      ) as HTMLButtonElement;
      expect(button?.textContent?.trim()).toBe(row.label);
      expect(button.getAttribute("aria-expanded")).toBe("true");
      button.focus();
      button.click();
      fixture.detectChanges();
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(button);
    } finally {
      fixture.destroy();
    }
  });

  it("reads every line as text, and names the corner", () => {
    const model = modelFor(base);
    const total = pivot(SALES, base).rows.at(-1)!;

    expect(model.columns[0]?.accessor?.(model.rows[0]!)).toBe("Alpha");
    expect(model.columns[0]?.formatValue?.(model.rows[0]!)).toBe("Alpha");
    expect(model.columns[0]?.formatValue?.(total)).toBe("Grand total");
    expect(model.columns[0]?.header).toBe("Rows");
  });
});
