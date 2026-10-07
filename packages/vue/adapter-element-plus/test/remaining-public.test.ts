import { expect, it, vi } from "vitest";
import { h, nextTick, ref } from "vue";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { exportCsv } from "../src/export";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { savedViews } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
  team: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Grace", team: "Ops" },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
}
async function input(target: HTMLInputElement, value: string) {
  target.value = value;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
it.each([false, true])(
  "composes seven canonical entries and activates genuine public controls, mobile=%s",
  async (mobile) => {
    const selected = vi.fn();
    const menuSelected = vi.fn();
    const open = ref<string | null>("one");
    const features = [
      commandPalette({
        button: true,
        commands: [
          { key: "inspect", label: "Inspect table", onSelect: selected },
        ],
      }),
      contextMenu<Row>({
        items: () => [
          { key: "inspect", label: "Inspect row", onSelect: menuSelected },
        ],
      }),
      exportCsv<Row>(),
      groupingPanel<Row>(),
      rowReorder<Row>(() => undefined),
      savedViews({
        storage: null,
        storageKey: `public-${mobile}`,
        urlSync: false,
      }),
      sidePanel({
        open,
        onOpenChange: (key) => {
          open.value = key;
        },
        panels: [{ key: "one", label: "Details", content: "Panel content" }],
      }),
    ];
    const view = mount(() =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }, { key: "team", groupable: true }],
        rowKey: (row) => row.id,
        features,
        searchable: false,
        urlSync: false,
        forceMobile: mobile,
      })
    );
    await tick();
    expect(
      node(view.root, part("grouping-panel")).classList.contains("el-card")
    ).toBe(true);
    expect(
      node(view.root, part("export-csv-button")).classList.contains("el-button")
    ).toBe(true);
    node<HTMLButtonElement>(view.root, part("command-palette-button")).click();
    await tick();
    const command = node<HTMLInputElement>(
      document.body,
      `input${part("command-input")}`
    );
    await input(command, "Inspect table");
    await key(command, "Enter");
    expect(selected).toHaveBeenCalledTimes(1);
    node<HTMLButtonElement>(view.root, part("views-button")).click();
    await tick();
    const name = node<HTMLInputElement>(
      document.body,
      `input${part("views-input")}`
    );
    await input(name, "Named view");
    await key(name, "Enter");
    expect(node(document.body, part("views-item")).textContent).toContain(
      "Named view"
    );
    await key(name, "Escape");
    node<HTMLButtonElement>(view.root, part("side-panel-close")).click();
    await tick();
    expect(open.value).toBeNull();
    if (!mobile) {
      const cell = node<HTMLElement>(view.root, part("cell"));
      cell.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 20,
          clientY: 20,
        })
      );
      await tick();
      const item = [
        ...document.querySelectorAll<HTMLElement>(part("context-menu-item")),
      ].find((item) => item.textContent?.trim() === "Inspect row")!;
      item.click();
      await tick();
      expect(menuSelected).toHaveBeenCalledTimes(1);
    }
  }
);
