import type { ColumnDef } from "@adapttable/vue";
import { cellSpan, extraRows } from "@adapttable/vue/features";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef, type VNodeChild } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { densityChooser } from "../src/density";

interface Row {
  id: string;
  name: string;
  team: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Bea", team: "Core" },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", sortable: true },
  { key: "name", sortable: true },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}
async function fixture(
  overrides: Partial<DataTableProps<Row>> = {},
  events: Record<string, unknown> = {},
  slots: Record<string, () => VNodeChild> = {}
) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: false,
    searchDebounceMs: 0,
    ...overrides,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    render: () => h(DataTable<Row>, { ...props.value, ...events }, slots),
  });
  app.use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  await settle();
  return { root, props };
}
function find<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing table target: ${selector}`);
  return node;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;

describe("Nuxt UI table surface prototype", () => {
  it("renders one scroll owner and real Nuxt controls over the shared model", async () => {
    const view = await fixture({
      tableLabel: "People",
      selectable: true,
      features: [densityChooser()],
      classNames: {
        table: "table-paint",
        th: "header-paint",
        td: "cell-paint",
        searchInput: "query-paint",
        selectionCheckbox: "selection-paint",
      },
    });
    expect(view.root.querySelectorAll(part("scroll-box"))).toHaveLength(1);
    const table = find<HTMLTableElement>(view.root, "table");
    expect(table.getAttribute("aria-label")).toBe("People");
    expect(table.classList.contains("table-paint")).toBe(true);
    expect(
      find(view.root, "thead th[data-column-key]").classList.contains(
        "header-paint"
      )
    ).toBe(true);
    expect(
      find(view.root, "tbody td[data-column-key]").classList.contains(
        "cell-paint"
      )
    ).toBe(true);
    expect(
      find(view.root, 'button[role="checkbox"]').classList.contains(
        "selection-paint"
      )
    ).toBe(true);
    const input = find<HTMLInputElement>(view.root, part("search"));
    expect(input.tagName).toBe("INPUT");
    expect(input.classList.contains("query-paint")).toBe(true);
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(view.root.querySelectorAll("tbody [data-row-id]")).toHaveLength(1);
    expect(view.root.textContent).toContain("Ada");
    expect(view.root.textContent).not.toContain("Bea");
    expect(view.root.querySelector('button[role="combobox"]')).not.toBeNull();
  });

  it("keeps rejected selection requests controlled and exact-once", async () => {
    const select = vi.fn();
    const view = await fixture(
      { selectable: true, selectedIds: [] },
      { "onUpdate:selectedIds": select }
    );
    const checkbox = find<HTMLButtonElement>(
      view.root,
      'tbody button[role="checkbox"]'
    );
    checkbox.click();
    await settle();
    expect(select).toHaveBeenCalledTimes(1);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    checkbox.click();
    await settle();
    expect(select).toHaveBeenCalledTimes(2);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });

  it("preserves prepared spans and extra rows, then renders genuine mobile cards", async () => {
    const view = await fixture({
      dir: "rtl",
      features: [
        densityChooser(),
        cellSpan<Row>(({ row, column }) =>
          row.id === "a" && column.key === "team" ? { rowSpan: 2 } : undefined
        ),
        extraRows([
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "b",
            render: () => h("span", "Note"),
          },
        ]),
      ],
    });
    expect(
      find<HTMLTableCellElement>(view.root, '[data-row-id="a"] td').rowSpan
    ).toBe(3);
    expect(find(view.root, '[data-row-id="b"]').children).toHaveLength(1);
    expect(find(view.root, 'button[role="combobox"]').getAttribute("dir")).toBe(
      "rtl"
    );
    expect(view.root.textContent).toContain("Note");
    view.props.value = { ...view.props.value, forceMobile: true };
    await settle();
    const card = find<HTMLElement>(view.root, 'article[data-row-id="b"]');
    expect(card.getAttribute("role")).toBe("listitem");
    expect(card.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(card.textContent).toContain("Core");
    expect(view.root.querySelector("table")).toBeNull();
    expect(view.root.querySelector("[rowspan]")).toBeNull();
    expect(view.root.querySelectorAll(part("scroll-box"))).toHaveLength(1);
  });

  it.each([false, true])(
    "uses genuine skeletons and honors a loading slot (mobile=%s)",
    async (forceMobile) => {
      const view = await fixture({
        data: [],
        isLoading: true,
        skeletonRows: 3,
        forceMobile,
        classNames: { loadingLine: "loading-paint" },
      });
      expect(
        view.root.querySelectorAll(
          part(forceMobile ? "loading-card" : "loading-row")
        )
      ).toHaveLength(3);
      expect(
        find(view.root, part("loading-line")).classList.contains(
          "loading-paint"
        )
      ).toBe(true);
      expect(find(view.root, part("loading")).getAttribute("role")).toBe(
        "status"
      );
      const replacement = await fixture(
        { data: [], isLoading: true, forceMobile },
        {},
        { loading: () => h("p", "Custom loading") }
      );
      expect(replacement.root.textContent).toContain("Custom loading");
      expect(replacement.root.querySelector(part("loading-line"))).toBeNull();
    }
  );
});
