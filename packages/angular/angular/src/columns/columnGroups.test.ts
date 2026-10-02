/**
 * Column groups: flattening, the grouped header plan, collapsing a group to
 * its summary column, and the toggle's wording.
 */
import { createMemoryAdapter, resolveLabels } from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type ColumnInput, flattenColumns } from "../columnDef";
import { injectDataTable } from "../dataTable";
import { collapsibleColumnGroups } from "../features/factories";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import {
  AdaptColumnGroupToggleChrome,
  type ColumnGroupToggleButtonProps,
} from "./columnGroupToggle";

interface Person {
  id: string;
  name: string;
  city: string;
  country: string;
}

const COLUMNS: ColumnInput<Person>[] = [
  { key: "name", header: "Name" },
  {
    header: "Place",
    collapsedKey: "country",
    children: [
      { key: "city", header: "City" },
      { key: "country", header: "Country" },
    ],
  },
];

describe("flattenColumns", () => {
  it("keeps each column's own fields, and gives it its group", () => {
    const cell = vi.fn();
    const { leaves, groups } = flattenColumns<Person>([
      { key: "name", cell },
      { header: "Place", children: [{ key: "city" }] },
    ]);
    expect(leaves.map((leaf) => leaf.key)).toEqual(["name", "city"]);
    expect(leaves[0]!.cell).toBe(cell);
    expect(leaves[0]!.group).toBeUndefined();
    expect(leaves[1]!.group).toBe("Place");
    expect([...groups.values()].map((group) => group.childKeys)).toEqual([
      ["city"],
    ]);
  });
});

describe("a table's column groups", () => {
  function tableWith(collapsible: boolean) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    return TestBed.runInInjectionContext(() => {
      const source = injectFrontendData<Person>({
        data: signal([]),
        getRowId: (row) => row.id,
        urlSync: false,
      });
      return injectDataTable<Person>({
        source,
        columns: COLUMNS,
        rowKey: (row) => row.id,
        features: collapsible ? [collapsibleColumnGroups()] : [],
      });
    });
  }

  it("plans a group row over its columns", () => {
    const table = tableWith(false);
    const plan = table.headerPlan()!;
    expect(plan).toHaveLength(2);
    expect(
      plan[0]!.map((cell) =>
        cell.kind === "group" ? `group:${cell.cell.label}` : "leaf"
      )
    ).toEqual(["leaf", "group:Place"]);
    expect(plan[0]![1]).toMatchObject({ kind: "group", colSpan: 2 });
    expect(table.columnGroups().size).toBe(1);
  });

  it("collapses a group to its summary column, and opens it again", () => {
    const table = tableWith(true);
    const group = table.headerPlan()![0]![1]!;
    if (group.kind !== "group") throw new Error("expected a group cell");
    expect(group.cell.collapsible).toBe(true);
    table.layout().toggleColumnGroup(group.cell.id!);
    TestBed.tick();
    expect(table.columns().map((column) => column.key)).toEqual([
      "name",
      "country",
    ]);
    table.layout().toggleColumnGroup(group.cell.id!);
    TestBed.tick();
    expect(table.columns().map((column) => column.key)).toEqual([
      "name",
      "city",
      "country",
    ]);
  });

  it("has no plan while no column sits in a group", () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const table = TestBed.runInInjectionContext(() =>
      injectDataTable<Person>({
        source: injectFrontendData<Person>({
          data: signal([]),
          getRowId: (row) => row.id,
          urlSync: false,
        }),
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
      })
    );
    expect(table.headerPlan()).toBeNull();
  });
});

@Component({
  selector: "test-group-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    type="button"
    [attr.aria-label]="props().label"
    [attr.aria-expanded]="props().expanded"
    (click)="props().onClick()"
  ></button>`,
})
class TestButton {
  readonly props = input.required<ColumnGroupToggleButtonProps>();
}

@Component({
  imports: [AdaptColumnGroupToggleChrome],
  template: `
    <adapt-column-group-toggle-chrome
      [cell]="cell()"
      [labels]="labels"
      [onToggle]="onToggle"
      [slots]="slots"
    />
  `,
})
class Host {
  readonly cell = signal({
    key: "g",
    label: "Place",
    span: 2,
    id: "Place",
    collapsed: false,
    collapsible: true,
  });
  readonly labels = resolveLabels(undefined);
  readonly onToggle = vi.fn();
  readonly slots = { Button: TestButton };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptColumnGroupToggleChrome", () => {
  it("names the action and the group, and reports the group it belongs to", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const button = () => document.querySelector("button");
    expect(button()?.getAttribute("aria-label")).toBe(
      `${host.labels.collapseColumnGroup}: Place`
    );
    expect(button()?.getAttribute("aria-expanded")).toBe("true");
    button()!.click();
    expect(host.onToggle).toHaveBeenCalledWith("Place");

    host.cell.update((cell) => ({ ...cell, collapsed: true }));
    await fixture.whenStable();
    expect(button()?.getAttribute("aria-label")).toBe(
      `${host.labels.expandColumnGroup}: Place`
    );

    host.cell.update((cell) => ({ ...cell, collapsible: false }));
    await fixture.whenStable();
    expect(button()).toBeNull();
  });
});
