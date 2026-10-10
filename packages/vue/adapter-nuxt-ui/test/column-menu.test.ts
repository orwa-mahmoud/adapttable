import type {
  ColumnDef,
  ColumnLayoutState,
  TableFeature,
} from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { columnMenu } from "../src/column-menu";

interface Row {
  id: string;
  name: string;
  team: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada", team: "Core" }];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", renameable: true },
  { key: "team", header: "Team" },
];
const labels = resolveLabels(undefined);
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
const stops: (() => void)[] = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await settle();
});
function find<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}
async function click(selector: string) {
  find(selector).click();
  await settle();
}
function key(node: HTMLElement, key: string) {
  node.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}
function fixture(
  controlled = false,
  extraFeatures: readonly TableFeature<Row>[] = []
) {
  const root = document.createElement("div");
  document.body.append(root);
  const dir = shallowRef<"ltr" | "rtl">("ltr");
  const request = vi.fn();
  const rename = vi.fn();
  const layout: ColumnLayoutState = {
    hidden: [],
    order: [],
    pinned: {},
    widths: {},
  };
  const features = [columnMenu(), ...extraFeatures];
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: rows,
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        searchable: false,
        features,
        dir: dir.value,
        columnLayout: controlled ? layout : undefined,
        "onUpdate:columnLayout": request,
        onColumnRename: rename,
      }),
  }).use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, dir, request, layout, rename };
}
async function open() {
  await settle();
  const trigger = find<HTMLButtonElement>(part("column-menu-button"));
  trigger.focus();
  trigger.click();
  await settle();
  return trigger;
}

describe("Nuxt column menu and rename", () => {
  it("lets the existing trigger close its menu after pointer focus and preserves outside focus", async () => {
    fixture();
    const trigger = await open();
    trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    trigger.focus();
    await settle();
    expect(document.querySelector(part("column-menu-panel"))).not.toBeNull();
    trigger.click();
    await settle();
    expect(document.querySelector(part("column-menu-panel"))).toBeNull();
    trigger.click();
    await settle();
    const outside = document.createElement("button");
    document.body.append(outside);
    try {
      outside.focus();
      await settle();
      expect(document.querySelector(part("column-menu-panel"))).toBeNull();
      expect(document.activeElement).toBe(outside);
    } finally {
      outside.remove();
    }
  });
  it("pins, filters and renames through the shared layout while keeping semantic targets and live RTL", async () => {
    const view = fixture();
    const trigger = await open();
    const panel = find(part("column-menu-panel"));
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.id).toBe(trigger.getAttribute("aria-controls"));
    const search = find<HTMLInputElement>(part("column-menu-search"));
    expect(document.activeElement).toBe(search);
    view.dir.value = "rtl";
    await settle();
    expect(panel.getAttribute("dir")).toBe("rtl");
    await click(`${part("column-menu-item")} ${part("column-menu-pin")}`);
    expect(view.request).toHaveBeenCalledTimes(1);
    expect(
      find<HTMLTableCellElement>('th[data-column-key="name"]').style.position
    ).toBe("sticky");
    await click(`${part("column-menu-item")} ${part("column-menu-more")}`);
    const rename = Array.from(
      panel.querySelectorAll<HTMLButtonElement>(part("column-menu-action"))
    ).find(
      (button) => button.getAttribute("aria-label") === labels.renameColumn
    );
    expect(rename).toBeDefined();
    rename?.click();
    await settle();
    const input = find<HTMLInputElement>(part("column-rename-input"));
    expect(document.activeElement).toBe(input);
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    await click(part("column-rename-save"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(find(part("column-rename-error")).textContent).toBe(
      labels.columnNameRequired
    );
    input.value = "Person";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    await click(part("column-rename-save"));
    expect(view.request.mock.calls.at(-1)?.[0]).toMatchObject({
      names: { name: "Person" },
    });
    expect(find('th[data-column-key="name"]').textContent).toContain("Person");
    expect(view.rename).toHaveBeenCalledExactlyOnceWith("name", "Person");
    expect(columns[0]?.header).toBe("Name");
    search.value = "Team";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(panel.querySelectorAll(part("column-menu-item"))).toHaveLength(1);
    key(search, "Escape");
    await settle();
    expect(document.querySelector(part("column-menu-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("requests a controlled layout change once and preserves rejected paint", async () => {
    const view = fixture(true);
    await open();
    await click(
      `${part("column-menu-item")} ${part("column-menu-visibility")}`
    );
    expect(view.request).toHaveBeenCalledTimes(1);
    expect(view.layout.hidden).toEqual([]);
    expect(document.querySelector('th[data-column-key="name"]')).not.toBeNull();
    expect(
      find(part("column-menu-visibility")).getAttribute("aria-pressed")
    ).toBe("true");
  });
  it("closes nested choice, row submenu and outer panel one Escape at a time", async () => {
    const change = vi.fn();
    const choice: TableFeature<Row> = {
      id: "test-choice",
      setup(host) {
        host.registerColumnMenuAction(() => ({
          kind: "choice",
          id: "mode",
          label: "Mode",
          disabled: false,
          value: "a",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
          onChange: change,
        }));
      },
    };
    fixture(false, [choice]);
    const trigger = await open();
    await click(`${part("column-menu-item")} ${part("column-menu-more")}`);
    const more = find<HTMLButtonElement>(part("column-menu-more"));
    const select = find<HTMLButtonElement>(part("column-menu-choice-select"));
    select.focus();
    key(select, "ArrowDown");
    await settle();
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    key(find('[role="listbox"]'), "Escape");
    await settle();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.querySelector(part("column-menu-submenu"))).not.toBeNull();
    expect(document.querySelector(part("column-menu-panel"))).not.toBeNull();
    key(select, "Escape");
    await settle();
    expect(document.querySelector(part("column-menu-submenu"))).toBeNull();
    expect(document.activeElement).toBe(more);
    key(more, "Escape");
    await settle();
    expect(document.querySelector(part("column-menu-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(change).not.toHaveBeenCalled();
  });
});
