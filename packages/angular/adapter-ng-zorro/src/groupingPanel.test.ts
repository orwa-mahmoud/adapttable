import type { ColumnDef } from "@adapttable/angular";
import type { GroupingPanelSlotProps } from "@adapttable/angular/adapter";
import { type GroupingPanelState, resolveLabels } from "@adapttable/core";
import { groupingPanel } from "@adapttable/ng-zorro/grouping-panel";
import { Component, getDebugNode, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NzSelectComponent } from "ng-zorro-antd/select";
import { describe, expect, it } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptGroupingPanel } from "./components/groupingPanel";
import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  team: string;
  budget: number;
}

const ROWS: Row[] = [
  { id: "1", team: "A", budget: 10 },
  { id: "2", team: "B", budget: 20 },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget" },
];

function state(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "Grouped by Team",
    headerDragProps: () => ({}),
    chipDragProps: () => ({ draggable: true }),
    chipKeyboardProps: (_key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Move ${label}`,
      onKeyDown: () => undefined,
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({
      onDragEnter: () => undefined,
      onDragOver: () => undefined,
      onDragLeave: () => undefined,
      onDrop: () => undefined,
    }),
    add: () => undefined,
    remove: () => undefined,
    moveBy: () => undefined,
    setAggregate: () => undefined,
    aggregations: {
      items: [
        {
          columnKey: "budget",
          operationId: "sum",
          editable: true,
          origin: "reader",
          operations: [{ id: "sum", builtIn: true }],
        },
      ],
      candidates: [
        { columnKey: "budget", active: false, operations: [] },
        { columnKey: "team", active: true, operations: [] },
      ],
      atDefaults: false,
      hasDefaults: true,
    },
    setAggregateOperation: () => undefined,
    addAggregate: () => undefined,
    removeAggregate: () => undefined,
    restoreAggregateDefaults: () => undefined,
    ...overrides,
  };
}

@Component({
  imports: [AdaptGroupingPanel],
  template: `<adapt-grouping-panel [props]="panel()" />`,
})
class Host {
  readonly added: string[] = [];
  readonly removed: string[] = [];
  readonly moved: string[] = [];
  readonly ungrouped: string[] = [];
  readonly panel = signal<GroupingPanelSlotProps<ColumnDef<Row>>>({
    state: state({
      add: (key) => {
        this.added.push(key);
      },
      remove: (key) => {
        this.removed.push(key);
      },
      addAggregate: (key) => {
        this.added.push(`agg:${key}`);
      },
      chipKeyboardProps: (key, label) => ({
        tabIndex: 0,
        role: "button",
        "aria-label": `Move ${label}`,
        onKeyDown: (event) => {
          this.moved.push(`${key}:${event.key}`);
        },
      }),
      removeDropProps: () => ({
        onDrop: () => {
          this.ungrouped.push("drop");
        },
      }),
      drag: { key: "team", source: "chip", overRemove: true },
    }),
    columns: COLUMNS,
    labels: resolveLabels(undefined),
    mobile: false,
  });
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [features]="features"
    />
  `,
})
class TableHost {
  readonly data = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly features = [groupingPanel(["team"])];
}

async function mountPanel() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  document.body.append(fixture.nativeElement);
  return {
    settle: () => fixture.whenStable(),
    element: fixture.nativeElement as HTMLElement,
    host: fixture.componentInstance,
  };
}

function one<T extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  name: string
): T {
  const found = root.querySelectorAll<T>(kitSelector(name));
  expect(found, name).toHaveLength(1);
  return found[0]!;
}

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

describe("AdaptGroupingPanel", () => {
  it("adds a column from the add select", async () => {
    const { element, host, settle } = await mountPanel();
    expect(one(element, "grouping-panel").classList.contains("ant-card")).toBe(
      true
    );
    const add = one(element, "grouping-add");
    expect(add.classList.contains("ant-select")).toBe(true);
    expect(add.getAttribute("aria-label")).toBe("Add grouping column");
    await choose(add, "budget", settle);
    expect(host.added).toEqual(["budget"]);
  });

  it("removes a field from its chip", async () => {
    const { element, host } = await mountPanel();
    one<HTMLButtonElement>(element, "grouping-chip-remove").click();
    expect(host.removed).toEqual(["team"]);
  });

  it("hands chip keys to the keyboard mover", async () => {
    const { element, host } = await mountPanel();
    const handle = one(element, "grouping-chip-handle");
    expect(handle.getAttribute("aria-label")).toBe("Move Team");
    handle.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(host.moved).toEqual(["team:ArrowRight"]);
  });

  it("ungroups a chip dropped on the remove target", async () => {
    const { element, host } = await mountPanel();
    const zone = one(element, "grouping-remove-zone");
    expect(zone.getAttribute("data-active")).toBe("true");
    zone.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));
    expect(host.ungrouped).toEqual(["drop"]);
  });

  it("adds nothing when the picker is opened and dismissed", async () => {
    const { element, host, settle } = await mountPanel();
    const picker = one(element, "grouping-aggregation-add");
    picker.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await settle();
    picker.querySelector<HTMLInputElement>("input")!.focus();
    picker
      .querySelector<HTMLInputElement>("input")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    await settle();
    expect(host.added).toEqual([]);
  });

  it("adds an aggregation from the picker and speaks the announcement", async () => {
    const { element, host, settle } = await mountPanel();
    const picker = one(element, "grouping-aggregation-add");
    await choose(picker, "budget", settle);
    expect(host.added).toEqual(["agg:budget"]);
    expect(
      picker
        .querySelector(".ant-select-selection-placeholder")
        ?.textContent?.trim()
    ).toBe("Add aggregation column");
    expect(one(element, "grouping-announcer").textContent).toBe(
      "Grouped by Team"
    );
  });

  it("shows the add placeholder until a column is chosen, and adds the first column", async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.panel.update((props) => ({
      ...props,
      state: { ...props.state, groupBy: [] },
    }));
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const add = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLElement>('[data-adapttable-part="grouping-add"]')!;
    expect(
      add
        .querySelector(".ant-select-selection-placeholder")
        ?.textContent?.trim()
    ).toBe("Add grouping column");
    expect(
      getDebugNode(add)!
        .injector.get(NzSelectComponent)
        .listOfContainerItem.map((option) => option.nzValue)
    ).toEqual(["team", "budget"]);
    await choose(add, "team", () => fixture.whenStable());
    expect(host.added).toEqual(["team"]);
  });

  it("shows the bound aggregation operation and follows it", async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const withOperation = (operationId: string) =>
      host.panel.update((props) => ({
        ...props,
        state: {
          ...props.state,
          aggregations: {
            ...props.state.aggregations,
            items: [
              {
                columnKey: "budget",
                operationId,
                editable: true,
                origin: "reader",
                operations: [
                  { id: "sum", builtIn: true },
                  { id: "avg", builtIn: true },
                ],
              },
            ],
          },
        },
      }));
    withOperation("avg");
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const operation = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
        '[data-adapttable-part="grouping-aggregation-operation"]'
      )!;
    expect(
      getDebugNode(operation())!
        .injector.get(NzSelectComponent)
        .listOfContainerItem.map((option) => option.nzValue)
    ).toEqual(["sum", "avg"]);
    expect(
      getDebugNode(operation())!.injector.get(NzSelectComponent).listOfValue
    ).toEqual(["avg"]);
    expect(
      operation().querySelector("nz-select-item")?.textContent?.trim()
    ).not.toBe("");
    const averageLabel =
      operation().querySelector("nz-select-item")?.textContent;
    withOperation("sum");
    await fixture.whenStable();
    expect(
      getDebugNode(operation())!.injector.get(NzSelectComponent).listOfValue
    ).toEqual(["sum"]);
    expect(operation().querySelector("nz-select-item")?.textContent).not.toBe(
      averageLabel
    );
  });

  it("shows the aggregation picker's placeholder rather than a column", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const picker = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLElement>(
      '[data-adapttable-part="grouping-aggregation-add"]'
    )!;
    expect(
      picker
        .querySelector(".ant-select-selection-placeholder")
        ?.textContent?.trim()
    ).toBe("Add aggregation column");
    expect(picker.querySelector("nz-select-item")).toBeNull();
  });

  it("composes the groupingPanel feature on the table, seeded with its keys", async () => {
    const fixture = TestBed.createComponent(TableHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelectorAll('[data-adapttable-part="grouping-panel"]')
    ).toHaveLength(1);
    expect(
      [...element.querySelectorAll('[data-adapttable-part="group-label"]')].map(
        (label) => label.textContent.trim()
      )
    ).toEqual(["A", "B"]);
  });
});
