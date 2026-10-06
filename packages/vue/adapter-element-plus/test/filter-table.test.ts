import type { TableSource } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, ref, shallowRef } from "vue";

import DataTable from "../src/DataTable.vue";
import { filters, FilterTreeBuilder } from "../src/filters";
import { mount, node } from "./mount";
import FilterConsumer from "./types/FilterConsumer.vue";

interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
const base = {
  data,
  columns: [{ key: "name", header: "Name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  forceMobile: false,
};
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
async function write(element: HTMLInputElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
async function open(root: ParentNode) {
  const button = node<HTMLButtonElement>(
    root,
    'button[data-adapttable-part="filters-button"]'
  );
  button.focus();
  button.click();
  await tick();
  return button;
}

describe("Element Plus table filters", () => {
  for (const defaultExpanded of [undefined, false]) {
    it(`preserves ${String(defaultExpanded)} expansion when a host tree already exists`, async () => {
      const { root } = mount(() =>
        h(FilterTreeBuilder<Row>, {
          defs: [{ key: "name", type: "text" }],
          source: {
            filterTree: { combinator: "and", conditions: [] },
            setFilterTree: () => undefined,
          },
          defaultExpanded,
        })
      );
      await tick();
      const tree = node(root, '[data-adapttable-part="filter-tree"]');
      expect(
        node(tree, "[role=button][aria-expanded]").getAttribute("aria-expanded")
      ).toBe(defaultExpanded === false ? "false" : "true");
    });
  }

  it("honors the bare Boolean expansion prop from a real SFC consumer", async () => {
    const { root } = mount(() => h(FilterConsumer));
    await tick();
    const tree = node(root, '[data-adapttable-part="filter-tree"]');
    expect(
      node(tree, "[role=button][aria-expanded]").getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("filters prepared rows through the binding and clears chips with kit controls", async () => {
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        dir: "rtl",
        features: [filters<Row>([{ key: "name", type: "text" }])],
      })
    );
    await tick();
    const trigger = await open(root);
    expect(trigger.classList.contains("el-button")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const panel = node<HTMLElement>(
      document,
      '[data-adapttable-part="filters-popover"]'
    );
    expect(panel.getAttribute("dir")).toBe("rtl");
    const input = node<HTMLInputElement>(
      panel,
      'input[data-adapttable-part="filter-input"]'
    );
    await write(input, "Ada");
    await vi.waitFor(() =>
      expect(root.querySelectorAll("tbody tr")).toHaveLength(1)
    );
    expect(node(root, "tbody").textContent).toContain("Ada");
    expect(node(root, "tbody").textContent).not.toContain("Grace");
    const remove = node<HTMLButtonElement>(
      root,
      'button[data-adapttable-part="chip-remove"]'
    );
    expect(remove.classList.contains("el-button")).toBe(true);
    remove.click();
    await tick();
    expect(root.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(input.value).toBe("");
  });

  it("closes a real drawer from Done and restores its trigger", async () => {
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          filters<Row>([{ key: "name", type: "text" }], { mode: "drawer" }),
        ],
      })
    );
    await tick();
    const trigger = await open(root);
    const panel = node<HTMLElement>(
      document,
      '[data-adapttable-part="filters-panel"]'
    );
    const done = node<HTMLButtonElement>(
      panel,
      'button[data-adapttable-part="filters-done"]'
    );
    expect(done.classList.contains("el-button")).toBe(true);
    done.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await vi.waitFor(() =>
      expect(panel.closest<HTMLElement>(".el-overlay")?.style.display).toBe(
        "none"
      )
    );
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("removes its real portal when the feature is disabled", async () => {
    const enabled = ref(true);
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: enabled.value
          ? [filters<Row>([{ key: "name", type: "text" }])]
          : [],
      })
    );
    await tick();
    await open(root);
    expect(
      document.querySelector('[data-adapttable-part="filters-popover"]')
    ).not.toBeNull();
    enabled.value = false;
    await tick();
    expect(
      document.querySelector('[data-adapttable-part="filters-popover"]')
    ).toBeNull();
    expect(
      root.querySelector('[data-adapttable-part="filters-button"]')
    ).toBeNull();
  });

  it("renders recursive tree actions using kit controls and the host-owned source", async () => {
    type Tree = Parameters<NonNullable<TableSource<Row>["setFilterTree"]>>[0];
    const tree = shallowRef<Tree>();
    const update = vi.fn((next: Tree) => {
      tree.value = next;
    });
    const { root } = mount(() =>
      h(FilterTreeBuilder<Row>, {
        defs: [{ key: "name", type: "text" }],
        source: { filterTree: tree.value, setFilterTree: update },
        defaultExpanded: true,
      })
    );
    await tick();
    expect(
      node(root, '[data-adapttable-part="filter-tree"]').classList.contains(
        "el-collapse"
      )
    ).toBe(true);
    const add = node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="filter-tree-actions"] button'
    );
    expect(add.classList.contains("el-button")).toBe(true);
    add.click();
    await tick();
    expect(
      root.querySelectorAll('[data-adapttable-part="filter-tree-condition"]')
    ).toHaveLength(1);
    const control = node<HTMLInputElement>(
      root,
      'input[data-adapttable-part="filter-input"]'
    );
    await write(control, "Ada");
    expect(JSON.stringify(tree.value)).toContain("Ada");
    expect(update).toHaveBeenCalledTimes(2);
  });
});
