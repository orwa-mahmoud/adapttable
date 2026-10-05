import { aggregate, type ColumnDef } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, shallowRef } from "vue";

import { DataTable, type DataTableClassNames } from "../src";
import { resizableColumns } from "../src/columns";
import { groupingPanel } from "../src/grouping-panel";
import { rowDetail } from "../src/row-detail";
import { rowReorder } from "../src/row-reorder";
import { virtualize } from "../src/virtualize";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

const rows = [
  { id: "a", team: "Core", status: "Open", amount: 4 },
  { id: "b", team: "Ops", status: "Open", amount: 8 },
  { id: "c", team: "Core", status: "Closed", amount: 6 },
];
type Row = (typeof rows)[number];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", header: "Team", groupable: true },
  { key: "status", header: "Status", groupable: true },
  {
    key: "amount",
    header: "Amount",
    aggregatable: { operations: ["sum", "avg", "count"] },
  },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  searchable: false,
  urlSync: false,
  forceMobile: false,
};
const groupingClasses = {
  groupingPanel: "hook-panel",
  groupingDropZone: "hook-drop-zone",
  groupingItem: "hook-item",
  groupingChip: "hook-chip",
  groupingChipHandle: "hook-chip-handle",
  groupingChipRemove: "hook-chip-remove",
  groupingAdd: "hook-add",
  groupingAggregations: "hook-aggregations",
  groupingAggregationItem: "hook-aggregation-item",
  groupingAggregationOperation: "hook-operation",
  groupingAggregationRemove: "hook-aggregation-remove",
  groupingAggregationAdd: "hook-aggregation-add",
  groupingAggregationsRestore: "hook-restore",
  groupingRemoveZone: "hook-remove-zone",
} satisfies DataTableClassNames;
function expectHook(
  root: ParentNode,
  name: keyof typeof groupingClasses,
  expectedPart: string,
  tagName: string
) {
  const elements = root.querySelectorAll(`.${groupingClasses[name]}`);
  expect(elements.length).toBeGreaterThan(0);
  for (const element of elements) {
    expect(element.tagName).toBe(tagName);
    expect(element.getAttribute("data-adapttable-part")).toBe(expectedPart);
  }
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("native grouping semantic class hooks", () => {
  it.each([false, true])(
    "keeps RTL grouping and aggregation controls live on their canonical parts, mobile=%s",
    async (mobile) => {
      const features = [
        groupingPanel<Row>(["team", "status"], {
          groupAggregates: aggregate<Row>({ amount: "sum" }),
        }),
      ];
      const names = shallowRef<DataTableClassNames>(groupingClasses);
      const { host } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          dir: "rtl",
          forceMobile: mobile,
          features,
          classNames: names.value,
          labels: {
            groupingPanel: "Group these columns",
            groupingAddAggregation: "Add a calculation",
          },
        })
      );
      await tick();
      const panel = find(host, part("grouping-panel"));
      expect(panel.getAttribute("dir")).toBe("rtl");
      expect(panel.getAttribute("aria-label")).toBe("Group these columns");
      expect(panel.hasAttribute("data-mobile")).toBe(mobile);
      const hooks = [
        ["groupingPanel", "grouping-panel", "DIV"],
        ["groupingItem", "grouping-item", "SPAN"],
        ["groupingChip", "grouping-chip", "SPAN"],
        ["groupingChipHandle", "grouping-chip-handle", "BUTTON"],
        ["groupingChipRemove", "grouping-chip-remove", "BUTTON"],
        ["groupingAdd", "grouping-add", "SELECT"],
        ["groupingAggregations", "grouping-aggregations", "FIELDSET"],
        ["groupingAggregationItem", "grouping-aggregation-item", "SPAN"],
        [
          "groupingAggregationOperation",
          "grouping-aggregation-operation",
          "SELECT",
        ],
        ["groupingAggregationRemove", "grouping-aggregation-remove", "BUTTON"],
        ["groupingAggregationAdd", "grouping-aggregation-add", "FIELDSET"],
      ] as const;
      for (const [key, name, tag] of hooks) expectHook(host, key, name, tag);
      if (mobile)
        expect(panel.querySelector(part("grouping-drop-zone"))).toBeNull();
      else expectHook(host, "groupingDropZone", "grouping-drop-zone", "SPAN");

      const operation = find<HTMLSelectElement>(
        host,
        part("grouping-aggregation-operation")
      );
      expect(operation.value).toBe("sum");
      expect([...operation.options].map((option) => option.value)).toContain(
        "avg"
      );
      await write(operation, "avg", "change");
      expect(operation.value).toBe("avg");
      expectHook(
        host,
        "groupingAggregationsRestore",
        "grouping-aggregations-restore",
        "BUTTON"
      );
      find<HTMLButtonElement>(
        host,
        part("grouping-aggregations-restore")
      ).click();
      await tick();
      expect(operation.value).toBe("sum");
      expect(
        host.querySelector(part("grouping-aggregations-restore"))
      ).toBeNull();

      const remove = find<HTMLButtonElement>(
        host,
        part("grouping-aggregation-remove")
      );
      remove.focus();
      remove.click();
      await tick();
      expect(
        host.querySelector(part("grouping-aggregation-operation"))
      ).toBeNull();
      const option = find<HTMLInputElement>(
        host,
        part("grouping-aggregation-option")
      );
      expect(option.tagName).toBe("INPUT");
      expect(option.type).toBe("checkbox");
      expect(option.closest("label")?.textContent).toContain("Amount");
      expect(option.checked).toBe(false);
      expect(document.activeElement).toBe(option);
      expect(
        find(host, `${part("grouping-aggregation-add")} legend`).textContent
      ).toBe("Add a calculation");
      option.click();
      await tick();
      expect(option.checked).toBe(true);
      expect(
        find<HTMLSelectElement>(host, part("grouping-aggregation-operation"))
          .value
      ).toBe("sum");

      const handle = find<HTMLButtonElement>(
        host,
        part("grouping-chip-handle")
      );
      expect(handle.textContent).toContain("Team");
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
      );
      await tick();
      expect(find(host, part("grouping-chip")).textContent).toContain("Status");
      expect(find(host, part("grouping-announcer")).textContent).toContain(
        "Team"
      );
      expect(find(host, part("grouping-chip")).getAttribute("data-level")).toBe(
        "1"
      );

      names.value = {
        ...groupingClasses,
        groupingPanel: "changed-panel",
        groupingItem: "changed-item",
        groupingAggregations: "changed-aggregations",
        groupingChipHandle: "changed-handle",
      };
      await tick();
      expect(find(host, ".changed-panel")).toBe(panel);
      expect(host.querySelector(".hook-panel")).toBeNull();
      expect(
        find(host, ".changed-item").getAttribute("data-adapttable-part")
      ).toBe("grouping-item");
      expect(
        find(host, ".changed-aggregations").getAttribute("data-adapttable-part")
      ).toBe("grouping-aggregations");
      expect(handle.classList.contains("changed-handle")).toBe(true);
      expect(host.contains(handle)).toBe(true);
      find<HTMLButtonElement>(host, part("grouping-chip-remove")).click();
      await tick();
      expect(host.querySelectorAll(part("grouping-chip"))).toHaveLength(1);
      expect(find(host, part("grouping-chip")).textContent).toContain("Team");
    }
  );

  it("classes empty insertion and chip-removal targets without replacing drag handlers", async () => {
    const features = [groupingPanel<Row>()];
    const { host } = mountNative(() =>
      h(DataTable<Row>, { ...base, features, classNames: groupingClasses })
    );
    await tick();
    expectHook(host, "groupingDropZone", "grouping-drop-zone", "SPAN");
    expect(
      find(host, part("grouping-drop-zone")).hasAttribute("data-empty")
    ).toBe(true);
    await write(
      find<HTMLSelectElement>(host, part("grouping-add")),
      "team",
      "change"
    );
    expect(host.querySelectorAll(part("grouping-chip"))).toHaveLength(1);
    const handle = find<HTMLButtonElement>(host, part("grouping-chip-handle"));
    expect(handle.draggable).toBe(true);
    handle.dispatchEvent(new Event("dragstart", { bubbles: true }));
    await tick();
    expectHook(host, "groupingRemoveZone", "grouping-remove-zone", "SPAN");
    expect(
      find(host, part("grouping-remove-zone")).getAttribute("aria-label")
    ).toBeTruthy();
    handle.dispatchEvent(new Event("dragend", { bubbles: true }));
    await tick();
    expect(host.querySelector(part("grouping-remove-zone"))).toBeNull();
  });

  it("honors the aggregation-item hook for read-only host aggregates", async () => {
    const readOnlyColumns: readonly ColumnDef<Row>[] = columns.map(
      (column) => ({
        ...column,
        aggregatable: false,
      })
    );
    const features = [
      groupingPanel<Row>(["team"], {
        groupAggregates: () => ({ amount: "Computed" }),
      }),
    ];
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        columns: readOnlyColumns,
        features,
        classNames: groupingClasses,
      })
    );
    await tick();
    expectHook(
      host,
      "groupingAggregationItem",
      "grouping-aggregation-item",
      "SPAN"
    );
    const item = find(host, part("grouping-aggregation-item"));
    expect(item.hasAttribute("data-read-only")).toBe(true);
    expect(item.querySelector("select, button")).toBeNull();
  });
});

describe("native specialized structural class hooks", () => {
  it("keeps mobile detail content on card-detail and preserves the fields class", async () => {
    const mobile = shallowRef(true);
    const features = [rowDetail<Row>((row) => h("p", `Details ${row.id}`))];
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: mobile.value,
        features,
        classNames: {
          cardFields: "fields-hook",
          cardDetail: "card-detail-hook",
          detailRow: "desktop-detail-row",
          detailCell: "desktop-detail-cell",
        },
      })
    );
    await tick();
    expect(host.querySelectorAll("dl.fields-hook")).toHaveLength(rows.length);
    expect(
      find(host, "dl.fields-hook").hasAttribute("data-adapttable-part")
    ).toBe(false);
    find<HTMLButtonElement>(host, part("expand-button")).click();
    await tick();
    const detail = find(host, "article > div.card-detail-hook");
    expect(detail.getAttribute("data-adapttable-part")).toBe("card-detail");
    expect(detail.textContent).toBe("Details a");
    expect(
      host.querySelector(`${part("detail-row")}, ${part("detail-cell")}`)
    ).toBeNull();
    mobile.value = false;
    await tick();
    expect(host.querySelector(part("card-detail"))).toBeNull();
    expect(
      find(host, "tr.desktop-detail-row").getAttribute("data-adapttable-part")
    ).toBe("detail-row");
    expect(
      find(host, "td.desktop-detail-cell").getAttribute("data-adapttable-part")
    ).toBe("detail-cell");
    expect(find(host, "td.desktop-detail-cell").textContent).toBe("Details a");
  });

  it("preserves resize-handle on the final accessible keyboard target", async () => {
    const features = [resizableColumns()];
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        dir: "rtl",
        features,
        classNames: { resizeHandle: "resize-hook" },
      })
    );
    await tick();
    const handle = find<HTMLElement>(host, ".resize-hook");
    expect(handle.getAttribute("data-adapttable-part")).toBe("resize-handle");
    expect(handle.getAttribute("role")).toBe("button");
    expect(handle.tabIndex).toBe(0);
    expect(handle.getAttribute("aria-label")).toContain("Team");
    const header = find<HTMLElement>(host, "th[data-column-key='team']");
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 120, 40)
    );
    handle.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      })
    );
    await tick();
    expect(header.style.width).toBe("136px");
  });

  it("places reorder hooks on the leading semantic cells with general cell classes", async () => {
    const features = [rowReorder<Row>(() => undefined)];
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features,
        classNames: {
          th: "general-head",
          td: "general-cell",
          reorderHeader: "reorder-head",
          reorderCell: "reorder-cell",
        },
      })
    );
    await tick();
    const header = find(host, "th.reorder-head");
    expect(header.getAttribute("data-adapttable-part")).toBe("reorder-header");
    expect(header.classList.contains("general-head")).toBe(true);
    expect(header.getAttribute("scope")).toBe("col");
    const cells = host.querySelectorAll("td.reorder-cell");
    expect(cells).toHaveLength(rows.length);
    for (const cell of cells) {
      expect(cell.getAttribute("data-adapttable-part")).toBe("reorder-cell");
      expect(cell.classList.contains("general-cell")).toBe(true);
      expect(cell.querySelector(part("row-reorder-handle"))).not.toBeNull();
    }
  });

  it.each([false, true])(
    "uses virtual-spacer on actual padding elements, mobile=%s",
    async (mobile) => {
      class Observer {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      }
      vi.stubGlobal("ResizeObserver", Observer);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
        function (this: HTMLElement) {
          return this.dataset.adapttablePart === "scroll-box" ? 240 : 56;
        }
      );
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
        640
      );
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
        640
      );
      vi.spyOn(
        HTMLElement.prototype,
        "getBoundingClientRect"
      ).mockImplementation(function (this: HTMLElement) {
        return new DOMRect(
          0,
          0,
          640,
          this.dataset.adapttablePart === "scroll-box" ? 240 : 56
        );
      });
      const data = Array.from({ length: 120 }, (_, index) => ({
        ...rows[0]!,
        id: `r${index}`,
      }));
      const features = [
        virtualize({
          maxHeight: 240,
          estimateRowSize: 56,
          estimateCardSize: 56,
          virtualOverscan: 2,
        }),
      ];
      const { host } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          data,
          forceMobile: mobile,
          defaults: { limit: 120 },
          paginationMode: "infinite",
          features,
          classNames: { virtualSpacer: "virtual-pad" },
        })
      );
      await tick();
      const spacers = host.querySelectorAll<HTMLElement>(
        part("virtual-spacer")
      );
      expect(spacers).toHaveLength(2);
      expect(host.querySelectorAll(".virtual-pad")).toHaveLength(2);
      for (const spacer of spacers) {
        expect(spacer.classList.contains("virtual-pad")).toBe(true);
        expect(spacer.tagName).toBe(mobile ? "DIV" : "TR");
        expect(spacer.getAttribute("aria-hidden")).toBe("true");
        if (!mobile)
          expect(find(spacer, "td").getAttribute("colspan")).toBe(
            String(columns.length)
          );
      }
      const bottom = spacers[1]!;
      const padding = mobile ? bottom : find(bottom, "td");
      expect(Number.parseFloat(padding.style.height)).toBeGreaterThan(0);
      const visibleRows = host.querySelectorAll(
        mobile ? "article[data-row-id]" : "tbody [data-row-id]"
      );
      expect(visibleRows.length).toBeGreaterThan(0);
      expect(visibleRows.length).toBeLessThan(data.length);
      expect(
        host.querySelector(
          '[data-adapttable-part="pad-top"], [data-adapttable-part="pad-bottom"]'
        )
      ).toBeNull();
    }
  );
});
