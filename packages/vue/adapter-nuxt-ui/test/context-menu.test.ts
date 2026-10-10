import type { ColumnDef } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { contextMenu } from "../src/context-menu";
import { find, mountNuxt, part } from "./actions.helpers";

interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [{ id: "one", name: "Ada" }];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true, sortValue: (row) => row.name },
];
const labels = resolveLabels(undefined);
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await nextTick();
};
const key = (
  node: HTMLElement,
  value: string,
  options: KeyboardEventInit = {}
) =>
  node.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
function fixture() {
  const custom = vi.fn();
  const disabled = vi.fn();
  const active = shallowRef(true);
  const dir = shallowRef<"ltr" | "rtl">("ltr");
  const features = [
    contextMenu<Row>({
      items: () => [
        {
          key: "disabled",
          label: "Disabled action",
          disabled: true,
          onSelect: disabled,
        },
        {
          key: "custom",
          label: "Custom action",
          danger: true,
          separatorBefore: true,
          onSelect: custom,
        },
      ],
    }),
  ];
  mountNuxt(() =>
    h(KeepAlive, null, {
      default: () =>
        active.value
          ? h(DataTable<Row>, {
              data,
              columns,
              rowKey: (row) => row.id,
              features,
              dir: dir.value,
              urlSync: false,
              searchable: false,
              forceMobile: false,
              classNames: {
                contextMenu: "menu-class",
                contextMenuItem: "item-class",
                contextMenuSeparator: "separator-class",
              },
            })
          : h("div", "Away"),
    })
  );
  return { active, dir, custom, disabled };
}
async function open(selector: string) {
  await settle();
  const target = find(document, selector);
  target.dispatchEvent(
    new MouseEvent("contextmenu", {
      clientX: 30,
      clientY: 40,
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  return find(document, part("context-menu"));
}

describe("Nuxt context menu", () => {
  it("renders native menu items, handles header sort, classes and reactive direction", async () => {
    const view = fixture();
    const menu = await open('th[data-column-key="name"]');
    expect(menu.getAttribute("role")).toBe("menu");
    expect(menu.classList.contains("menu-class")).toBe(true);
    expect(
      find(menu, part("context-menu-item")).classList.contains("item-class")
    ).toBe(true);
    expect(
      find(menu, part("context-menu-separator")).classList.contains(
        "separator-class"
      )
    ).toBe(true);
    view.dir.value = "rtl";
    await settle();
    expect(menu.getAttribute("dir")).toBe("rtl");
    const sort = [
      ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent?.includes(labels.sortAscending));
    expect(sort).toBeDefined();
    sort?.click();
    await settle();
    expect(document.querySelector(part("context-menu"))).toBeNull();
    expect(
      find(document, 'th[data-column-key="name"]').getAttribute("aria-sort")
    ).toBe("ascending");
  });
  it("guards disabled actions and dispatches custom selection once after closing", async () => {
    const view = fixture();
    const menu = await open('td[data-column-key="name"]');
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const disabled = items.find((item) =>
      item.textContent?.includes("Disabled action")
    );
    const custom = items.find((item) =>
      item.textContent?.includes("Custom action")
    );
    expect(disabled?.getAttribute("aria-disabled")).toBe("true");
    disabled?.click();
    await settle();
    expect(view.disabled).not.toHaveBeenCalled();
    expect(document.querySelector(part("context-menu"))).not.toBeNull();
    expect(custom?.hasAttribute("data-danger")).toBe(true);
    custom?.click();
    await settle();
    expect(view.custom).toHaveBeenCalledOnce();
    expect(document.querySelector(part("context-menu"))).toBeNull();
  });
  it("supports keyboard opening/navigation/Escape and retires cached controls", async () => {
    const view = fixture();
    await settle();
    const cell = find(document, 'td[data-column-key="name"]');
    cell.tabIndex = 0;
    cell.focus();
    key(cell, "F10", { shiftKey: true });
    await settle();
    const menu = find(document, part("context-menu"));
    key(menu, "ArrowDown");
    await settle();
    expect(document.activeElement?.getAttribute("role")).toBe("menuitem");
    key(document.activeElement as HTMLElement, "Escape");
    await settle();
    expect(document.querySelector(part("context-menu"))).toBeNull();
    const next = await open('td[data-column-key="name"]');
    const old = [
      ...next.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent?.includes("Custom action"));
    view.active.value = false;
    await settle();
    expect(document.querySelector(part("context-menu"))).toBeNull();
    old?.click();
    await settle();
    expect(view.custom).not.toHaveBeenCalled();
  });
});

it("applies core typeahead and Tab traversal while retaining outside focus", async () => {
  const view = fixture();
  let menu = await open('td[data-column-key="name"]');
  const custom = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((item) => item.textContent === "Custom action");
  expect(custom).toBeDefined();
  key(menu, "End");
  await settle();
  expect(document.activeElement).toBe(custom);
  key(custom!, "Home");
  await settle();
  expect(document.activeElement?.textContent).toContain("Copy");
  key(menu, "c");
  await settle();
  expect(document.activeElement).toBe(custom);
  key(menu, "z");
  key(menu, "ArrowUp", { isComposing: true });
  await settle();
  expect(document.activeElement).toBe(custom);
  const tab = new KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true,
  });
  custom?.dispatchEvent(tab);
  await settle();
  expect(tab.defaultPrevented).toBe(false);
  expect(document.querySelector(part("context-menu"))).toBeNull();
  expect(view.custom).not.toHaveBeenCalled();
  menu = await open('td[data-column-key="name"]');
  const outside = document.createElement("button");
  document.body.append(outside);
  try {
    outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    outside.focus();
    await settle();
    expect(document.querySelector(part("context-menu"))).toBeNull();
    expect(document.activeElement).toBe(outside);
    expect(menu.isConnected).toBe(false);
  } finally {
    outside.remove();
  }
});
