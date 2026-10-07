import type { DataTableHandle, RowPinState } from "@adapttable/vue";
import type { DataTableProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { cellSpan } from "../src/cell-span";
import DataTable from "../src/DataTable.vue";
import { extraRows } from "../src/extra-rows";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { rowActions } from "../src/row-actions";
import { rowAppearance } from "../src/row-appearance";
import { rowPinning } from "../src/row-pinning";
import { mount, node } from "./mount";

interface Row {
  id: string;
  team: string;
  amount: number;
}
const rows: readonly Row[] = [
  { id: "a", team: "Core", amount: 1 },
  { id: "b", team: "Core", amount: 2 },
  { id: "c", team: "Design", amount: 3 },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function fixture(extra: Partial<DataTableProps<Row>>) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [{ key: "team" }, { key: "amount" }],
    rowKey: (row) => row.id,
    searchable: false,
    urlSync: false,
    forceMobile: false,
    ...extra,
  });
  const handle = shallowRef<DataTableHandle<Row> | null>(null);
  return {
    ...mount(() => h(DataTable<Row>, { ...props.value, ref: handle })),
    props,
    handle,
  };
}

describe("Element Plus prepared row surfaces", () => {
  for (const mobile of [false, true]) {
    it(`keeps controlled pin requests authoritative and preserves raw host rows, mobile=${mobile}`, async () => {
      const state = shallowRef<RowPinState>({ top: [], bottom: [] });
      const change = vi.fn();
      const run = vi.fn();
      const view = fixture({
        forceMobile: mobile,
        features: [
          rowPinning({ pinnedRowIds: state, onPinnedRowIdsChange: change }),
          rowActions<Row>([{ key: "open", label: "Open row", onClick: run }]),
        ],
      });
      await tick();
      const target = node<HTMLElement>(view.root, '[data-row-id="c"]');
      const pin = [
        ...target.querySelectorAll<HTMLButtonElement>(part("action-button")),
      ].find((button) => button.getAttribute("aria-label")?.includes("top"));
      if (!pin) throw new Error("Missing prepared top-pin action");
      expect(pin.classList.contains("el-button")).toBe(true);
      pin.click();
      await tick();
      expect(change).toHaveBeenCalledExactlyOnceWith({
        top: ["c"],
        bottom: [],
      });
      expect(view.handle.value?.getView()?.pinning?.rows).toEqual({
        top: [],
        bottom: [],
      });
      expect(
        view.root.querySelector("[data-row-id]")?.getAttribute("data-row-id")
      ).toBe("a");
      state.value = { top: ["c"], bottom: [] };
      await tick();
      expect(view.handle.value?.getView()?.pinning?.rows).toEqual(state.value);
      expect(
        view.root.querySelector("[data-row-id]")?.getAttribute("data-row-id")
      ).toBe("c");
      const pinned = node<HTMLElement>(view.root, '[data-row-id="c"]');
      expect(pinned.tagName).toBe(mobile ? "DIV" : "TR");
      if (mobile) expect(pinned.classList.contains("el-card")).toBe(true);
      node<HTMLButtonElement>(
        pinned,
        `${part("action-button")}[aria-label="Open row"]`
      ).click();
      await tick();
      expect(run).toHaveBeenCalledExactlyOnceWith(rows[2]);
      view.props.value = { ...view.props.value, features: [] };
      await tick();
      pin.click();
      expect(change).toHaveBeenCalledTimes(1);
    });
    it(`keeps independent summaries, extras and appearance on their semantic kit owners, mobile=${mobile}`, async () => {
      const summary: Row = { id: "total", team: "TOTAL", amount: 6 };
      const view = fixture({
        forceMobile: mobile,
        selectable: true,
        features: [
          pinnedSummaryRows<Row>({ top: [summary] }),
          extraRows([
            {
              key: "note",
              kind: "fullWidth",
              beforeRowId: "b",
              render: () => h("strong", "Important note"),
            },
            { key: "rule", kind: "separator" },
          ]),
          rowAppearance<Row>({
            rowClassName: (row) => `host-${row.id}`,
            rowStyle: (row) => ({ opacity: row.id === "a" ? 0.5 : 1 }),
            rowHeight: () => 120,
          }),
        ],
      });
      await tick();
      const first = node<HTMLElement>(view.root, '[data-row-id="a"]');
      expect(first.classList.contains("host-a")).toBe(true);
      expect(first.style.opacity).toBe("0.5");
      expect(first.style.height).toBe("120px");
      const total = node<HTMLElement>(view.root, part("pinned-summary-top"));
      expect(total.textContent).toContain("TOTAL");
      expect(total.querySelector('input[type="checkbox"]')).toBeNull();
      const note = node<HTMLElement>(view.root, part("full-width-row"));
      expect(note.textContent).toContain("Important note");
      expect(
        note.compareDocumentPosition(node(view.root, '[data-row-id="b"]')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).not.toBe(0);
      expect(
        view.root.querySelectorAll(
          `${mobile ? '[role="list"]' : "tbody"} input[type="checkbox"]`
        )
      ).toHaveLength(3);
      if (mobile) {
        expect(total.classList.contains("el-card")).toBe(true);
        expect(note.classList.contains("el-card")).toBe(true);
        expect(total.getAttribute("role")).toBe("listitem");
      } else {
        expect(total.tagName).toBe("TR");
        expect(total.children).toHaveLength(3);
        expect(node<HTMLTableCellElement>(note, "td").colSpan).toBe(3);
      }
      const selectionHosts = mobile
        ? [
            ...view.root.querySelectorAll<HTMLLabelElement>(
              `${part("cards")} label${part("checkbox")}`
            ),
          ]
        : [
            node<HTMLLabelElement>(
              view.root,
              `${part("selection-header")} label${part("checkbox")}`
            ),
          ];
      for (const host of selectionHosts) {
        const input = host.control;
        if (!(input instanceof HTMLInputElement))
          throw new Error("Missing genuine selection input");
        input.click();
        await tick();
      }
      expect(
        [...(view.handle.value?.getView()?.selection?.selectedIds ?? [])].sort(
          (left, right) => left.localeCompare(right)
        )
      ).toEqual(["a", "b", "c"]);
      view.props.value = { ...view.props.value, features: [] };
      await tick();
      expect(view.root.querySelector(part("pinned-summary-top"))).toBeNull();
      expect(view.root.querySelector(part("full-width-row"))).toBeNull();
      expect(
        node<HTMLElement>(view.root, '[data-row-id="a"]').classList.contains(
          "host-a"
        )
      ).toBe(false);
    });
  }
  it("keeps binding-inflated native spans around an extra row and complete mobile fields", async () => {
    const view = fixture({
      features: [
        cellSpan<Row>(({ row, column }) =>
          row.id === "a" && column.key === "team" ? { rowSpan: 2 } : undefined
        ),
        extraRows([
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "b",
            render: () => "Spanning note",
          },
        ]),
      ],
    });
    await tick();
    expect(
      node<HTMLTableCellElement>(view.root, '[data-row-id="a"] td').rowSpan
    ).toBe(3);
    expect(node(view.root, '[data-row-id="b"]').children).toHaveLength(1);
    view.props.value = { ...view.props.value, forceMobile: true };
    await tick();
    expect(node(view.root, '[data-row-id="b"]').textContent).toContain("Core");
    expect(view.root.querySelector("[rowspan]")).toBeNull();
  });
});
