import {
  type ColumnDef,
  type GroupingPanelSlotProps,
} from "@adapttable/angular";
import { type GroupingPanelState, resolveLabels } from "@adapttable/core";
import { groupingPanel } from "@adapttable/taiga-ui/grouping-panel";
import { Component, getDebugNode, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NgModel } from "@angular/forms";
import { describe, expect, it } from "vitest";

import { AdaptGroupingPanel } from "./components/groupingPanel";
import { AdaptDataTable } from "./dataTable";
import { AdaptTaigaRoot } from "./taigaRoot";
import {
  chooseTaigaOption,
  taigaOptions,
  taigaOptionValue,
} from "./taigaTestHelpers";

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
  imports: [AdaptTaigaRoot, AdaptGroupingPanel],
  template: `<adapt-taiga-root
    ><adapt-grouping-panel [props]="panel()"
  /></adapt-taiga-root>`,
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
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    fixture,
    element: fixture.nativeElement as HTMLElement,
    host: fixture.componentInstance,
  };
}

function one<T extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  name: string
): T {
  const found = root.querySelectorAll<T>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  );
  expect(found, name).toHaveLength(1);
  return found[0]!;
}

describe("AdaptGroupingPanel", () => {
  it("adds a column from the add select", async () => {
    const { element, host, fixture } = await mountPanel();
    const add = one<HTMLInputElement>(element, "grouping-add");
    expect(add.getAttribute("aria-label")).toBe("Add grouping column");
    await chooseTaigaOption(fixture, add, "budget");
    expect(host.added).toEqual(["budget"]);
    expect(add.value).toBe("");
    expect(add.placeholder).toBe("Add grouping column");
    await chooseTaigaOption(fixture, add, "budget");
    expect(host.added).toEqual(["budget", "budget"]);
    expect(add.value).toBe("");
    expect(add.placeholder).toBe("Add grouping column");
  });

  it("does not reset a picker after its host removes it during selection", async () => {
    const { element, host, fixture } = await mountPanel();
    const add = one<HTMLInputElement>(element, "grouping-add");
    const model = getDebugNode(add)!.injector.get(NgModel);
    const chosen: string[] = [];
    host.panel.update((props) => ({
      ...props,
      state: {
        ...props.state,
        add: (key) => {
          chosen.push(key);
          fixture.destroy();
          // The fixture host was manually appended; destroy its DOM too.
          element.remove();
        },
      },
    }));
    await fixture.whenStable();
    const option = (await taigaOptions(fixture, add)).find(
      (item) => taigaOptionValue(item) === "budget"
    )!;
    option.click();
    await Promise.resolve();
    expect(chosen).toEqual(["budget"]);
    expect(fixture.componentRef.hostView.destroyed).toBe(true);
    expect(add.isConnected).toBe(false);
    expect(model.value).toBe("budget");
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

  it("adds nothing when the picker's placeholder is chosen", async () => {
    const { element, host, fixture } = await mountPanel();
    const picker = one<HTMLInputElement>(element, "grouping-aggregation-add");
    await chooseTaigaOption(fixture, picker, "");
    expect(host.added).toEqual([]);
  });

  it("adds an aggregation from the picker and speaks the announcement", async () => {
    const { element, host, fixture } = await mountPanel();
    const picker = one<HTMLInputElement>(element, "grouping-aggregation-add");
    await chooseTaigaOption(fixture, picker, "budget");
    expect(host.added).toEqual(["agg:budget"]);
    expect(picker.value).toBe("");
    expect(picker.placeholder).toBe("Add aggregation column");
    await chooseTaigaOption(fixture, picker, "budget");
    expect(host.added).toEqual(["agg:budget", "agg:budget"]);
    expect(picker.value).toBe("");
    expect(picker.placeholder).toBe("Add aggregation column");
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
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const add = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>('[data-adapttable-part="grouping-add"]')!;
    expect(add.value).toBe("");
    expect(add.placeholder).toBe("Add grouping column");
    expect((await taigaOptions(fixture, add)).map(taigaOptionValue)).toEqual([
      "",
      "team",
      "budget",
    ]);

    await chooseTaigaOption(fixture, add, "team");
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
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const operation = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        '[data-adapttable-part="grouping-aggregation-operation"]'
      )!;
    expect(
      (await taigaOptions(fixture, operation())).map(taigaOptionValue)
    ).toEqual(["sum", "avg"]);
    const options = await taigaOptions(fixture, operation());
    expect(operation().value).toBe(options[1]!.textContent.trim());
    expect(options[1]!.getAttribute("aria-selected")).toBe("true");

    withOperation("sum");
    await fixture.whenStable();
    expect(operation().value).toBe(options[0]!.textContent.trim());
    expect(options[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("shows the aggregation picker's placeholder rather than a column", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const picker = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>(
      '[data-adapttable-part="grouping-aggregation-add"]'
    )!;
    expect(picker.value).toBe("");
    expect(picker.placeholder).toBe("Add aggregation column");
    const options = await taigaOptions(fixture, picker);
    expect(options[0]!.textContent.trim()).toBe("Add aggregation column");
    expect(taigaOptionValue(options[0]!)).toBe("");
  });

  it("composes the groupingPanel feature on the table, seeded with its keys", async () => {
    const fixture = TestBed.createComponent(TableHost);
    document.body.append(fixture.nativeElement as HTMLElement);
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
