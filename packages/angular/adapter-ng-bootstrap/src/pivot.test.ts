/**
 * The native pivot panel, and the row header it draws for a pivot table.
 */
import {
  EMPTY_PIVOT_CONFIG,
  type PivotConfig,
  type PivotField,
} from "@adapttable/angular/pivot";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { pivotTests } from "../../angular/test/kit/suites/pivot";
import { kit } from "../testing/kit";
import { ngBootstrapPart } from "../testUtils";
import { AdaptPivotPanel } from "./components/pivotPanel";

for (const test of pivotTests(kit)) it(test.name, test.run);

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
  document.querySelector<HTMLElement>(ngBootstrapPart(name));

function choose(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event("change"));
}

describe("AdaptPivotPanel", () => {
  it("draws the zones and moves a field with the buttons", () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(part("pivot-panel")).toBeTruthy();
    expect(
      document.querySelectorAll("[data-adapttable-part='pivot-zone']")
    ).toHaveLength(3);

    const adds = () =>
      [...document.querySelectorAll("select")].filter(
        (node) => node.getAttribute("aria-label") === "Add field"
      );

    choose(adds()[0]!, "");
    fixture.detectChanges();
    expect(fixture.componentInstance.config().rows).toEqual([]);

    choose(adds()[0]!, "region");
    fixture.detectChanges();
    choose(adds()[0]!, "team");
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

    choose(adds().at(-1)!, "amount");
    fixture.detectChanges();
    const agg = document.querySelector<HTMLSelectElement>(
      "[aria-label='Aggregation']"
    )!;
    choose(agg, "avg");
    fixture.detectChanges();
    expect(fixture.componentInstance.config().measures).toEqual([
      { key: "amount", agg: "avg" },
    ]);

    choose(adds()[0]!, "region");
    fixture.detectChanges();
    choose(adds()[0]!, "amount");
    fixture.detectChanges();
    expect(adds()[0]!.disabled).toBe(true);
    expect(adds().at(-1)!.disabled).toBe(false);
  });
});
