import type { CellContext, ColumnDef, DataTableHandle } from "@adapttable/vue";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick, ref, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { cellSpan } from "../src/cell-span";
import type { DataTableProps } from "../src/types";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "b", name: "Bea", score: 2 },
  { id: "a", name: "Ada", score: 1 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
  searchDebounceMs: 0,
};
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function button(root: ParentNode, label: string): HTMLButtonElement {
  const found = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent?.includes(label)
  );
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}

describe("Element Plus semantic table presentation", () => {
  it("uses a real kit frame while preserving native table targets and raw cell identity", async () => {
    const received: Row[] = [];
    const { root } = mount(() =>
      h(
        DataTable<Row>,
        {
          ...base,
          tableLabel: "Team records",
          classNames: { table: "host-table", th: "host-head", td: "host-cell" },
        },
        {
          cell: ({ row, value }: CellContext<Row>) => {
            received.push(row);
            return String(value);
          },
        }
      )
    );
    await tick();
    const table = node<HTMLTableElement>(
      root,
      'table[data-adapttable-part="table"]'
    );
    expect(
      table.closest(".el-card.adapttable-element-plus-table")
    ).not.toBeNull();
    expect(table.getAttribute("aria-label")).toBe("Team records");
    expect(table.classList.contains("host-table")).toBe(true);
    expect(node(root, "th.host-head").tagName).toBe("TH");
    expect(node(root, "td.host-cell").tagName).toBe("TD");
    expect(received.every((row) => rows.includes(row))).toBe(true);
    expect(root.querySelectorAll(".el-table")).toHaveLength(0);
  });

  it("keeps binding-owned sort and search behavior with actual kit controls", async () => {
    const { root } = mount(() => h(DataTable<Row>, base));
    await tick();
    expect(node(root, "tbody tr").getAttribute("data-row-id")).toBe("b");
    const sort = button(root, "Name");
    expect(sort.classList.contains("el-button")).toBe(true);
    sort.click();
    await tick();
    expect(node(root, "tbody tr").getAttribute("data-row-id")).toBe("a");
    const input = node<HTMLInputElement>(
      root,
      'input[data-adapttable-part="search"]'
    );
    expect(input.closest(".el-input")).not.toBeNull();
    input.value = "Bea";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(root.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(node(root, "tbody tr").textContent).toContain("Bea");
  });

  it("requests selection exactly once and restores rejected table-level values", async () => {
    const selected = vi.fn();
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        selectable: true,
        selectedIds: [],
        "onUpdate:selectedIds": selected,
      })
    );
    await tick();
    const checkbox = node<HTMLInputElement>(root, "tbody input[type=checkbox]");
    checkbox.click();
    await tick();
    expect(selected).toHaveBeenCalledExactlyOnceWith(["b"]);
    expect(checkbox.checked).toBe(false);
    checkbox.click();
    await tick();
    expect(selected).toHaveBeenCalledTimes(2);
    expect(checkbox.checked).toBe(false);
  });

  it("renders real mobile kit cards with native label/value owners and controlled changes", async () => {
    const selectedIds = ref<readonly string[]>([]);
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: true,
        selectable: true,
        selectedIds: selectedIds.value,
        "onUpdate:selectedIds": (ids) => {
          selectedIds.value = ids;
        },
        classNames: {
          card: "host-card",
          cardLabel: "host-label",
          cardValue: "host-value",
        },
      })
    );
    await tick();
    const card = node<HTMLElement>(root, '[data-adapttable-part="card"]');
    expect(card.classList.contains("el-card")).toBe(true);
    expect(card.classList.contains("host-card")).toBe(true);
    expect(card.getAttribute("role")).toBe("listitem");
    expect(node(card, '[data-adapttable-part="card-label"]').tagName).toBe(
      "DT"
    );
    expect(node(card, '[data-adapttable-part="card-value"]').tagName).toBe(
      "DD"
    );
    expect(node(card, ".host-label")).not.toBeNull();
    expect(node(card, ".host-value")).not.toBeNull();
    node<HTMLInputElement>(card, "input[type=checkbox]").click();
    await tick();
    expect(selectedIds.value).toEqual(["b"]);
    expect(card.dataset.selected).toBe("");
  });

  it("retains prepared native colspans instead of delegating to a vendor data engine", async () => {
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          cellSpan<Row>(({ rowIndex, column }) =>
            rowIndex === 0 && column.key === "name" ? { colSpan: 2 } : undefined
          ),
        ],
      })
    );
    await tick();
    const first = node<HTMLTableRowElement>(root, "tbody tr");
    expect(node<HTMLTableCellElement>(first, "td").colSpan).toBe(2);
    expect(first.querySelectorAll("td")).toHaveLength(1);
  });

  it("keeps one scroll owner and the generic exposed table handle", async () => {
    const handle = shallowRef<DataTableHandle<Row> | null>(null);
    const { root } = mount(() => h(DataTable<Row>, { ...base, ref: handle }));
    await tick();
    expect(
      root.querySelectorAll('[data-adapttable-part="scroll-box"]')
    ).toHaveLength(1);
    expect(
      node(root, '[data-adapttable-part="scroll-box"]').querySelectorAll(
        ".el-scrollbar"
      )
    ).toHaveLength(0);
    expect(handle.value).not.toBeNull();
  });

  it("server-renders the kit frame and true table structure", async () => {
    const app = createSSRApp(() => h(DataTable<Row>, base));
    app.provide(ID_INJECTION_KEY, { prefix: 4500, current: 0 });
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    const html = await renderToString(app);
    expect(html).toContain("adapttable-element-plus-table");
    expect(html).toMatch(/<table[^>]*data-adapttable-part="table"/);
    expect(html).toContain("Bea");
    expect(html).toContain("Ada");
  });
});
