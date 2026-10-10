import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";
import { nestedTable, rowDetail } from "../src/row-detail";
import { tree } from "../src/tree";
import {
  find,
  key,
  mountFeatures,
  original,
  part,
  type Row,
  tick,
} from "./feature-helpers";

const rows: readonly Row[] = [
  original,
  { ...original, id: "b", name: "Bea", amount: 3, parent: "a" },
  { ...original, id: "c", name: "Cy", team: "Design" },
];
describe("shadcn hierarchy feature fills", () => {
  it.each([false, true])(
    "renders group paging, collapse and mixed controlled selection through kit targets (mobile=%s)",
    async (forceMobile) => {
      const changed = vi.fn();
      const view = mountFeatures(
        [
          grouping<Row>("team", {
            groupRowPageSize: 1,
            groupFooters: true,
            groupAggregates: (values) => ({
              amount: values.reduce((sum, row) => sum + row.amount, 0),
            }),
          }),
        ],
        {
          data: rows,
          forceMobile,
          selectedIds: ["a"],
          classNames: {
            groupCheckbox: "group-checkbox-hook",
            groupToggle: "group-toggle-hook",
          },
        },
        { "onUpdate:selectedIds": changed }
      );
      await tick();
      const checkbox = find<HTMLButtonElement>(view.root, part("group-select"));
      expect(checkbox.dataset.slot).toBe("checkbox");
      expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
      expect(checkbox.classList.contains("group-checkbox-hook")).toBe(true);
      checkbox.click();
      await tick();
      checkbox.click();
      await tick();
      expect(changed.mock.calls).toEqual([[["a", "b"]], [["a", "b"]]]);
      expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
      view.props.value = { ...view.props.value, selectedIds: ["a", "b"] };
      await tick();
      expect(checkbox.getAttribute("aria-checked")).toBe("true");
      const more = find<HTMLButtonElement>(view.root, part("group-more"));
      expect(more.dataset.slot).toBe("button");
      expect(view.root.textContent).not.toContain("Bea");
      more.click();
      await tick();
      expect(view.root.textContent).toContain("Bea");
      const toggle = find<HTMLButtonElement>(view.root, part("group-toggle"));
      expect(toggle.classList.contains("group-toggle-hook")).toBe(true);
      toggle.click();
      await tick();
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(view.root.textContent).not.toContain("Ada");
      toggle.click();
      await tick();
      expect(view.root.textContent).toContain("Ada");
    }
  );
  it.each([false, true])(
    "isolates tree/detail gestures and keeps detail identity when display content changes (mobile=%s)",
    async (forceMobile) => {
      const click = vi.fn();
      const view = mountFeatures(
        [
          tree<Row>({ getParentId: (row) => row.parent }),
          rowDetail<Row>((row) => h("aside", row.name)),
        ],
        { data: rows, forceMobile },
        { onClick: click }
      );
      const toggle = find<HTMLButtonElement>(view.root, part("tree-toggle"));
      expect(toggle.dataset.slot).toBe("button");
      expect(view.root.textContent).not.toContain("Bea");
      toggle.click();
      await tick();
      expect(view.root.textContent).toContain("Bea");
      const detail = find<HTMLButtonElement>(view.root, part("expand-button"));
      detail.click();
      await tick();
      const region = find(
        view.root,
        part(forceMobile ? "card-detail" : "detail-row")
      );
      expect(region.textContent).toContain("Ada");
      view.rows.value = rows.map((row) =>
        row.id === "a" ? { ...row, name: "Updated" } : row
      );
      await tick();
      expect(
        find(view.root, part(forceMobile ? "card-detail" : "detail-row"))
      ).toBe(region);
      expect(region.textContent).toContain("Updated");
      expect(click).not.toHaveBeenCalled();
      detail.click();
      await tick();
      expect(
        view.root.querySelector(
          part(forceMobile ? "card-detail" : "detail-row")
        )
      ).toBeNull();
    }
  );
  it("uses the live direction for tree keyboard commands and respects controlled expansion", async () => {
    const ids = shallowRef<readonly string[]>([]);
    const changed = vi.fn();
    const view = mountFeatures(
      [
        tree<Row>({
          getParentId: (row) => row.parent,
          expandedIds: ids,
          onExpandedIdsChange: changed,
        }),
      ],
      { data: rows, dir: "ltr" }
    );
    const toggle = find<HTMLButtonElement>(view.root, part("tree-toggle"));
    key(toggle, "ArrowRight");
    await tick();
    expect(changed).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(view.root.textContent).not.toContain("Bea");
    ids.value = ["a"];
    await tick();
    expect(view.root.textContent).toContain("Bea");
    view.props.value = { ...view.props.value, dir: "rtl" };
    await tick();
    key(toggle, "ArrowRight");
    await tick();
    expect(changed).toHaveBeenLastCalledWith([]);
    expect(view.root.textContent).toContain("Bea");
    ids.value = [];
    await tick();
    expect(view.root.textContent).not.toContain("Bea");
  });
  it("renders same-kit nested tables with inherited compact defaults", async () => {
    const view = mountFeatures(
      [
        nestedTable<Row>(
          (row) => ({
            table: (defaults) =>
              h(DataTable<{ id: string; name: string }>, {
                ...defaults,
                data: [{ id: `child-${row.id}`, name: `Child of ${row.name}` }],
                columns: [{ key: "name" }],
                rowKey: (child) => child.id,
                urlSync: false,
                searchable: false,
              }),
          }),
          ["a"]
        ),
      ],
      { density: "compact" }
    );
    await tick();
    expect(view.root.textContent).toContain("Child of Ada");
    expect(
      view.root.querySelectorAll(
        '[data-adapttable-part="root"][data-density="compact"]'
      )
    ).toHaveLength(2);
  });

  it("shows a kit loading glyph and retires a detached lazy-tree action", async () => {
    let resolve: (() => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        })
    );
    const view = mountFeatures([
      tree<Row>({
        getChildren: () => undefined,
        hasChildren: () => true,
        onLoadChildren: load,
      }),
    ]);
    const toggle = find<HTMLButtonElement>(view.root, part("tree-toggle"));
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-busy")).toBe("true");
    expect(toggle.querySelector("svg.animate-spin")).not.toBeNull();
    resolve?.();
    await tick();
    expect(toggle.hasAttribute("aria-busy")).toBe(false);
    view.props.value = { ...view.props.value, features: [] };
    await tick();
    toggle.click();
    await tick();
    expect(load).toHaveBeenCalledOnce();
  });

  it("renders separate server hierarchy requests without host writes", async () => {
    const render = (name: string) =>
      renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<Row>, {
              data: [{ ...original, team: name }],
              columns: [{ key: "name" }, { key: "team" }],
              rowKey: (row) => row.id,
              urlSync: false,
              dir: "rtl",
              forceMobile: true,
              features: [grouping<Row>("team")],
            }),
        })
      );
    const [first, second] = await Promise.all([render("ONE"), render("TWO")]);
    expect(first).toContain("ONE");
    expect(first).not.toContain("TWO");
    expect(second).not.toContain("ONE");
    expect(first).toContain('data-slot="button"');
    expect(first).toContain('dir="rtl"');
  });
});
