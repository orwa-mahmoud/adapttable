import type {
  ColumnDef,
  CustomCellEditorCtrl,
  FilterFormSource,
  RowDragEvent,
} from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { afterEach, expect, it, vi } from "vitest";
import { computed, createApp, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { densityChooser } from "../src/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  undoRedoButtons,
} from "../src/editing";
import { groupingPanel } from "../src/grouping-panel";
import { FilterHeaderControl } from "../src/header-filters";
import { rowReorder } from "../src/row-reorder";

interface Row {
  id: string;
  team: string;
  when: string;
}
const rows: Row[] = [
  { id: "a", team: "Core", when: "2026-10-07T10:00" },
  { id: "b", team: "Ops", when: "2026-10-07T11:00" },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns: [{ key: "team", groupable: true }],
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
function transfer(): RowDragEvent["dataTransfer"] &
  Pick<DataTransfer, "types"> {
  const values = new Map<string, string>();
  return {
    get types() {
      return [...values.keys()];
    },
    effectAllowed: "all",
    dropEffect: "move",
    setData: (format, value) => {
      values.set(format, value);
    },
    getData: (format) => values.get(format) ?? "",
  };
}
async function drag(
  target: HTMLElement,
  type: string,
  dataTransfer?: RowDragEvent["dataTransfer"]
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: 20,
  });
  if (dataTransfer)
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
  await flush();
  return event;
}
it("forwards real row drag events through the Reka grip and requests a move without changing host rows", async () => {
  const move = vi.fn();
  const host = mount(() =>
    h(DataTable<Row>, { ...base, features: [rowReorder<Row>(move)] })
  );
  await flush();
  const first = element<HTMLButtonElement>(
    `[data-row-id="a"] ${part("row-reorder-handle")}`,
    host
  );
  const target = element('[data-row-id="b"]', host);
  const dataTransfer = transfer();
  await drag(first, "dragstart");
  expect(move).not.toHaveBeenCalled();
  await drag(first, "dragstart", dataTransfer);
  expect(first.hasAttribute("data-dragging")).toBe(true);
  await drag(target, "dragover", dataTransfer);
  await drag(target, "drop", dataTransfer);
  await drag(first, "dragend", dataTransfer);
  expect(move).toHaveBeenCalledWith(0, 1, rows[0]);
  expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  expect(first.hasAttribute("data-dragging")).toBe(false);
});
it("shows the grouping removal drop target only during a real chip drag and removes that grouping", async () => {
  const host = mount(() =>
    h(DataTable<Row>, { ...base, features: [groupingPanel<Row>("team")] })
  );
  await flush();
  expect(host.querySelector(part("grouping-remove-zone"))).toBeNull();
  const grip = element(part("grouping-chip-handle"), host);
  const dataTransfer = transfer();
  await drag(grip, "dragstart", dataTransfer);
  const remove = element(part("grouping-remove-zone"), host);
  expect(remove.textContent).toContain("remove");
  await drag(remove, "dragenter", dataTransfer);
  await drag(remove, "dragover", dataTransfer);
  expect(remove.hasAttribute("data-active")).toBe(true);
  await drag(remove, "drop", dataTransfer);
  await drag(grip, "dragend", dataTransfer);
  expect(host.querySelector(part("grouping-chip"))).toBeNull();
  expect(host.querySelectorAll(part("group-row"))).toHaveLength(0);
});
it("runs a consumer custom cell editor and preserves commit and cancellation ownership", async () => {
  const commit = vi.fn();
  const column: ColumnDef<Row> = {
    key: "team",
    editable: true,
    editor: {
      type: "custom",
      render: (control: CustomCellEditorCtrl) =>
        h("div", [
          h("input", {
            "aria-label": control.label,
            value: control.draft,
            onInput: (event: Event) => {
              const target = event.currentTarget;
              if (target instanceof HTMLInputElement)
                control.setDraft(target.value);
            },
          }),
          h(
            "button",
            { type: "button", "data-custom-save": "", onClick: control.commit },
            "Commit"
          ),
          h(
            "button",
            {
              type: "button",
              "data-custom-cancel": "",
              onClick: control.cancel,
            },
            "Cancel"
          ),
        ]),
    },
  };
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      columns: [column],
      features: [editing<Row>(commit)],
    })
  );
  await flush();
  await key(element(part("edit-cell-activate"), host), "F2");
  const input = element<HTMLInputElement>("tbody input", host);
  input.value = "Studio";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  element<HTMLButtonElement>("[data-custom-save]", host).click();
  await flush();
  expect(commit).toHaveBeenCalledExactlyOnceWith(rows[0], "team", "Studio");
  await key(element(part("edit-cell-activate"), host), "F2");
  element<HTMLButtonElement>("[data-custom-cancel]", host).click();
  await flush();
  expect(commit).toHaveBeenCalledTimes(1);
  expect(host.querySelector("[data-custom-save]")).toBeNull();
});
it("uses a datetime-local editor and commits its changed value on blur", async () => {
  const commit = vi.fn();
  const host = mount(() =>
    h("div", [
      h("button", { id: "edit-outside" }, "Outside"),
      h(DataTable<Row>, {
        ...base,
        columns: [{ key: "when", editable: true, editor: "datetime" }],
        features: [editing<Row>(commit)],
      }),
    ])
  );
  await flush();
  await key(element(part("edit-cell-activate"), host), "F2");
  const input = element<HTMLInputElement>(part("edit-cell-editor"), host);
  expect(input.type).toBe("datetime-local");
  input.value = "2026-10-08T12:30";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  element<HTMLButtonElement>("#edit-outside", host).focus();
  await flush();
  expect(commit).toHaveBeenCalledExactlyOnceWith(
    rows[0],
    "when",
    "2026-10-08T12:30"
  );
});
it("runs real Undo and Redo controls against the current host edit history", async () => {
  const data = shallowRef(rows);
  const commit = vi.fn((row: Row, column: string, value: unknown) => {
    if (column === "team" && typeof value === "string")
      data.value = data.value.map((item) =>
        item.id === row.id ? { ...item, team: value } : item
      );
  });
  const features = [
    editing<Row>(commit),
    editHistory(),
    undoRedoButtons(),
    dirtyIndicators(),
  ];
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      data: data.value,
      columns: [{ key: "team", editable: true }],
      features,
    })
  );
  await flush();
  const undo = element<HTMLButtonElement>(part("undo-button"), host);
  expect(undo.disabled).toBe(true);
  await key(element(part("edit-cell-activate"), host), "F2");
  const input = element<HTMLInputElement>(part("edit-cell-editor"), host);
  input.value = "Studio";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  await key(input, "Enter");
  expect(data.value[0]?.team).toBe("Studio");
  undo.click();
  await flush();
  expect(data.value[0]?.team).toBe("Core");
  element<HTMLButtonElement>(part("redo-button"), host).click();
  await flush();
  expect(data.value[0]?.team).toBe("Studio");
  expect(commit).toHaveBeenCalledTimes(3);
});
it("closes a compact multiple-choice header menu when the host requests close-on-select", async () => {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    extra.value = { ...extra.value, [key]: value };
  });
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras: vi.fn(),
    allFilteredRows: rows,
  }));
  const host = mount(() =>
    h(FilterHeaderControl<Row>, {
      def: {
        key: "team",
        type: "multiSelect",
        options: [
          { value: "Core", label: "Core" },
          { value: "Ops", label: "Ops" },
        ],
      },
      source: source.value,
      labels: resolveLabels(undefined),
      closeOnSelect: true,
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("filter-header-input"), host);
  await key(trigger, "ArrowDown");
  const item = element<HTMLElement>('[role="menuitemcheckbox"]');
  item.focus();
  await key(item, "Enter");
  expect(extra.value.team).toEqual(["Core"]);
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it("changes density in both directions using the table's current controlled value", async () => {
  const density = shallowRef<"comfortable" | "compact">("comfortable");
  const change = vi.fn((value: "comfortable" | "compact") => {
    density.value = value;
  });
  const feature = densityChooser();
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      density: density.value,
      onDensityChange: change,
      features: [feature],
    })
  );
  await flush();
  const group = element(part("density-toggle"), host);
  for (const label of ["Compact", "Comfortable"]) {
    const option = [
      ...group.querySelectorAll<HTMLButtonElement>("button"),
    ].find((node) => node.textContent?.trim() === label);
    if (!option) throw new Error(`Missing ${label}`);
    option.focus();
    option.click();
    await flush();
    expect(option.getAttribute("aria-pressed")).toBe("true");
    expect(group.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(group.textContent).toContain("Comfortable");
    expect(group.textContent).toContain("Compact");
  }
  expect(change.mock.calls).toEqual([["compact"], ["comfortable"]]);
});

it("keeps mobile grouping and app-computed aggregate values readable without editable aggregation controls", async () => {
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      forceMobile: true,
      columns: [{ key: "team", groupable: true }, { key: "when" }],
      features: [
        groupingPanel<Row>("team", {
          groupAggregates: () => ({ when: "Computed by app" }),
        }),
      ],
    })
  );
  await flush();
  expect(
    element(part("grouping-panel"), host).hasAttribute("data-mobile")
  ).toBe(true);
  const aggregate = element(part("grouping-aggregation-item"), host);
  expect(aggregate.textContent).toContain("Set by the app");
  expect(aggregate.querySelector('[role="combobox"]')).toBeNull();
  expect(host.textContent).toContain("Computed by app");
});
it("accepts a column-header drag at an active grouping drop boundary", async () => {
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      columns: [
        { key: "team", groupable: true },
        { key: "when", groupable: true },
      ],
      features: [groupingPanel<Row>("team")],
    })
  );
  await flush();
  const header = element('th[data-column-key="when"]', host);
  expect(header.getAttribute("draggable")).toBe("true");
  const dataTransfer = transfer();
  await drag(header, "dragstart", dataTransfer);
  const zones = [
    ...host.querySelectorAll<HTMLElement>(part("grouping-drop-zone")),
  ];
  const target = zones.at(-1);
  if (!target) throw new Error("Missing grouping drop boundary");
  expect(target.hasAttribute("data-dragging")).toBe(true);
  await drag(target, "dragenter", dataTransfer);
  await drag(target, "dragover", dataTransfer);
  expect(target.hasAttribute("data-active")).toBe(true);
  await drag(target, "drop", dataTransfer);
  await drag(header, "dragend", dataTransfer);
  expect(host.querySelectorAll(part("grouping-chip"))).toHaveLength(2);
});
