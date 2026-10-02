/**
 * Cell navigation through the NG-ZORRO table — the host hears the selected
 * rectangle as the reader extends it with the keyboard.
 */
import type { ColumnDef } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface City {
  id: string;
  name: string;
  country: string;
}

const CITIES: City[] = [
  { id: "1", name: "Amman", country: "Jordan" },
  { id: "2", name: "Dubai", country: "UAE" },
  { id: "3", name: "Irbid", country: "Jordan" },
];

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "country", header: "Country", accessor: (row) => row.country },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [features]="features()"
    />
  `,
})
class Host {
  readonly features = input.required<ReturnType<typeof cellNavigation>[]>();
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

async function mount(onRangeChange = vi.fn(), navigation = true) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput(
    "features",
    navigation ? [cellNavigation({ onRangeChange })] : []
  );
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return { onRangeChange, settle: () => fixture.whenStable() };
}

function cells(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-adapttable-part="cell"]'),
  ];
}

function press(key: string, shiftKey = false): void {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent("keydown", { key, shiftKey, bubbles: true })
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("cellNavigation() (NG-ZORRO Angular)", () => {
  it("turns the table into one tab stop whose cells the arrows move between", async () => {
    const { settle } = await mount();
    const table = document.querySelector('[data-adapttable-part="table"]')!;
    const composites = [
      ...document.querySelectorAll('[data-adapttable-part="grid"]'),
    ];
    expect(composites.map((element) => element.tagName)).toEqual(["NZ-TABLE"]);
    const composite = composites[0]!;
    expect(composite.querySelectorAll("table")).toHaveLength(1);
    expect(composite.querySelector("table")).toBe(table);
    expect(composite.getAttribute("role")).toBeNull();
    expect(composite.hasAttribute("tabindex")).toBe(false);
    expect(document.querySelectorAll('[role="grid"]')).toHaveLength(1);
    expect(table.getAttribute("role")).toBe("grid");
    expect(
      table.contains(document.querySelector('[data-adapttable-part="thead"]'))
    ).toBe(true);
    const all = cells();
    expect(all.map((cell) => cell.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
    all[0]!.focus();
    press("ArrowRight");
    await settle();
    expect(document.activeElement).toBe(cells()[1]);
    press("ArrowDown");
    await settle();
    expect(document.activeElement).toBe(cells()[3]);
  });

  it("keeps the native table without a composite grid hook when navigation is absent", async () => {
    await mount(vi.fn(), false);
    const composite = document.querySelector("nz-table")!;
    const table = composite.querySelector("table")!;
    expect(composite.hasAttribute("data-adapttable-part")).toBe(false);
    expect(table.getAttribute("data-adapttable-part")).toBe("table");
    expect(table.getAttribute("role")).not.toBe("grid");
    expect(document.querySelector('[role="grid"]')).toBeNull();
  });
});

describe("cellNavigation({ onRangeChange }) (NG-ZORRO Angular)", () => {
  it("tells the host each rectangle the reader selects, and null when it collapses", async () => {
    const { onRangeChange, settle } = await mount();
    expect(onRangeChange).toHaveBeenLastCalledWith(null);
    onRangeChange.mockClear();

    cells()[0]!.focus();
    await settle();
    expect(onRangeChange).not.toHaveBeenCalled();

    press("ArrowDown", true);
    await settle();
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    });

    press("ArrowRight", true);
    await settle();
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 1 },
    });

    press("ArrowUp");
    await settle();
    expect(onRangeChange).toHaveBeenLastCalledWith(null);
    expect(onRangeChange).toHaveBeenCalledTimes(3);
  });
});
