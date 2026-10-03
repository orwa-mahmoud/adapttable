/**
 * Column groups and column selection through the unstyled table: a group
 * row over its columns, a group that collapses to one column, and a header
 * checkbox that selects a whole column.
 */
import type { AdaptTableFeature, ColumnInput } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/angular-material/cell-navigation";
import { collapsibleColumnGroups } from "@adapttable/angular-material/column-groups";
import { columnSelectionCheckbox } from "@adapttable/angular-material/column-selection";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Person {
  id: string;
  name: string;
  city: string;
  country: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", city: "London", country: "UK" },
  { id: "2", name: "Grace", city: "New York", country: "US" },
];

const COLUMNS: ColumnInput<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  {
    header: "Place",
    collapsedKey: "country",
    children: [
      { key: "city", header: "City", accessor: (row) => row.city },
      { key: "country", header: "Country", accessor: (row) => row.country },
    ],
  },
];

let features: AdaptTableFeature[] = [];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [dir]="direction()"
      [features]="features"
    />
  `,
})
class Host {
  readonly direction = signal<"ltr" | "rtl">("ltr");
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly features = features;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(kitSelector(name)),
];
const texts = (elements: HTMLElement[]) =>
  elements.map((element) => element.textContent.trim());
// The one element named `name`; a missing one fails the test.
const only = (name: string, index = 0): HTMLElement => {
  const element = parts(name)[index];
  if (element === undefined) throw new Error(`no ${name} at ${index}`);
  return element;
};
const firstRowCells = () => texts(parts("cell", only("row")));

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("dir");
  features = [];
});

describe("the unstyled table's column groups", () => {
  it("draws a group row over its columns", async () => {
    await mount();
    const groupRow = parts("header-group-row")[0]!;
    const [nameCell, placeCell] = [...groupRow.children] as HTMLElement[];
    expect(nameCell!.getAttribute("data-adapttable-part")).toBe("header-cell");
    expect(nameCell!.getAttribute("rowspan")).toBe("2");
    expect(placeCell!.getAttribute("data-adapttable-part")).toBe(
      "header-group-cell"
    );
    expect(placeCell!.getAttribute("colspan")).toBe("2");
    expect(placeCell!.textContent.trim()).toBe("Place");
    expect(texts(parts("header-cell", only("header-row")))).toEqual([
      "City",
      "Country",
    ]);
    expect(firstRowCells()).toEqual(["Ada", "London", "UK"]);
    // Not collapsible unless the feature asks.
    expect(parts("column-group-toggle")).toEqual([]);
  });

  it("mirrors the closed disclosure for inherited RTL while keeping open down", async () => {
    features = [collapsibleColumnGroups()];
    document.body.setAttribute("dir", "rtl");
    const { host, settle } = await mount();
    const toggle = () => only("column-group-toggle");
    const wrapper = () =>
      toggle().querySelector<HTMLElement>(".column-group-chevron")!;
    const icon = () => toggle().querySelector<SVGElement>("svg")!;
    expect(toggle().getAttribute("aria-label")).toBe(
      "Collapse column group: Place"
    );
    expect(icon().getAttribute("aria-hidden")).toBe("true");
    expect(icon().style.transform).toBe("rotate(90deg)");
    expect(getComputedStyle(wrapper()).transform).not.toBe("scaleX(-1)");

    host.direction.set("rtl");
    await settle();
    expect(getComputedStyle(wrapper()).transform).toBe("scaleX(-1)");
    expect(icon().style.transform).toBe("rotate(90deg)");
    toggle().click();
    await settle();
    expect(toggle().getAttribute("aria-label")).toBe(
      "Expand column group: Place"
    );
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(icon().style.transform).toBe("");
    expect(getComputedStyle(wrapper()).transform).toBe("scaleX(-1)");
    expect(firstRowCells()).toEqual(["Ada", "UK"]);

    host.direction.set("ltr");
    await settle();
    expect(getComputedStyle(wrapper()).transform).not.toBe("scaleX(-1)");
    toggle().click();
    await settle();
    expect(icon().style.transform).toBe("rotate(90deg)");
    expect(firstRowCells()).toEqual(["Ada", "London", "UK"]);
  });

  it("collapses a group to its summary column, and opens it again", async () => {
    features = [collapsibleColumnGroups()];
    const { settle } = await mount();
    const toggle = parts("column-group-toggle")[0]!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe(
      "Collapse column group: Place"
    );
    toggle.click();
    await settle();
    expect(firstRowCells()).toEqual(["Ada", "UK"]);
    const collapsed = parts("column-group-toggle")[0]!;
    expect(collapsed.getAttribute("aria-expanded")).toBe("false");
    collapsed.click();
    await settle();
    expect(firstRowCells()).toEqual(["Ada", "London", "UK"]);
  });
});

describe("the unstyled table's column selection", () => {
  it("selects a whole column from its header checkbox, and clears it", async () => {
    features = [cellNavigation(), columnSelectionCheckbox()];
    const { settle } = await mount();
    const boxes = parts("column-select").map((wrapper) =>
      wrapper.querySelector("input")!
    );
    expect(boxes.map((box) => box.getAttribute("aria-label"))).toEqual([
      "Select column: Name",
      "Select column: City",
      "Select column: Country",
    ]);
    boxes[1]!.click();
    await settle();
    const selected = () =>
      parts("cell")
        .filter((cell) => cell.getAttribute("aria-selected") === "true")
        .map((cell) => cell.textContent.trim());
    expect(selected()).toEqual(["London", "New York"]);
    expect(boxes[1]!.checked).toBe(true);
    boxes[1]!.click();
    await settle();
    expect(selected()).toEqual([]);
  });
});
