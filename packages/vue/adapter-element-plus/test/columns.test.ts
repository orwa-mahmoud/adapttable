import type { ColumnLayoutState } from "@adapttable/vue";
import type { DataTableProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import {
  collapsibleColumnGroups,
  fitColumns,
  multiSort,
  resizableColumns,
} from "../src/columns";
import DataTable from "../src/DataTable.vue";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
  age: number;
}
const rows: Row[] = [
  { id: "b", name: "Ada", age: 30 },
  { id: "a", name: "Ada", age: 20 },
  { id: "c", name: "Bea", age: 40 },
];
const layout: ColumnLayoutState = {
  hidden: [],
  order: [],
  widths: { name: 120, age: 80 },
  pinned: {},
  collapsedGroups: [],
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function fixture(extra: Partial<DataTableProps<Row>>) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [
      { key: "name", sortable: true },
      { key: "age", sortable: true },
    ],
    rowKey: (row) => row.id,
    searchable: false,
    forceMobile: false,
    urlSync: false,
    ...extra,
  });
  const change = vi.fn<(value: ColumnLayoutState) => void>();
  return {
    ...mount(() =>
      h(DataTable<Row>, { ...props.value, "onUpdate:columnLayout": change })
    ),
    props,
    change,
  };
}
describe("Element Plus column controls", () => {
  for (const dir of ["ltr", "rtl"] as const) {
    it(`forwards native resize keys while controlled widths reject or accept requests, dir=${dir}`, async () => {
      const view = fixture({
        dir,
        columnLayout: layout,
        features: [resizableColumns()],
        classNames: { resizeHandle: "host-resize" },
      });
      await tick();
      const handle = node<HTMLButtonElement>(view.root, part("resize-handle"));
      expect(handle.tagName).toBe("BUTTON");
      expect(handle.classList.contains("el-button")).toBe(true);
      expect(handle.classList.contains("host-resize")).toBe(true);
      expect(handle.tabIndex).toBe(0);
      const heading = node<HTMLElement>(
        view.root,
        'th[data-column-key="name"]'
      );
      // JSDOM has no layout; only the browser measurement is supplied here.
      vi.spyOn(heading, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 120, 32)
      );
      const before = heading.style.width;
      handle.focus();
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
          bubbles: true,
          cancelable: true,
        })
      );
      await tick();
      expect(view.change).toHaveBeenCalledTimes(1);
      const requested = view.change.mock.calls[0]?.[0];
      if (!requested) throw new Error("Missing resize request");
      expect(requested.widths.name).toBe(136);
      expect(heading.style.width).toBe(before);
      view.props.value = { ...view.props.value, columnLayout: requested };
      await tick();
      expect(node(view.root, part("resize-handle"))).toBe(handle);
      expect(document.activeElement).toBe(handle);
      expect(heading.style.width).toBe(`${requested.widths.name}px`);
      expect(view.change).toHaveBeenCalledTimes(1);
      view.props.value = { ...view.props.value, features: [] };
      await tick();
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(view.change).toHaveBeenCalledTimes(1);
    });
  }
  it("keeps the genuine group toggle and native spans stable across controlled collapse", async () => {
    const view = fixture({
      columns: [
        {
          header: "Person",
          collapsedKey: "name",
          children: [{ key: "name" }, { key: "age" }],
        },
      ],
      columnLayout: layout,
      features: [collapsibleColumnGroups()],
      classNames: { columnGroupToggle: "host-group" },
    });
    await tick();
    const toggle = node<HTMLButtonElement>(
      view.root,
      part("column-group-toggle")
    );
    expect(toggle.classList.contains("el-button")).toBe(true);
    expect(toggle.classList.contains("host-group")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.focus();
    toggle.click();
    await tick();
    expect(view.change).toHaveBeenCalledTimes(1);
    expect(view.change.mock.calls[0]?.[0].collapsedGroups).toEqual(["Person"]);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    view.props.value = {
      ...view.props.value,
      columnLayout: { ...layout, collapsedGroups: ["Person"] },
    };
    await tick();
    expect(node(view.root, part("column-group-toggle"))).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      view.root.querySelectorAll('tbody [data-row-id="a"] td')
    ).toHaveLength(1);
    view.props.value = { ...view.props.value, columnLayout: layout };
    await tick();
    expect(node(view.root, part("column-group-toggle"))).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(
      view.root.querySelectorAll('tbody [data-row-id="a"] td')
    ).toHaveLength(2);
    expect(view.change).toHaveBeenCalledTimes(1);
  });
  it("uses the binding's compound sort and fit-width model with real sort buttons", async () => {
    const view = fixture({
      features: [multiSort(), fitColumns()],
      classNames: { sortIndex: "host-rank" },
    });
    await tick();
    const buttons = view.root.querySelectorAll<HTMLButtonElement>(
      part("sort-button")
    );
    expect(buttons).toHaveLength(2);
    expect(
      [...buttons].every((button) => button.classList.contains("el-button"))
    ).toBe(true);
    buttons[0]!.click();
    buttons[1]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true })
    );
    await tick();
    expect(
      [...view.root.querySelectorAll(part("sort-index"))].map(
        (element) => element.textContent
      )
    ).toEqual(["1", "2"]);
    expect(
      [...view.root.querySelectorAll("[data-row-id]")].map((element) =>
        element.getAttribute("data-row-id")
      )
    ).toEqual(["a", "b", "c"]);
    expect(node<HTMLElement>(view.root, "table").style.width).toBe("100%");
    expect(
      node(view.root, part("sort-index")).classList.contains("host-rank")
    ).toBe(true);
  });
  it("projects accepted group layout to cards without desktop-only controls", async () => {
    const view = fixture({
      forceMobile: true,
      columns: [
        {
          header: "Person",
          collapsedKey: "name",
          children: [{ key: "name" }, { key: "age" }],
        },
      ],
      columnLayout: { ...layout, collapsedGroups: ["Person"] },
      features: [collapsibleColumnGroups(), resizableColumns()],
    });
    await tick();
    expect(view.root.querySelector("table")).toBeNull();
    expect(view.root.querySelector(part("column-group-toggle"))).toBeNull();
    expect(view.root.querySelector(part("resize-handle"))).toBeNull();
    expect(
      node(view.root, '[data-row-id="a"]').querySelectorAll("dd")
    ).toHaveLength(1);
    view.props.value = { ...view.props.value, columnLayout: layout };
    await tick();
    expect(
      node(view.root, '[data-row-id="a"]').querySelectorAll("dd")
    ).toHaveLength(2);
    expect(view.change).not.toHaveBeenCalled();
  });
});
