import { type GroupingPanelState, resolveLabels } from "@adapttable/core";
import type {
  GroupingPanelAggregationRemoveProps,
  GroupingPanelChecklistProps,
  GroupingPanelChipProps,
  GroupingPanelDropZoneProps,
  GroupingPanelRemoveZoneProps,
  GroupingPanelRestoreProps,
  GroupingPanelSelectProps,
} from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  AdaptGroupingPanelChrome,
  type AngularGroupingPanelAggregationItemProps,
  type AngularGroupingPanelSurfaceProps,
  type GroupingPanelSlots,
} from "./groupingPanelChrome";

interface Row {
  id: string;
}

const COLUMNS: ColumnDef<Row>[] = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget" },
  { key: "person", header: "Person", groupable: false },
  { key: "code", header: "Code" },
];

@Component({
  selector: "gp-surface",
  imports: [NgTemplateOutlet],
  template: `
    <section
      [attr.aria-label]="props().label"
      [attr.data-mobile]="props().mobile ? true : null"
      [attr.dir]="props().dir ?? null"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      (dragenter)="props().onDragEnter?.($event)"
      (dragover)="props().onDragOver?.($event)"
      (dragleave)="props().onDragLeave?.($event)"
      (drop)="props().onDrop?.($event)"
    >
      <ng-container [ngTemplateOutlet]="props().children" />
    </section>
  `,
})
class SurfaceSlot {
  readonly props = input.required<AngularGroupingPanelSurfaceProps>();
}

@Component({
  selector: "gp-zone",
  template: `
    <fieldset
      [attr.aria-label]="props().label"
      [attr.data-empty]="props().empty ? true : null"
      [attr.data-active]="props().active ? true : null"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      (dragenter)="props().dropProps.onDragEnter?.($event)"
      (dragover)="props().dropProps.onDragOver?.($event)"
      (drop)="props().dropProps.onDrop?.($event)"
    ></fieldset>
  `,
})
class ZoneSlot {
  readonly props = input.required<GroupingPanelDropZoneProps<DragEvent>>();
}

@Component({
  selector: "gp-chip",
  template: `
    <span [attr.data-adapttable-part]="props()['data-adapttable-part']">
      <button
        type="button"
        [attr.aria-label]="props().keyboardProps['aria-label']"
        (keydown)="props().keyboardProps.onKeyDown($event)"
      >
        {{ props().label }}
      </button>
      <button
        type="button"
        [attr.aria-label]="props().removeLabel"
        (click)="props().onRemove()"
      >
        x
      </button>
    </span>
  `,
})
class ChipSlot {
  readonly props =
    input.required<GroupingPanelChipProps<KeyboardEvent, DragEvent>>();
}

@Component({
  selector: "gp-select",
  template: `
    <select
      [attr.aria-label]="props().label"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      [disabled]="props().disabled ?? false"
      (change)="props().onChange($any($event.target).value)"
    >
      @for (option of props().options; track option.value) {
        <option [value]="option.value">{{ option.label }}</option>
      }
    </select>
  `,
})
class SelectSlot {
  readonly props = input.required<GroupingPanelSelectProps>();
}

@Component({
  selector: "gp-remove-zone",
  template: `
    <fieldset
      [attr.aria-label]="props().label"
      [attr.data-active]="props().active ? true : null"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      (drop)="props().dropProps.onDrop?.($event)"
    ></fieldset>
  `,
})
class RemoveZoneSlot {
  readonly props = input.required<GroupingPanelRemoveZoneProps<DragEvent>>();
}

@Component({
  selector: "gp-agg-item",
  imports: [NgTemplateOutlet],
  template: `
    <span
      [attr.data-read-only]="props().readOnly ? true : null"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
    >
      <span>{{ props().label }}</span>
      @if (props().readOnly) {
        <span>{{ props().readOnlyLabel }}</span>
      } @else {
        <ng-container [ngTemplateOutlet]="props().children" />
      }
    </span>
  `,
})
class AggregationItemSlot {
  readonly props = input.required<AngularGroupingPanelAggregationItemProps>();
}

@Component({
  selector: "gp-agg-remove",
  template: `
    <button
      type="button"
      [attr.aria-label]="props().label"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      (click)="props().onRemove()"
    >
      x
    </button>
  `,
})
class AggregationRemoveSlot {
  readonly props = input.required<GroupingPanelAggregationRemoveProps>();
}

@Component({
  selector: "gp-picker",
  template: `
    <select
      [attr.aria-label]="props().label"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      [disabled]="props().disabled ?? false"
      (change)="props().onToggle($any($event.target).value, true)"
    >
      @for (option of props().options; track option.value) {
        @if (!option.checked) {
          <option
            [value]="option.value"
            data-adapttable-part="grouping-aggregation-option"
          >
            {{ option.label }}
          </option>
        }
      }
    </select>
    <button
      type="button"
      class="uncheck"
      (click)="props().onToggle('team', false)"
    >
      uncheck
    </button>
  `,
})
class PickerSlot {
  readonly props = input.required<GroupingPanelChecklistProps>();
}

@Component({
  selector: "gp-restore",
  template: `
    <button
      type="button"
      [attr.data-adapttable-part]="props()['data-adapttable-part']"
      [disabled]="props().disabled"
      (click)="props().onRestore()"
    >
      {{ props().label }}
    </button>
  `,
})
class RestoreSlot {
  readonly props = input.required<GroupingPanelRestoreProps>();
}

const SLOTS: GroupingPanelSlots = {
  Surface: SurfaceSlot,
  DropZone: ZoneSlot,
  Chip: ChipSlot,
  Select: SelectSlot,
  RemoveZone: RemoveZoneSlot,
  AggregationItem: AggregationItemSlot,
  AggregationRemove: AggregationRemoveSlot,
  AggregationPicker: PickerSlot,
  AggregationRestore: RestoreSlot,
};

function panelState(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({}),
    chipDragProps: () => ({}),
    chipKeyboardProps: (_key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Move ${label}`,
      onKeyDown: () => undefined,
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({}),
    add: () => undefined,
    remove: () => undefined,
    moveBy: () => undefined,
    setAggregate: () => undefined,
    aggregations: {
      items: [],
      candidates: [],
      atDefaults: true,
      hasDefaults: false,
    },
    setAggregateOperation: () => undefined,
    addAggregate: () => undefined,
    removeAggregate: () => undefined,
    restoreAggregateDefaults: () => undefined,
    ...overrides,
  };
}

@Component({
  imports: [AdaptGroupingPanelChrome],
  template: `
    <adapt-grouping-panel-chrome
      [state]="state()"
      [columns]="columns()"
      [labels]="labels"
      [mobile]="mobile()"
      [dir]="dir()"
      [slots]="slots"
    />
  `,
})
class Host {
  readonly labels = resolveLabels(undefined);
  readonly slots = SLOTS;
  readonly columns = signal(COLUMNS);
  readonly mobile = signal(false);
  readonly dir = signal<"rtl" | undefined>(undefined);
  readonly added: string[] = [];
  readonly removed: string[] = [];
  readonly operations: string[] = [];
  readonly toggled: string[] = [];
  readonly restored: string[] = [];
  readonly state = signal<GroupingPanelState>(
    panelState({
      add: (key) => {
        this.added.push(key);
      },
      remove: (key) => {
        this.removed.push(key);
      },
      setAggregateOperation: (key, value) => {
        this.operations.push(`${key}:${value}`);
      },
      addAggregate: (key) => {
        this.toggled.push(`add:${key}`);
      },
      removeAggregate: (key) => {
        this.toggled.push(`remove:${key}`);
        this.state.update((current) => ({
          ...current,
          aggregations: {
            ...current.aggregations,
            items: current.aggregations.items.filter(
              (item) => item.columnKey !== key
            ),
          },
        }));
      },
      restoreAggregateDefaults: () => {
        this.restored.push("yes");
      },
    })
  );
}

function part(root: HTMLElement, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const settle = () => fixture.whenStable();
  return { host, element, settle };
}

describe("AdaptGroupingPanelChrome", () => {
  it("adds and removes a field, and names the strip", async () => {
    const { host, element, settle } = await mount();
    const add = element.querySelector<HTMLSelectElement>(
      '[data-adapttable-part="grouping-add"]'
    );
    expect(add).not.toBeNull();
    if (!add) throw new Error("add is not rendered");
    add.value = "budget";
    add.dispatchEvent(new Event("change"));
    element
      .querySelector<HTMLButtonElement>(
        '[aria-label="Remove Team from grouping"]'
      )!
      .click();
    await settle();
    expect(host.added).toEqual(["budget"]);
    expect(host.removed).toEqual(["team"]);
    expect(part(element, "grouping-panel")?.getAttribute("aria-label")).toBe(
      "Row grouping"
    );
    expect(element.querySelector("[aria-label='Move Team']")).not.toBeNull();
    expect(part(element, "grouping-announcer")).not.toBeNull();
  });

  it("offers only groupable columns that are not already grouped", async () => {
    const { element } = await mount();
    const values = [
      ...element.querySelectorAll<HTMLOptionElement>(
        '[data-adapttable-part="grouping-add"] option'
      ),
    ].map((option) => option.value);
    expect(values).toEqual(["budget", "code"]);
  });

  it("hides insertion carets on a phone and shows them on a desktop", async () => {
    const { host, element, settle } = await mount();
    expect(
      element.querySelectorAll('[data-adapttable-part="grouping-drop-zone"]')
    ).toHaveLength(2);
    host.mobile.set(true);
    await settle();
    expect(
      element.querySelector('[data-adapttable-part="grouping-drop-zone"]')
    ).toBeNull();
    expect(part(element, "grouping-panel")?.getAttribute("data-mobile")).toBe(
      "true"
    );
  });

  it("draws the empty-state target and a key with no column", async () => {
    const { host, element, settle } = await mount();
    host.state.update((current) => ({ ...current, groupBy: ["missing"] }));
    await settle();
    expect(element.textContent).toContain("missing");
    host.state.update((current) => ({ ...current, groupBy: [] }));
    await settle();
    expect(
      element.querySelector(
        '[data-adapttable-part="grouping-drop-zone"][data-empty]'
      )
    ).not.toBeNull();
  });

  it("draws aggregations, refuses an empty operation, and restores defaults", async () => {
    const { host, element, settle } = await mount();
    host.state.update((current) => ({
      ...current,
      aggregations: {
        items: [
          {
            columnKey: "budget",
            operationId: "sum",
            editable: true,
            origin: "reader",
            operations: [
              { id: "sum", builtIn: true },
              { id: "count", builtIn: true },
            ],
          },
          {
            columnKey: "code",
            editable: false,
            origin: "host",
            operations: [],
          },
        ],
        candidates: [{ columnKey: "team", active: false, operations: [] }],
        atDefaults: false,
        hasDefaults: true,
      },
    }));
    await settle();
    const operation = element.querySelector<HTMLSelectElement>(
      '[data-adapttable-part="grouping-aggregation-operation"]'
    );
    expect(operation).not.toBeNull();
    if (!operation) throw new Error("operation is not rendered");
    operation.value = "";
    operation.dispatchEvent(new Event("change"));
    operation.value = "count";
    operation.dispatchEvent(new Event("change"));
    expect(host.operations).toEqual(["budget:count"]);
    expect(element.textContent).toContain("Set by the app");
    element
      .querySelector<HTMLButtonElement>(
        '[data-adapttable-part="grouping-aggregations-restore"]'
      )!
      .click();
    expect(host.restored).toEqual(["yes"]);
    const picker = element.querySelector<HTMLSelectElement>(
      '[data-adapttable-part="grouping-aggregation-add"]'
    );
    if (!picker) throw new Error("picker is not rendered");
    picker.value = "team";
    picker.dispatchEvent(new Event("change"));
    expect(host.toggled).toEqual(["add:team"]);
    element.querySelector<HTMLButtonElement>(".uncheck")!.click();
    await settle();
    expect(host.toggled).toContain("remove:team");
    host.state.update((current) => ({
      ...current,
      canSetAggregates: false,
      aggregations: {
        ...current.aggregations,
        candidates: [],
        atDefaults: true,
        hasDefaults: true,
      },
    }));
    await settle();
    expect(
      element.querySelector<HTMLSelectElement>(
        '[data-adapttable-part="grouping-aggregation-add"]'
      )?.disabled
    ).toBe(true);
    expect(part(element, "grouping-aggregations-restore")).toBeNull();
  });

  it("moves focus to the next aggregation's remove control, then to the picker", async () => {
    const { host, element, settle } = await mount();
    const item = (columnKey: string) => ({
      columnKey,
      operationId: "sum",
      editable: true,
      origin: "reader" as const,
      operations: [{ id: "sum", builtIn: true }],
    });
    host.state.update((current) => ({
      ...current,
      aggregations: {
        items: [item("budget"), item("code")],
        candidates: [
          { columnKey: "budget", active: true, operations: [] },
          { columnKey: "code", active: true, operations: [] },
        ],
        atDefaults: true,
        hasDefaults: false,
      },
    }));
    await settle();
    const removeBudget = element.querySelector<HTMLButtonElement>(
      '[aria-label="Remove Budget aggregation"]'
    )!;
    removeBudget.focus();
    removeBudget.click();
    await settle();
    expect(host.toggled).toEqual(["remove:budget"]);
    expect(document.activeElement).toBe(
      element.querySelector('[aria-label="Remove Code aggregation"]')
    );

    (document.activeElement as HTMLButtonElement).click();
    await settle();
    expect(host.toggled).toEqual(["remove:budget", "remove:code"]);
    expect(document.activeElement).toBe(
      part(element, "grouping-aggregation-add")
    );
  });

  it("shows the ungroup target only while a chip is dragged", async () => {
    const { host, element, settle } = await mount();
    const seen: string[] = [];
    host.state.update((current) => ({
      ...current,
      drag: { key: "team", source: "chip", overRemove: true },
      removeDropProps: () => ({
        onDrop: () => {
          seen.push("drop");
        },
      }),
    }));
    await settle();
    const zone = part(element, "grouping-remove-zone");
    expect(zone?.getAttribute("data-active")).toBe("true");
    zone!.dispatchEvent(new Event("drop"));
    expect(seen).toEqual(["drop"]);
    host.state.update((current) => ({
      ...current,
      drag: { key: "budget", source: "header" },
    }));
    await settle();
    expect(part(element, "grouping-remove-zone")).toBeNull();
  });

  it("lets an inner drop target's drop win over the chip row's", async () => {
    const { host, element, settle } = await mount();
    const seen: string[] = [];
    host.state.update((current) => ({
      ...current,
      groupBy: ["team", "budget"],
      drag: { key: "code", source: "header", overIndex: 1 },
      dropProps: (index) => ({
        onDrop: (event) => {
          seen.push(`drop:${String(index)}`);
          event.preventDefault();
        },
      }),
    }));
    await settle();
    const zones = [
      ...element.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="grouping-drop-zone"]'
      ),
    ];
    const rows = [
      ...element.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="grouping-item"]'
      ),
    ];
    expect(zones).toHaveLength(3);
    expect(rows[1]!.contains(zones[2]!)).toBe(true);

    // The last zone inserts at 2; the chip row around it would insert at 1.
    zones[2]!.dispatchEvent(
      new Event("drop", { bubbles: true, cancelable: true })
    );
    expect(seen).toEqual(["drop:2"]);

    seen.length = 0;
    rows[1]!.dispatchEvent(
      new Event("drop", { bubbles: true, cancelable: true })
    );
    expect(seen).toEqual(["drop:1"]);
  });
});
