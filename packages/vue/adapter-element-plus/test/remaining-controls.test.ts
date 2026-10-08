import { aggregate, type ColumnDef } from "@adapttable/vue";
import {
  CommandPaletteChrome,
  resolveLabels,
  SavedViewsMenuChrome,
} from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { computed, h, nextTick, ref } from "vue";

import { elementPaletteSlots } from "../src/actions/elementRemainingControls";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import DataTable from "../src/DataTable.vue";
import { exportCsv } from "../src/export";
import { grouping } from "../src/grouping";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { SavedViewsPanel } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";
import { elementSavedViewsMenuSlots } from "../src/views/elementSavedViewsControls";
import { mount, node } from "./mount";
const rows = [
  { id: "a", team: "Core", amount: 4 },
  { id: "b", team: "Ops", amount: 8 },
  { id: "c", team: "Core", amount: 12 },
];
type Row = (typeof rows)[number];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", header: "Team", groupable: true },
  {
    key: "amount",
    header: "Amount",
    aggregatable: { operations: ["sum", "avg"] },
  },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
  forceMobile: false,
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 35));
  await nextTick();
}
async function key(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await tick();
}
async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
async function choose(root: ParentNode, name: string, label: string) {
  const input = node<HTMLInputElement>(root, `${part(name)} input`);
  input.click();
  await tick();
  const option = [
    ...root.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === label);
  if (!option) throw new Error(`Missing option ${label}`);
  option.click();
  await tick();
}
describe("Element remaining feature controls", () => {
  it.each([false, true])(
    "renders native export, grouping and side-panel controls mobile=%s",
    async (mobile) => {
      const opened = ref<string | null>("one");
      const change = vi.fn((value: string | null) => {
        opened.value = value;
      });
      const view = mount(() =>
        h(DataTable<Row>, {
          ...base,
          forceMobile: mobile,
          features: [
            exportCsv(),
            groupingPanel<Row>(["team"], {
              groupAggregates: aggregate<Row>({ amount: "sum" }),
            }),
            sidePanel({
              open: opened,
              onOpenChange: change,
              panels: [
                { key: "one", label: "First", content: "First content" },
                { key: "two", label: "Second", content: "Second content" },
              ],
            }),
          ],
        })
      );
      await tick();
      expect(
        node(view.root, part("export-csv-button")).classList.contains(
          "el-button"
        )
      ).toBe(true);
      expect(
        node(view.root, part("grouping-panel")).classList.contains("el-card")
      ).toBe(true);
      expect(
        node(view.root, part("grouping-chip")).classList.contains("el-tag")
      ).toBe(true);
      await choose(view.root, "grouping-aggregation-operation", "Average");
      expect(
        node(view.root, part("grouping-aggregation-operation")).textContent
      ).toContain("Average");
      node<HTMLButtonElement>(
        view.root,
        part("grouping-aggregations-restore")
      ).click();
      await tick();
      expect(
        node(view.root, part("grouping-aggregation-operation")).textContent
      ).toContain("Sum");
      node<HTMLButtonElement>(
        view.root,
        part("grouping-aggregation-remove")
      ).click();
      await tick();
      expect(
        view.root.querySelector(part("grouping-aggregation-operation"))
      ).toBeNull();
      const checkbox = node<HTMLInputElement>(
        view.root,
        `${part("grouping-aggregation-option")} input`
      );
      expect(document.activeElement).toBe(checkbox);
      checkbox.click();
      await tick();
      expect(checkbox.checked).toBe(true);
      const tabs = [
        ...view.root.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ];
      expect(tabs).toHaveLength(2);
      tabs[1]!.click();
      await tick();
      expect(change).toHaveBeenLastCalledWith("two");
      expect(node(view.root, part("side-panel-body")).textContent).toContain(
        "Second content"
      );
      node<HTMLButtonElement>(view.root, part("side-panel-close")).click();
      await tick();
      expect(change).toHaveBeenLastCalledWith(null);
    }
  );
  it("owns command filtering and disabled activation through the shared model", async () => {
    const selected = vi.fn();
    const disabled = vi.fn();
    const features = [
      commandPalette({
        button: true,
        commands: [
          {
            key: "blocked",
            label: "Blocked",
            disabled: true,
            onSelect: disabled,
          },
          { key: "inspect", label: "Inspect", onSelect: selected },
        ],
      }),
    ];
    const view = mount(() => h(DataTable<Row>, { ...base, features }));
    await tick();
    const trigger = node<HTMLButtonElement>(
      view.root,
      part("command-palette-button")
    );
    trigger.focus();
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(
      document.body,
      `input${part("command-input")}`
    );
    expect(input.closest(".el-input")).not.toBeNull();
    expect(input.closest('[role="dialog"]')).not.toBeNull();
    await write(input, "Inspect");
    expect(document.querySelectorAll(part("command-item"))).toHaveLength(1);
    await key(input, "Enter");
    expect(selected).toHaveBeenCalledTimes(1);
    expect(disabled).not.toHaveBeenCalled();
    expect(document.querySelector(part("command-palette"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("keeps the command surface open when a controlled close is rejected", async () => {
    const close = vi.fn();
    const open = ref(true);
    const slots = elementPaletteSlots();
    mount(() =>
      h(CommandPaletteChrome, {
        open: open.value,
        commands: [],
        onClose: close,
        slots,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(
      document.body,
      `input${part("command-input")}`
    );
    await key(input, "Escape");
    expect(close).toHaveBeenCalledTimes(1);
    expect(input.isConnected).toBe(true);
    open.value = false;
    await tick();
    expect(document.querySelector(part("command-palette"))).toBeNull();
  });
  it("renders the native context menu, skips disabled items and selects once", async () => {
    const selected = vi.fn();
    const disabled = vi.fn();
    const view = mount(() =>
      h(DataTable<Row>, {
        ...base,
        dir: "rtl",
        features: [
          contextMenu<Row>({
            items: () => [
              {
                key: "disabled",
                label: "Unavailable",
                disabled: true,
                onSelect: disabled,
              },
              { key: "inspect", label: "Inspect", onSelect: selected },
            ],
          }),
        ],
      })
    );
    await tick();
    node<HTMLElement>(view.root, part("cell")).dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      })
    );
    await tick();
    const menu = node<HTMLElement>(document.body, part("context-menu"));
    expect(menu.classList.contains("el-dropdown-menu")).toBe(true);
    expect(menu.getAttribute("dir")).toBe("rtl");
    const item = [
      ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent?.trim() === "Inspect")!;
    item.click();
    await tick();
    expect(selected).toHaveBeenCalledTimes(1);
    expect(disabled).not.toHaveBeenCalled();
    expect(document.querySelector(part("context-menu"))).toBeNull();
  });
  it("uses real saved-view controls and keeps read-only view actions disabled", async () => {
    const applied = vi.fn();
    const renamed = vi.fn();
    const removed = vi.fn();
    const view = mount(() =>
      h(SavedViewsPanel, {
        views: [
          { name: "First", search: "" },
          { name: "Team", search: "", readOnly: true },
        ],
        onApply: applied,
        onRename: renamed,
        onMove: vi.fn(),
        onSetDefault: vi.fn(),
        onRemove: removed,
      })
    );
    await tick();
    const first = node<HTMLElement>(view.root, part("saved-view-row"));
    node<HTMLButtonElement>(first, 'button[title="Rename view"]').click();
    await tick();
    const input = node<HTMLInputElement>(first, "input");
    await write(input, "Renamed");
    await key(input, "Enter");
    expect(renamed).toHaveBeenCalledExactlyOnceWith("First", "Renamed");
    const readonly = [
      ...view.root.querySelectorAll<HTMLElement>(part("saved-view-row")),
    ][1]!;
    expect(
      [...readonly.querySelectorAll<HTMLButtonElement>("button:disabled")]
        .length
    ).toBeGreaterThan(0);
    expect(removed).not.toHaveBeenCalled();
  });
  it("saved-view popover uses the supplied fullscreen container and returns to the visible trigger", async () => {
    const container = document.createElement("section");
    document.body.append(container);
    const model = {
      views: computed(() => [{ name: "First", search: "" }]),
      defaultView: computed(() => undefined),
      save: vi.fn(),
      apply: vi.fn(),
      remove: vi.fn(),
      rename: vi.fn(),
      move: vi.fn(),
      setDefault: vi.fn(),
      reload: vi.fn(),
    };
    const view = mount(() =>
      h(SavedViewsMenuChrome, {
        savedViews: model,
        labels: resolveLabels(undefined),
        dir: "rtl",
        container,
        slots: elementSavedViewsMenuSlots,
      })
    );
    await tick();
    const trigger = node<HTMLButtonElement>(view.root, part("views-button"));
    trigger.focus();
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(
      container,
      `input${part("views-input")}`
    );
    expect(trigger.getAttribute("aria-controls")).toBe(
      node(container, part("views-panel")).id
    );
    await write(input, "New");
    await key(input, "Enter");
    expect(model.save).toHaveBeenCalledExactlyOnceWith("New");
    await key(input, "Escape");
    expect(container.querySelector(part("views-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
    view.unmount();
    container.remove();
  });
  it("sends desktop and mobile reorder requests without mutating host order", async () => {
    const changed = vi.fn();
    const mobile = ref(false);
    const features = [rowReorder<Row>(changed)];
    const view = mount(() =>
      h(DataTable<Row>, { ...base, forceMobile: mobile.value, features })
    );
    await tick();
    const grip = node<HTMLButtonElement>(view.root, part("row-reorder-handle"));
    expect(grip.classList.contains("el-button")).toBe(true);
    grip.focus();
    for (const value of [" ", "ArrowDown", " "]) await key(grip, value);
    expect(changed).toHaveBeenCalledExactlyOnceWith(0, 1, rows[0]);
    expect(
      [...view.root.querySelectorAll("tbody [data-row-id]")].map((row) =>
        row.getAttribute("data-row-id")
      )
    ).toEqual(["a", "b", "c"]);
    mobile.value = true;
    await tick();
    expect(
      node<HTMLButtonElement>(view.root, part("row-reorder-up")).disabled
    ).toBe(true);
    node<HTMLButtonElement>(view.root, part("row-reorder-down")).click();
    await tick();
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])(
    "confirms a cross-group move through ElDialog mobile=%s",
    async (mobile) => {
      const moved = vi.fn();
      const features = [
        grouping<Row>("team"),
        rowReorder<Row>(() => undefined, {
          movePolicy: "confirm",
          onGroupMove: moved,
        }),
      ];
      const view = mount(() =>
        h(DataTable<Row>, { ...base, forceMobile: mobile, features })
      );
      await tick();
      const row = node<HTMLElement>(view.root, '[data-row-id="a"]');
      await choose(row, "row-move-menu-trigger", "Ops");
      const modal = node<HTMLElement>(
        document.body,
        part("row-move-confirmation")
      );
      expect(modal.closest(".el-dialog")).not.toBeNull();
      expect(
        node(modal, part("row-move-cancel")).textContent?.trim()
      ).toBeTruthy();
      const confirm = node<HTMLButtonElement>(modal, part("row-move-confirm"));
      expect(confirm.textContent?.trim()).toBe("Move");
      confirm.click();
      await tick();
      expect(moved).toHaveBeenCalledTimes(1);
    }
  );
});
