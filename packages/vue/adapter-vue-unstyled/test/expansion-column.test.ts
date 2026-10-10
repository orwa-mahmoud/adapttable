import { aggregate, type ColumnInput } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, KeepAlive, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { cellSpan } from "../src/cell-span";
import { extraRows } from "../src/extra-rows";
import { grouping } from "../src/grouping";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { rowActions } from "../src/row-actions";
import { rowDetail } from "../src/row-detail";
import { rowPinning } from "../src/row-pinning";
import { rowReorder } from "../src/row-reorder";
import { virtualize } from "../src/virtualize";
import { find, mountNative, part, tick } from "./filter-editing-helpers";

interface Row {
  id: string;
  team: string;
  amount: number;
}
const rows: readonly Row[] = [
  { id: "a", team: "Core", amount: 2 },
  { id: "b", team: "Core", amount: 3 },
  { id: "c", team: "Design", amount: 4 },
];
const columns: readonly ColumnInput<Row>[] = [
  {
    header: "Record",
    children: [
      { key: "team", width: 120 },
      { key: "amount", width: 100 },
    ],
  },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
  selectable: true,
  summaryRow: aggregate<Row>({ amount: "sum" }),
  defaultColumnLayout: { pinned: { team: "start" } },
};
const width = (row: ParentNode) =>
  [
    ...row.querySelectorAll<HTMLTableCellElement>(":scope > td,:scope > th"),
  ].reduce((sum, cell) => sum + cell.colSpan, 0);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("dedicated expansion column", () => {
  it.each(["ltr", "rtl"] as const)(
    "accounts for grouped headers, data pins, summary pads and detail spans in %s",
    async (dir) => {
      const features = [
        rowDetail<Row>((row) => h("p", `Detail ${row.id}`)),
        rowActions<Row>([{ key: "open", label: "Open", onClick: vi.fn() }]),
        rowReorder<Row>(vi.fn()),
        rowPinning({ pinnedRowIds: { top: ["a"], bottom: [] } }),
        pinnedSummaryRows<Row>({
          bottom: [{ id: "total", team: "Total", amount: 9 }],
        }),
      ];
      const props = shallowRef<DataTableProps<Row>>({
        ...base,
        features,
        dir,
        classNames: {
          expandCell: "expand-cell-hook",
          expandHeader: "expand-header-hook",
        },
      });
      const view = mountNative(() => h(DataTable<Row>, props.value));
      await tick();
      const expandHeader = find<HTMLTableCellElement>(
        view.host,
        part("expand-header")
      );
      expect(expandHeader.tagName).toBe("TH");
      expect(expandHeader.rowSpan).toBe(2);
      expect(expandHeader.classList.contains("expand-header-hook")).toBe(true);
      const row = find<HTMLTableRowElement>(view.host, '[data-row-id="a"]');
      expect(row.firstElementChild?.getAttribute("data-adapttable-part")).toBe(
        "expand-cell"
      );
      expect(width(row)).toBe(6);
      const expandCell = find<HTMLTableCellElement>(row, part("expand-cell"));
      expect(expandCell.classList.contains("expand-cell-hook")).toBe(true);
      expect(expandCell.style.position).toBe("sticky");
      expect(
        find<HTMLElement>(row, '[data-column-key="team"]').style
          .insetInlineStart
      ).toBe("0px");
      expect(width(find(view.host, part("summary-row")))).toBe(6);
      expect(
        find(view.host, part("pinned-summary-bottom")).querySelector(
          part("expand-button")
        )
      ).toBeNull();
      find<HTMLButtonElement>(expandCell, "button").click();
      await tick();
      expect(
        find<HTMLTableCellElement>(view.host, part("detail-cell")).colSpan
      ).toBe(6);
      expect(find(view.host, part("detail-cell")).textContent).toBe("Detail a");
      props.value = { ...props.value, forceMobile: true };
      await tick();
      expect(view.host.querySelector(part("expand-cell"))).toBeNull();
      expect(view.host.querySelector(part("expand-header"))).toBeNull();
      expect(
        find(view.host, '[data-row-id="a"]').querySelectorAll(
          part("expand-button")
        )
      ).toHaveLength(1);
      expect(find(view.host, part("card-detail")).textContent).toBe("Detail a");
    }
  );

  it("offsets extra-row coverage and clamps row spans at expanded details", async () => {
    const props = shallowRef<DataTableProps<Row>>({
      ...base,
      features: [
        rowDetail<Row>((row) => `Detail ${row.id}`),
        cellSpan<Row>(({ row, column }) =>
          row.id === "a" && column.key === "team" ? { rowSpan: 2 } : undefined
        ),
        extraRows([
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "b",
            render: () => h("strong", "Note"),
          },
        ]),
      ],
    });
    const view = mountNative(() => h(DataTable<Row>, props.value));
    await tick();
    const first = find<HTMLTableRowElement>(view.host, '[data-row-id="a"]');
    expect(
      find<HTMLTableCellElement>(first, '[data-column-key="team"]').rowSpan
    ).toBe(3);
    const note = find(view.host, "strong").closest("tr")!;
    expect(
      [...note.children].map((cell) => Number(cell.getAttribute("colspan")))
    ).toEqual([2, 1]);
    expect(width(find(view.host, '[data-row-id="b"]'))).toBe(3);
    find<HTMLButtonElement>(first, part("expand-button")).click();
    await tick();
    expect(
      find<HTMLTableCellElement>(
        view.host,
        '[data-row-id="a"] [data-column-key="team"]'
      ).rowSpan
    ).toBe(1);
    expect(width(find(view.host, '[data-row-id="b"]'))).toBe(4);
    expect(
      find<HTMLTableCellElement>(view.host, part("detail-cell")).colSpan
    ).toBe(4);
  });

  it("keeps grouped aggregate rows aligned with utility columns", async () => {
    const view = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          grouping<Row>(["team"], {
            groupAggregates: aggregate<Row>({ amount: "sum" }),
          }),
          rowDetail<Row>((row) => row.id),
          rowReorder<Row>(vi.fn()),
          rowActions<Row>([{ key: "open", label: "Open", onClick: vi.fn() }]),
        ],
      })
    );
    await tick();
    for (const row of view.host.querySelectorAll<HTMLTableRowElement>(
      part("group-row")
    ))
      expect(width(row)).toBe(6);
    expect(width(find(view.host, part("summary-row")))).toBe(6);
  });

  it("preserves controlled rejection and disables a retained toggle during suspension and after removal", async () => {
    const ids = shallowRef<readonly string[]>([]);
    const request = vi.fn();
    const shown = shallowRef(true);
    const features = shallowRef([
      rowDetail<Row>((row) => row.id, [], {
        expandedRowIds: ids,
        onExpandedRowIdsChange: request,
      }),
    ]);
    const view = mountNative(() =>
      h(KeepAlive, null, {
        default: () =>
          shown.value
            ? h(DataTable<Row>, { ...base, features: features.value })
            : null,
      })
    );
    await tick();
    const toggle = find<HTMLButtonElement>(view.host, part("expand-button"));
    toggle.click();
    await tick();
    expect(request).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(view.host.querySelector(part("detail-row"))).toBeNull();
    shown.value = false;
    await tick();
    toggle.click();
    expect(request).toHaveBeenCalledOnce();
    shown.value = true;
    await tick();
    ids.value = ["a"];
    await tick();
    expect(find(view.host, part("detail-cell")).textContent).toBe("a");
    features.value = [];
    await tick();
    toggle.click();
    expect(request).toHaveBeenCalledOnce();
    expect(view.host.querySelector(part("expand-header"))).toBeNull();
    view.stop();
    toggle.click();
    expect(request).toHaveBeenCalledOnce();
  });

  it("keeps expansion, summary and detail colspans in the column and row window", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(160);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const name = this.dataset.adapttablePart;
        const columnWidth =
          name === "expand-header" || name === "selection-header" ? 40 : 100;
        const width = name === "scroll-box" ? 300 : columnWidth;
        const rowHeight = name === "detail-row" ? 140 : 56;
        const height = name === "scroll-box" ? 160 : rowHeight;
        return {
          top: 0,
          left: 0,
          right: width,
          bottom: height,
          width,
          height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }
    );
    const wide = Array.from({ length: 30 }, (_, index) => ({
      key: `col${index}`,
      width: 100,
      accessor: (row: Row) => `${row.id}:${index}`,
    }));
    const many = Array.from({ length: 50 }, (_, index) => ({
      id: String(index),
      team: "Core",
      amount: index,
    }));
    const view = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        data: many,
        columns: wide,
        defaults: { limit: 50 },
        paginationMode: "infinite",
        features: [
          rowDetail<Row>((row) => row.id, ["0"]),
          virtualize({
            maxHeight: 160,
            virtualizeColumns: true,
            virtualOverscan: 1,
          }),
        ],
      })
    );
    await tick();
    const header = find(view.host, part("header-row"));
    expect(header.querySelectorAll(part("expand-header"))).toHaveLength(1);
    const total = width(header);
    expect(
      view.host.querySelectorAll(part("column-spacer-start")).length
    ).toBeGreaterThan(0);
    expect(total).toBeLessThan(34);
    expect(
      find<HTMLTableCellElement>(view.host, part("detail-cell")).colSpan
    ).toBe(total);
    expect(width(find(view.host, part("summary-row")))).toBe(total);
    expect(
      view.host.querySelectorAll(part("virtual-spacer")).length
    ).toBeGreaterThan(0);
    expect(
      view.host.querySelectorAll("tbody [data-row-id]").length
    ).toBeLessThan(many.length);
    for (const spacer of view.host.querySelectorAll(part("virtual-spacer")))
      expect(width(spacer)).toBe(total);
    const expandedRow = find(view.host, '[data-row-id="0"]');
    const expandCell = find<HTMLTableCellElement>(
      expandedRow,
      part("expand-cell")
    );
    expect(expandCell.tagName).toBe("TD");
    expect(expandCell.querySelectorAll(part("expand-button"))).toHaveLength(1);
    expect(expandedRow.querySelectorAll(part("expand-button"))).toHaveLength(1);
  });
});
