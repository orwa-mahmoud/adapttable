import type {
  ColumnDef,
  DesktopTableModel,
  MobileCardsModel,
} from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";

import { naiveTableControls } from "../src/controls/table";
import { NaiveDesktopTable } from "../src/renderers/desktop";
import { NaiveMobileCards } from "../src/renderers/mobile";

interface Row {
  id: string;
  name: string;
}
const data: Row = { id: "ada", name: "Ada" };
const column: ColumnDef<Row> = { key: "name", header: "Name" };
const cleanups: (() => void)[] = [];
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  const unmount = () => {
    app.unmount();
    host.remove();
  };
  cleanups.push(unmount);
  return { host, unmount };
}
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});
function model(
  refs: Record<string, (target: HTMLElement | null) => void> = {}
): DesktopTableModel<Row> {
  return {
    attrs: {
      ref: refs.table,
      role: "grid",
      "aria-label": "People",
      "aria-rowcount": 3,
      "aria-colcount": 2,
      dir: "rtl",
    },
    headerRowAttrs: { role: "row" },
    headers: [
      {
        key: "name",
        column,
        attrs: {
          ref: refs.header,
          role: "columnheader",
          scope: "col",
          id: "name-heading",
          "data-column-key": "name",
        },
        context: {
          column,
          label: "Name",
          sortDir: undefined,
          sortIndex: undefined,
          toggleSort: vi.fn(),
        },
      },
    ],
    rows: [
      {
        key: data.id,
        row: data,
        index: 0,
        attrs: {
          ref: refs.row,
          role: "row",
          "data-row-id": data.id,
          "aria-rowindex": 2,
          "data-adapttable-part": "row",
        },
        cells: [
          {
            key: "name",
            attrs: {
              ref: refs.cell,
              role: "gridcell",
              tabindex: 0,
              "aria-describedby": "name-heading",
              colspan: 2,
              rowspan: 2,
              "data-column-key": "name",
            },
            context: { row: data, rowIndex: 0, column, value: "Ada" },
          },
        ],
      },
    ],
    columnCount: 2,
    groupToggleProps: () => undefined,
    headerPlan: null,
  };
}

describe("Naive kit-owned prepared-model renderers", () => {
  it("places native semantic attrs, refs and spans on the real table/header/row/cell", async () => {
    const refs = {
      table: vi.fn(),
      header: vi.fn(),
      row: vi.fn(),
      cell: vi.fn(),
    };
    const value = shallowRef(model(refs));
    const view = mount(() =>
      h(NaiveDesktopTable<Row>, {
        model: value.value,
        controls: naiveTableControls<Row>(),
        classNames: {
          table: "host-table",
          thead: "host-head",
          tbody: "host-body",
          th: "host-th",
          td: "host-td",
          tr: "host-row",
        },
      })
    );
    await nextTick();
    const table = view.host.querySelector("table")!;
    const header = view.host.querySelector("th")!;
    const row = view.host.querySelector("tbody tr")!;
    const cell = view.host.querySelector<HTMLTableCellElement>("td")!;
    expect(table.classList.contains("n-table")).toBe(true);
    expect(table.classList.contains("host-table")).toBe(true);
    expect(table.getAttribute("role")).toBe("grid");
    expect(table.getAttribute("aria-label")).toBe("People");
    expect(table.getAttribute("aria-rowcount")).toBe("3");
    expect(table.getAttribute("dir")).toBe("rtl");
    expect(header.id).toBe("name-heading");
    expect(header.getAttribute("role")).toBe("columnheader");
    expect(cell.getAttribute("role")).toBe("gridcell");
    expect(cell.colSpan).toBe(2);
    expect(cell.rowSpan).toBe(2);
    expect(cell.getAttribute("aria-describedby")).toBe(header.id);
    expect(refs.table).toHaveBeenLastCalledWith(table);
    expect(refs.header).toHaveBeenLastCalledWith(header);
    expect(refs.row).toHaveBeenLastCalledWith(row);
    expect(refs.cell).toHaveBeenLastCalledWith(cell);
    expect(view.host.querySelector('[data-adapttable-part="thead"]')).toBe(
      table.tHead
    );
    expect(view.host.querySelector('[data-adapttable-part="tbody"]')).toBe(
      table.tBodies[0]
    );
    expect(
      view.host.querySelector('[data-adapttable-part="header-cell"]')
    ).toBe(header);
    expect(view.host.querySelector('[data-adapttable-part="cell"]')).toBe(cell);
    cell.focus();
    expect(document.activeElement).toBe(cell);
    value.value = model(refs);
    await nextTick();
    expect(view.host.querySelector("td")).toBe(cell);
    expect(refs.cell).toHaveBeenCalledTimes(1);
    view.unmount();
    cleanups.pop();
    for (const ref of Object.values(refs))
      expect(ref).toHaveBeenLastCalledWith(null);
  });

  it("forwards prepared native keyboard and pointer handlers without a second grid controller", async () => {
    const click = vi.fn();
    const keydown = vi.fn();
    const value = model();
    const row = value.rows[0]!;
    const cell = row.cells[0]!;
    const view = mount(() =>
      h(NaiveDesktopTable<Row>, {
        model: {
          ...value,
          rows: [
            {
              ...row,
              cells: [
                {
                  ...cell,
                  attrs: { ...cell.attrs, onClick: click, onKeydown: keydown },
                },
              ],
            },
          ],
        },
        controls: naiveTableControls<Row>(),
      })
    );
    const target = view.host.querySelector<HTMLElement>("td")!;
    target.click();
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    await nextTick();
    expect(click).toHaveBeenCalledTimes(1);
    expect(keydown).toHaveBeenCalledTimes(1);
    expect(keydown.mock.calls[0]![0].target).toBe(target);
  });

  it("paints mobile rows as genuine NCard roots while preserving row identity", () => {
    const value = model();
    const row = value.rows[0]!;
    const mobile: MobileCardsModel<Row> = {
      attrs: { role: "list", "data-adapttable-part": "cards" },
      rows: [
        {
          ...row,
          attrs: {
            role: "listitem",
            "data-adapttable-part": "card",
            "data-row-id": data.id,
          },
          cells: [{ ...row.cells[0]!, attrs: { "data-column-key": "name" } }],
        },
      ],
    };
    const view = mount(() =>
      h(NaiveMobileCards<Row>, {
        model: mobile,
        controls: naiveTableControls<Row>(),
        classNames: { card: "host-card", cardValue: "host-value" },
      })
    );
    const card = view.host.querySelector('[data-adapttable-part="card"]')!;
    expect(card.classList.contains("n-card")).toBe(true);
    expect(card.classList.contains("host-card")).toBe(true);
    expect(card.getAttribute("role")).toBe("listitem");
    expect(card.getAttribute("data-row-id")).toBe("ada");
    expect(card.querySelector("dd")!.textContent).toBe("Ada");
    expect(card.querySelector("dd")!.classList.contains("host-value")).toBe(
      true
    );
    expect(view.host.querySelector("table")).toBeNull();
  });
});
