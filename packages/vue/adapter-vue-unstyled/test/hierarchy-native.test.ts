import type { ColumnDef, DataTableHandle } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import { grouping } from "../src/grouping";
import { nestedTable, rowDetail } from "../src/row-detail";
import { tree } from "../src/tree";
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
const base = (): DataTableProps<Row> => ({
  data: rows,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
  searchable: false,
});
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));
function mount(
  extra: Partial<DataTableProps<Row>>,
  events: Record<string, unknown> = {}
) {
  const props = shallowRef<DataTableProps<Row>>({ ...base(), ...extra });
  const root = document.createElement("div");
  document.body.append(root);
  const handle = shallowRef<DataTableHandle<Row> | null>(null);
  const component = defineComponent({
    setup: () => () =>
      h(DataTable<Row>, { ...props.value, ...events, ref: handle }),
  });
  const app = createApp(component);
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, props, handle };
}
function node<T extends Element>(root: ParentNode, selector: string): T {
  const value = root.querySelector<T>(selector);
  if (!value) throw new Error(`Missing ${selector}`);
  return value;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function settle() {
  await nextTick();
  await nextTick();
}

describe("native hierarchy contributions", () => {
  it.each([false, true])(
    "toggles group paging/collapse and honors all group hooks, mobile=%s",
    async (mobile) => {
      const view = mount({
        forceMobile: mobile,
        selectable: true,
        features: [
          grouping<Row>("team", {
            groupFooters: true,
            groupRowPageSize: 1,
            groupAggregates: (data) => ({
              score: data.reduce((sum, row) => sum + row.score, 0),
            }),
          }),
        ],
        classNames: {
          groupRow: "group-row-hook",
          groupLabel: "group-label-hook",
          groupToggle: "group-toggle-hook",
          groupCount: "group-count-hook",
          groupCheckbox: "group-checkbox-hook",
          groupMore: "group-more-hook",
          groupAggregate: "group-aggregate-hook",
        },
      });
      await settle();
      expect(view.root.textContent).toContain("Core");
      const more = node<HTMLButtonElement>(view.root, part("group-more"));
      expect(more.classList.contains("group-more-hook")).toBe(true);
      expect(view.root.textContent).not.toContain("Bea");
      more.click();
      await settle();
      expect(view.root.textContent).toContain("Bea");
      const toggle = node<HTMLButtonElement>(view.root, part("group-toggle"));
      expect(toggle.classList.contains("group-toggle-hook")).toBe(true);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      toggle.click();
      await settle();
      expect(view.root.textContent).not.toContain("Ada");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      toggle.click();
      await settle();
      expect(view.root.textContent).toContain("Ada");
      expect(
        node(view.root, part("group-select")).classList.contains(
          "group-checkbox-hook"
        )
      ).toBe(true);
    }
  );

  it.each([false, true])(
    "restores mixed controlled group selection on rejection, mobile=%s",
    async (mobile) => {
      const update = vi.fn();
      const view = mount(
        {
          forceMobile: mobile,
          selectedIds: ["a"],
          features: [grouping("team")],
        },
        { "onUpdate:selectedIds": update }
      );
      await settle();
      const checkbox = node<HTMLInputElement>(view.root, part("group-select"));
      expect(checkbox.indeterminate).toBe(true);
      checkbox.click();
      await settle();
      checkbox.click();
      await settle();
      expect(update.mock.calls).toEqual([[["a", "b"]], [["a", "b"]]]);
      expect(checkbox.checked).toBe(false);
      expect(checkbox.indeterminate).toBe(true);
      view.props.value = { ...view.props.value, selectedIds: ["a", "b"] };
      await settle();
      expect(checkbox.checked).toBe(true);
      expect(checkbox.indeterminate).toBe(false);
    }
  );

  it.each([false, true])(
    "uses native tree/detail buttons, preserves event isolation and classes, mobile=%s",
    async (mobile) => {
      const click = vi.fn();
      const view = mount(
        {
          forceMobile: mobile,
          features: [
            tree<Row>({ getParentId: (row) => row.parent }),
            rowDetail<Row>((row) => h("aside", `Details for ${row.name}`)),
          ],
          classNames: {
            treeCell: "tree-cell-hook",
            treeToggle: "tree-toggle-hook",
            expandToggle: "detail-toggle-hook",
            detailCell: "detail-cell-hook",
            detailRow: "detail-row-hook",
          },
        },
        { onClick: click }
      );
      await settle();
      expect(view.root.textContent).not.toContain("Bea");
      const toggle = node<HTMLButtonElement>(view.root, part("tree-toggle"));
      expect(toggle.classList.contains("tree-toggle-hook")).toBe(true);
      expect(toggle.getAttribute("aria-label")).toBeTruthy();
      toggle.click();
      await settle();
      expect(view.root.textContent).toContain("Bea");
      node<HTMLButtonElement>(view.root, part("expand-button")).click();
      await settle();
      expect(view.root.textContent).toContain("Details for Ada");
      expect(click).not.toHaveBeenCalled();
      node<HTMLButtonElement>(view.root, part("expand-button")).click();
      await settle();
      expect(view.root.textContent).not.toContain("Details for Ada");
    }
  );

  it.each(["ltr", "rtl"] as const)(
    "forwards direction-aware tree keyboard behavior for %s",
    async (dir) => {
      const view = mount({
        dir,
        features: [tree<Row>({ getParentId: (row) => row.parent })],
      });
      await settle();
      const toggle = node<HTMLButtonElement>(view.root, part("tree-toggle"));
      const open = new KeyboardEvent("keydown", {
        key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      toggle.dispatchEvent(open);
      await settle();
      expect(open.defaultPrevented).toBe(true);
      expect(view.root.textContent).toContain("Bea");
      toggle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: dir === "rtl" ? "ArrowRight" : "ArrowLeft",
          bubbles: true,
        })
      );
      await settle();
      expect(view.root.textContent).not.toContain("Bea");
    }
  );

  it("reflects lazy tree loading and does not run an unmounted retained control", async () => {
    let done: (() => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        })
    );
    const view = mount({
      features: [
        tree<Row>({
          getChildren: () => undefined,
          hasChildren: () => true,
          onLoadChildren: load,
        }),
      ],
    });
    await settle();
    const toggle = node<HTMLButtonElement>(view.root, part("tree-toggle"));
    toggle.click();
    await settle();
    expect(toggle.getAttribute("aria-busy")).toBe("true");
    expect(toggle.textContent).toBe("…");
    expect(load).toHaveBeenCalledTimes(1);
    done?.();
    await Promise.resolve();
    await settle();
    expect(toggle.hasAttribute("aria-busy")).toBe(false);
    view.props.value = { ...view.props.value, features: [] };
    await settle();
    toggle.click();
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled tree/detail expansion authoritative and updates without recreating features", async () => {
    const expanded = shallowRef<readonly string[]>([]);
    const detailIds = shallowRef<readonly string[]>([]);
    const treeChange = vi.fn();
    const detailChange = vi.fn();
    const view = mount({
      features: [
        tree<Row>({
          getParentId: (row) => row.parent,
          expandedIds: expanded,
          onExpandedIdsChange: treeChange,
        }),
        rowDetail<Row>((row) => h("p", `Details for ${row.name}`), undefined, {
          expandedRowIds: detailIds,
          onExpandedRowIdsChange: detailChange,
        }),
      ],
    });
    await settle();
    node<HTMLButtonElement>(view.root, part("tree-toggle")).click();
    node<HTMLButtonElement>(view.root, part("expand-button")).click();
    await settle();
    expect(treeChange).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(detailChange).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(view.root.textContent).not.toContain("Bea");
    expect(view.root.textContent).not.toContain("Details for Ada");
    expanded.value = ["a"];
    detailIds.value = ["a"];
    await settle();
    expect(view.root.textContent).toContain("Bea");
    expect(view.root.textContent).toContain("Details for Ada");
  });

  it("renders native child tables through the binding detail renderer and inherits density", async () => {
    const view = mount({
      density: "compact",
      features: [
        nestedTable<Row>(
          (row) => ({
            table: (defaults) =>
              h(DataTable<{ id: string; name: string }>, {
                ...defaults,
                columns: [{ key: "name" }],
                data: [{ id: `child-${row.id}`, name: `Child of ${row.name}` }],
                rowKey: (child) => child.id,
                urlSync: false,
                searchable: false,
              }),
          }),
          ["a"]
        ),
      ],
    });
    await settle();
    expect(view.root.textContent).toContain("Child of Ada");
    expect(
      view.root.querySelectorAll(`${part("root")}[data-density="compact"]`)
    ).toHaveLength(2);
  });

  it.each([false, true])(
    "hydrates native hierarchy without mismatches and keeps controls interactive, mobile=%s",
    async (mobile) => {
      const props = {
        ...base(),
        forceMobile: mobile,
        features: [
          grouping("team"),
          rowDetail<Row>((row) => h("p", `Details for ${row.name}`)),
        ],
      };
      const component = defineComponent({
        setup: () => () => h(DataTable<Row>, props),
      });
      const root = document.createElement("div");
      root.innerHTML = await renderToString(createSSRApp(component));
      document.body.append(root);
      const warn = vi.spyOn(console, "warn");
      const error = vi.spyOn(console, "error");
      const app = createSSRApp(component);
      app.mount(root);
      cleanup.push(() => {
        app.unmount();
        root.remove();
      });
      await settle();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      node<HTMLButtonElement>(root, part("group-toggle")).click();
      await settle();
      expect(root.textContent).not.toContain("Ada");
    }
  );
});

it("requires the native grouping contribution instead of drawing a hidden fallback", async () => {
  const { grouping: headlessGrouping } =
    await import("@adapttable/vue/features");
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, { ...base(), features: [headlessGrouping("team")] }),
  });
  app.config.warnHandler = () => undefined;
  expect(() => app.mount(root)).toThrow(
    "native grouping rows require grouping()"
  );
  app.unmount();
  root.remove();
});
