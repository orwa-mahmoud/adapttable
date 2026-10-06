import type { ColumnDef } from "@adapttable/vue";
import * as binding from "@adapttable/vue";
import type { DataTableProps } from "@adapttable/vue/adapter";
import * as features from "@adapttable/vue/features";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import DataTable from "../src/DataTable.vue";
import { grouping } from "../src/grouping";
import { nestedTable, rowDetail, useRowExpansion } from "../src/row-detail";
import { tree, useLazyChildren, useTreeExpansion } from "../src/tree";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
  team: string;
  score: number;
  parent?: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core", score: 10 },
  { id: "b", name: "Bea", team: "Core", score: 20, parent: "a" },
  { id: "c", name: "Cal", team: "Design", score: 30 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name" },
  { key: "team" },
  { key: "score" },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  urlSync: false,
  forceMobile: false,
  searchable: false,
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function fixture(
  extra: Partial<DataTableProps<Row>>,
  events: Record<string, unknown> = {}
) {
  const props = shallowRef<DataTableProps<Row>>({ ...base, ...extra });
  return {
    ...mount(() => h(DataTable<Row>, { ...props.value, ...events })),
    props,
  };
}

describe("Element Plus hierarchy features", () => {
  it("preserves the binding identities of headless tree and detail contributions", () => {
    expect(tree).toBe(features.tree);
    expect(rowDetail).toBe(features.rowDetail);
    expect(nestedTable).toBe(features.nestedTable);
    expect(useLazyChildren).toBe(binding.useLazyChildren);
    expect(useTreeExpansion).toBe(binding.useTreeExpansion);
    expect(useRowExpansion).toBe(binding.useRowExpansion);
  });

  for (const mobile of [false, true]) {
    it(`uses real group controls and aligned subtotals with raw host rows, mobile=${mobile}`, async () => {
      const aggregates = vi.fn((members: readonly Row[]) => ({
        score: members.reduce((sum, row) => sum + row.score, 0),
      }));
      const view = fixture({
        forceMobile: mobile,
        selectable: true,
        features: [
          grouping<Row>("team", {
            groupFooters: true,
            groupRowPageSize: 1,
            groupAggregates: aggregates,
          }),
        ],
        classNames: {
          groupRow: "host-group",
          groupToggle: "host-toggle",
          groupCheckbox: "host-checkbox",
          groupMore: "host-more",
          groupAggregate: "host-aggregate",
        },
      });
      await tick();
      expect(view.root.textContent).toContain("Core");
      expect(view.root.textContent).not.toContain("Bea");
      const more = node<HTMLButtonElement>(view.root, part("group-more"));
      expect(more.classList.contains("el-button")).toBe(true);
      expect(more.classList.contains("host-more")).toBe(true);
      more.click();
      await tick();
      expect(view.root.textContent).toContain("Bea");
      const toggle = node<HTMLButtonElement>(view.root, part("group-toggle"));
      expect(toggle.classList.contains("el-button")).toBe(true);
      expect(toggle.classList.contains("host-toggle")).toBe(true);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      toggle.click();
      await tick();
      expect(view.root.textContent).not.toContain("Ada");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      toggle.click();
      await tick();
      expect(view.root.textContent).toContain("Ada");
      const selection = node<HTMLLabelElement>(view.root, part("group-select"));
      expect(selection.tagName).toBe("LABEL");
      expect(selection.classList.contains("el-checkbox")).toBe(true);
      expect(selection.classList.contains("host-checkbox")).toBe(true);
      expect(selection.control).toBe(node(selection, "input"));
      expect(
        node(view.root, part("group-aggregate")).classList.contains(
          "host-aggregate"
        )
      ).toBe(true);
      expect(aggregates).toHaveBeenCalled();
      for (const [members] of aggregates.mock.calls)
        for (const row of members) expect(rows.includes(row)).toBe(true);
      if (mobile)
        expect(node(view.root, part("group-card")).getAttribute("role")).toBe(
          "listitem"
        );
      else expect(node(view.root, part("group-row")).tagName).toBe("TR");
    });

    it(`keeps mixed group selection authoritative on rejection and accepted updates, mobile=${mobile}`, async () => {
      const update = vi.fn();
      const view = fixture(
        {
          forceMobile: mobile,
          selectable: true,
          selectedIds: ["a"],
          features: [grouping("team")],
        },
        { "onUpdate:selectedIds": update }
      );
      await tick();
      const host = node<HTMLLabelElement>(view.root, part("group-select"));
      const input = node<HTMLInputElement>(host, "input");
      expect(input.indeterminate).toBe(true);
      input.click();
      await tick();
      input.click();
      await tick();
      expect(update.mock.calls).toEqual([[["a", "b"]], [["a", "b"]]]);
      expect(input.checked).toBe(false);
      expect(input.indeterminate).toBe(true);
      view.props.value = { ...view.props.value, selectedIds: ["a", "b"] };
      await tick();
      expect(input.checked).toBe(true);
      expect(input.indeterminate).toBe(false);
      expect(update).toHaveBeenCalledTimes(2);
    });

    it(`uses native kit tree/detail buttons and preserves row click isolation, mobile=${mobile}`, async () => {
      const click = vi.fn();
      const detail = vi.fn((row: Row) => h("aside", `Details for ${row.name}`));
      const view = fixture(
        {
          forceMobile: mobile,
          features: [
            tree<Row>({ getParentId: (row) => row.parent }),
            rowDetail<Row>(detail),
          ],
          classNames: { treeToggle: "host-tree", expandToggle: "host-detail" },
        },
        { onClick: click }
      );
      await tick();
      expect(view.root.textContent).not.toContain("Bea");
      const toggle = node<HTMLButtonElement>(view.root, part("tree-toggle"));
      expect(toggle.classList.contains("el-button")).toBe(true);
      expect(toggle.classList.contains("host-tree")).toBe(true);
      expect(toggle.getAttribute("aria-label")).toBeTruthy();
      toggle.click();
      await tick();
      expect(view.root.textContent).toContain("Bea");
      const expand = node<HTMLButtonElement>(view.root, part("expand-button"));
      expect(expand.classList.contains("el-button")).toBe(true);
      expect(expand.classList.contains("host-detail")).toBe(true);
      expand.click();
      await tick();
      expect(view.root.textContent).toContain("Details for Ada");
      expect(detail.mock.calls[0]?.[0]).toBe(rows[0]);
      expect(click).not.toHaveBeenCalled();
      node<HTMLButtonElement>(view.root, part("expand-button")).click();
      await tick();
      expect(view.root.textContent).not.toContain("Details for Ada");
    });
  }

  for (const dir of ["ltr", "rtl"] as const) {
    it(`forwards the binding's ${dir} tree keyboard expansion`, async () => {
      const { root } = fixture({
        dir,
        features: [tree<Row>({ getParentId: (row) => row.parent })],
      });
      await tick();
      const toggle = node<HTMLButtonElement>(root, part("tree-toggle"));
      const open = new KeyboardEvent("keydown", {
        key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      toggle.dispatchEvent(open);
      await tick();
      expect(open.defaultPrevented).toBe(true);
      expect(root.textContent).toContain("Bea");
      toggle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: dir === "rtl" ? "ArrowRight" : "ArrowLeft",
          bubbles: true,
        })
      );
      await tick();
      expect(root.textContent).not.toContain("Bea");
    });
  }

  it("reflects lazy loading and disables retained controls after feature removal", async () => {
    let finish: (() => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const view = fixture({
      features: [
        tree<Row>({
          getChildren: () => undefined,
          hasChildren: () => true,
          onLoadChildren: load,
        }),
      ],
    });
    await tick();
    const toggle = node<HTMLButtonElement>(view.root, part("tree-toggle"));
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-busy")).toBe("true");
    expect(toggle.textContent).toContain("…");
    expect(load).toHaveBeenCalledTimes(1);
    finish?.();
    await tick();
    expect(toggle.hasAttribute("aria-busy")).toBe(false);
    view.props.value = { ...view.props.value, features: [] };
    await tick();
    toggle.click();
    await tick();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps tree and detail expansion controlled without replacing feature identities", async () => {
    const treeIds = shallowRef<readonly string[]>([]);
    const detailIds = shallowRef<readonly string[]>([]);
    const treeChange = vi.fn();
    const detailChange = vi.fn();
    const { root } = fixture({
      features: [
        tree<Row>({
          getParentId: (row) => row.parent,
          expandedIds: treeIds,
          onExpandedIdsChange: treeChange,
        }),
        rowDetail<Row>((row) => h("p", `Details for ${row.name}`), undefined, {
          expandedRowIds: detailIds,
          onExpandedRowIdsChange: detailChange,
        }),
      ],
    });
    await tick();
    node<HTMLButtonElement>(root, part("tree-toggle")).click();
    node<HTMLButtonElement>(root, part("expand-button")).click();
    await tick();
    expect(treeChange).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(detailChange).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(root.textContent).not.toContain("Bea");
    expect(root.textContent).not.toContain("Details for Ada");
    treeIds.value = ["a"];
    detailIds.value = ["a"];
    await tick();
    expect(root.textContent).toContain("Bea");
    expect(root.textContent).toContain("Details for Ada");
  });

  it("renders a same-kit child table and inherits its parent's density", async () => {
    const { root } = fixture({
      density: "compact",
      features: [
        nestedTable<Row>(
          (row) => ({
            table: (defaults) =>
              h(DataTable<Row>, {
                ...defaults,
                data: [
                  {
                    ...row,
                    id: `child-${row.id}`,
                    name: `Child of ${row.name}`,
                  },
                ],
                columns,
                rowKey: (child) => child.id,
                searchable: false,
                urlSync: false,
              }),
          }),
          ["a"]
        ),
      ],
    });
    await tick();
    expect(root.textContent).toContain("Child of Ada");
    expect(
      root.querySelectorAll(`${part("root")}[data-density="compact"]`)
    ).toHaveLength(2);
    expect(
      root.querySelectorAll(".adapttable-element-plus-table.el-card")
    ).toHaveLength(2);
  });
  for (const mobile of [false, true]) {
    it(`retains the focused detail trigger while expanding and collapsing, mobile=${mobile}`, async () => {
      const { root } = fixture({
        forceMobile: mobile,
        features: [
          rowDetail<Row>((row) => h("aside", `Details for ${row.name}`)),
        ],
      });
      await tick();
      const trigger = node<HTMLButtonElement>(root, part("expand-button"));
      trigger.focus();
      trigger.click();
      await tick();
      expect(root.textContent).toContain("Details for Ada");
      expect(trigger.isConnected).toBe(true);
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await tick();
      expect(root.textContent).not.toContain("Details for Ada");
      expect(trigger.isConnected).toBe(true);
      expect(document.activeElement).toBe(trigger);
    });
  }
});
