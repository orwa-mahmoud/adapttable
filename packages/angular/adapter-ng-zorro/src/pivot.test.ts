/**
 * The NG-ZORRO pivot panel, and the row header it draws for a pivot table.
 */
import {
  EMPTY_PIVOT_CONFIG,
  pivot,
  type PivotConfig,
  type PivotField,
} from "@adapttable/core";
import { Component, getDebugNode, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NzSelectComponent } from "ng-zorro-antd/select";
import { describe, expect, it } from "vitest";

import { pivotTableModel } from "../pivot/pivotTableModel";
import { kitSelector } from "../testUtils";
import { AdaptPivotPanel } from "./components/pivotPanel";
import { AdaptPivotRowHeader } from "./components/pivotRowHeader";

const FIELDS: PivotField[] = [
  { key: "region", label: "Region" },
  { key: "team", label: "Team" },
  { key: "amount", label: "Amount" },
];

@Component({
  imports: [AdaptPivotPanel],
  template: `<adapt-pivot-panel
    [fields]="fields"
    [config]="config()"
    [onChange]="change"
  />`,
})
class Host {
  readonly config = signal<PivotConfig>({ ...EMPTY_PIVOT_CONFIG });
  readonly fields = FIELDS;
  readonly change = (next: PivotConfig) => {
    this.config.set(next);
  };
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));

async function choose(
  select: HTMLElement,
  value: string,
  settle: () => Promise<unknown>
): Promise<void> {
  const component = getDebugNode(select)!.injector.get(NzSelectComponent);
  const option = component.listOfContainerItem.find(
    (item) => item.nzValue === value
  );
  if (!option) throw new Error(`Missing option ${value}`);
  select.querySelector<HTMLElement>("nz-select-top-control")!.click();
  await settle();
  const popup = component.cdkConnectedOverlay.overlayRef.overlayElement;
  const rendered = [
    ...popup.querySelectorAll<HTMLElement>("nz-option-item"),
  ].find((item) => item.getAttribute("title") === String(option.nzLabel));
  if (!rendered) throw new Error(`Unrendered option ${value}`);
  rendered.click();
  await settle();
}

describe("AdaptPivotPanel", () => {
  it("draws the zones and moves a field with the buttons", async () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const settle = () => fixture.whenStable();

    expect(part("pivot-panel")?.classList.contains("ant-flex")).toBe(true);
    expect(
      document.querySelectorAll("[data-adapttable-part='pivot-zone']")
    ).toHaveLength(3);

    const adds = () =>
      [...document.querySelectorAll<HTMLElement>("nz-select")].filter(
        (node) => node.getAttribute("aria-label") === "Add field"
      );

    expect(
      adds()[0]!
        .querySelector(".ant-select-selection-placeholder")
        ?.textContent?.trim()
    ).toBe("Add field");
    expect(fixture.componentInstance.config().rows).toEqual([]);

    await choose(adds()[0]!, "region", settle);
    fixture.detectChanges();
    await choose(adds()[0]!, "team", settle);
    fixture.detectChanges();
    expect(fixture.componentInstance.config().rows).toEqual(["region", "team"]);
    expect(part("pivot-field")?.textContent).toContain("Region");

    const button = (label: string) =>
      [...document.querySelectorAll("button")].find((node) =>
        node.getAttribute("aria-label")?.includes(label)
      )!;

    expect(button("Move up: Region").disabled).toBe(true);
    button("Move up: Region").click();
    button("Move down: Region").click();
    fixture.detectChanges();
    expect(fixture.componentInstance.config().rows).toEqual(["team", "region"]);

    button("Remove field: Region").click();
    fixture.detectChanges();
    expect(fixture.componentInstance.config().rows).toEqual(["team"]);

    await choose(adds().at(-1)!, "amount", settle);
    fixture.detectChanges();
    const agg = document.querySelector<HTMLElement>(
      "nz-select[aria-label='Aggregation']"
    )!;
    await choose(agg, "avg", settle);
    fixture.detectChanges();
    expect(fixture.componentInstance.config().measures).toEqual([
      { key: "amount", agg: "avg" },
    ]);

    await choose(adds()[0]!, "region", settle);
    fixture.detectChanges();
    await choose(adds()[0]!, "amount", settle);
    fixture.detectChanges();
    expect(adds()[0]!.querySelector<HTMLInputElement>("input")?.disabled).toBe(
      true
    );
    expect(
      adds().at(-1)!.querySelector<HTMLInputElement>("input")?.disabled
    ).toBe(false);
  });
});

describe("pivot row header", () => {
  it("names the part and indents a nested line", () => {
    const result = pivot(
      [
        { team: "Alpha", region: "EU", amount: 10 },
        { team: "Beta", region: "US", amount: 30 },
      ],
      {
        rows: ["region", "team"],
        columns: [],
        measures: [{ key: "amount", agg: "sum" }],
      }
    );
    const model = pivotTableModel(result, { fields: FIELDS });
    const leaf = model.rows.find((row) => row.depth === 1)!;

    expect(model.columns[0]?.cell).toBe(AdaptPivotRowHeader);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AdaptPivotRowHeader] });
    const fixture = TestBed.createComponent(AdaptPivotRowHeader);
    fixture.componentRef.setInput("row", leaf);
    fixture.componentRef.setInput("column", model.columns[0]);
    fixture.detectChanges();
    const cell = part("pivot-row-header");

    expect(cell?.getAttribute("data-pivot-kind")).toBe("leaf");
    expect(cell?.style.paddingInlineStart).toBe("16px");
  });

  it("uses the label when there is no caption, and skips a bad indent", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AdaptPivotRowHeader] });
    const fixture = TestBed.createComponent(AdaptPivotRowHeader);
    fixture.componentRef.setInput("row", {
      kind: "subtotal",
      label: "EU",
      depth: 0,
    });
    fixture.componentRef.setInput("column", { meta: { pivotIndent: "wide" } });
    fixture.detectChanges();

    expect(part("pivot-row-header")?.textContent).toBe("EU");
    expect(part("pivot-row-header")?.style.paddingInlineStart).toBe("");
  });
});
