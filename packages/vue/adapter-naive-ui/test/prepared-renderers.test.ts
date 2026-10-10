import type {
  ColumnDef,
  DesktopTableModel,
  MobileCardsModel,
  TableRowModel,
} from "@adapttable/vue";
import type { TableChromeSlots } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import { naiveTableControls } from "../src/controls/table";
import { grouping } from "../src/grouping";
import { naiveLoadingState } from "../src/NaiveLoadingState";
import NaiveRowActions from "../src/NaiveRowActions.vue";
import { NaiveDesktopTable } from "../src/renderers/desktop";
import { NaiveMobileCards } from "../src/renderers/mobile";
import { rowActions } from "../src/row-actions";
import { find, mount, part, tick } from "./filter-helpers";

interface Person {
  id: string;
  name: string;
  score: number;
}
const people: Person[] = [
  { id: "b", name: "Bea", score: 2 },
  { id: "a", name: "Ada", score: 1 },
];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score" },
];
const base = (controls: TableChromeSlots<Person>) => controls;

function wire(row: Person, index: number): TableRowModel<Person> {
  return {
    key: row.id,
    row,
    index,
    attrs: { "data-adapttable-part": "row", "data-row-id": row.id },
    cells: columns.map((column) => ({
      key: column.key,
      attrs: { "data-column-key": column.key },
      context: {
        row,
        rowIndex: index,
        column,
        value: column.key === "name" ? row.name : row.score,
      },
    })),
  };
}

function preparedModel(): DesktopTableModel<Person> {
  return {
    attrs: { role: "table", "aria-label": "People" },
    headerRowAttrs: { role: "row" },
    headers: columns.map((column) => ({
      key: column.key,
      column,
      attrs: { scope: "col", role: "columnheader" },
      context: {
        column,
        label: column.header ?? column.key,
        sortDir: undefined,
        sortIndex: undefined,
        toggleSort: vi.fn(),
      },
    })),
    rows: people.map(wire),
    columnCount: 2,
    headerPlan: null,
    groupToggleProps: () => undefined,
  };
}

const controls = base({
  ...naiveTableControls<Person>(),
  RowActions: ({ controls: actions }) =>
    h(NaiveRowActions<Person>, { controls: actions, label: "Actions" }),
  GroupRow: ({ slot }) =>
    h("tr", { "data-adapttable-part": "group-row" }, [
      h("td", `Group ${slot.key}`),
    ]),
});

/** A prepared group header slot over the fixture's rows. */
const groupSlot = (key: string) => ({
  kind: "group" as const,
  key,
  entry: {
    kind: "group" as const,
    key,
    value: key,
    label: key,
    level: 0,
    groupBy: "team",
    path: [key],
    leafRows: people,
    leafIds: people.map((person) => person.id),
    collapsed: false,
  },
});

describe("Naive prepared desktop renderer", () => {
  it("renders a header plan, column spacers, spans, detail and summary", async () => {
    const model = preparedModel();
    const first = model.rows[0];
    if (!first) throw new Error("Missing row fixture");
    const measure = vi.fn();
    const enriched: DesktopTableModel<Person> = {
      ...model,
      columnCount: 4,
      columnSpacers: { start: 25, end: 40 },
      headerPlan: [
        [
          { kind: "leaf", key: "name", columnIndex: 0, rowSpan: 1 },
          { kind: "leaf", key: "score", columnIndex: 1, rowSpan: 1 },
        ],
      ],
      rows: [
        {
          ...first,
          cells: first.cells.map((cell) => ({
            ...cell,
            attrs: { ...cell.attrs, colspan: 2 },
          })),
          detail: {
            expanded: true,
            toggleAttrs: { "aria-label": "Collapse detail" },
            render: () => h("strong", "Prepared detail"),
            measure,
          },
        },
      ],
      summary: {
        cells: columns.map((column) => ({
          key: column.key,
          attrs: {},
          label: column.header ?? column.key,
          context: { column, value: column.key === "score" ? 3 : "Totals" },
        })),
      },
    };
    const { host } = mount(() =>
      NaiveDesktopTable({ model: enriched, controls, density: "compact" })
    );
    await tick();
    expect(host.querySelectorAll(part("header-row"))).toHaveLength(1);
    const roomy = mount(() => NaiveDesktopTable({ model: enriched, controls }));
    await tick();
    const padding = (root: HTMLElement) =>
      find(root, part("table")).style.getPropertyValue("--n-td-padding");
    expect(padding(host)).not.toBe("");
    expect(padding(host)).not.toBe(padding(roomy.host));
    // Start and end spacers in the header row, the body row and the summary.
    expect(
      host.querySelectorAll(
        `${part("column-spacer-start")}, ${part("column-spacer-end")}`
      )
    ).toHaveLength(6);
    expect(
      find(host, part("column-spacer-start")).getAttribute("style")
    ).toContain("width: 25px");
    expect(find(host, part("cell")).getAttribute("colspan")).toBe("2");
    expect(find(host, part("detail-cell")).getAttribute("colspan")).toBe("4");
    expect(host.textContent).toContain("Prepared detail");
    expect(measure).toHaveBeenLastCalledWith(find(host, part("detail-row")));
    expect(find(host, "tfoot").textContent).toContain("Totals");
  });

  it("aligns detail, selection, reorder and action columns with content and footer pads", async () => {
    const model = preparedModel();
    const clicked = vi.fn();
    const action = vi.fn();
    const button = (label: string) =>
      h("button", { type: "button", onClick: clicked }, label);
    const enriched: DesktopTableModel<Person> = {
      ...model,
      expandLabel: "Details",
      reorderLabel: "Order",
      actionsLabel: "Actions",
      columnCount: 6,
      headerCheckboxAttrs: {
        checked: false,
        onChange: vi.fn(),
        "aria-label": "Select all",
      },
      headers: model.headers.map((header, index) =>
        index === 0
          ? {
              ...header,
              rename: (caption) => h("strong", [caption]),
              selection: () => button("Select column"),
              filter: () => button("Filter column"),
              sortAttrs: { "aria-label": "Sort Name", onClick: clicked },
              context: { ...header.context, sortIndex: 1 },
            }
          : {
              ...header,
              column: { ...header.column, headerActions: () => "More" },
            }
      ),
      rows: model.rows.map((row, index) => ({
        ...row,
        checkboxAttrs: {
          checked: false,
          onChange: vi.fn(),
          "aria-label": `Select ${row.row.name}`,
        },
        reorder: () => button("Move row"),
        editActions: () => button("Save row"),
        actionControls: [
          {
            key: "open",
            label: "Open",
            action: { key: "open", label: "Open", onClick: action },
            attrs: { "data-adapttable-part": "action-button", onClick: action },
          },
        ],
        detail:
          index === 0
            ? {
                expanded: false,
                toggleAttrs: { "aria-label": "Expand row", onClick: clicked },
                render: () => "Child",
              }
            : undefined,
      })),
      summary: {
        cells: columns.map((column) => ({
          key: column.key,
          attrs: {},
          label: column.header ?? column.key,
          context: { column, value: 3 },
        })),
      },
    };
    const { host } = mount(() =>
      NaiveDesktopTable({
        model: enriched,
        controls,
        classNames: { expandHeader: "expand-head", expandCell: "expand-cell" },
      })
    );
    await tick();
    expect(find(host, part("expand-header")).classList).toContain(
      "expand-head"
    );
    expect(find(host, part("expand-cell")).classList).toContain("expand-cell");
    expect(find(host, part("reorder-header")).textContent).toBe("Order");
    expect(find(host, part("actions-header")).textContent).toBe("Actions");
    expect(find(host, part("sort-index")).textContent).toBe("1");
    expect(find(host, part("header-actions")).textContent).toBe("More");
    expect(host.querySelectorAll(`tfoot ${part("summary-cell")}`)).toHaveLength(
      6
    );
    find<HTMLButtonElement>(host, '[aria-label="Expand row"]').click();
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(find(host, "tbody").textContent).toContain("Move row");
    expect(find(host, "tbody").textContent).toContain("Save row");
    find<HTMLButtonElement>(host, part("action-button")).click();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("renders prepared body slots in order, with groups, virtual pads and uncovered extra spans", async () => {
    const model = preparedModel();
    const first = model.rows[0];
    if (!first) throw new Error("Missing row fixture");
    const enriched: DesktopTableModel<Person> = {
      ...model,
      bodySlots: [
        { kind: "virtualPad", key: "pad-top", height: 80, colSpan: 2 },
        {
          kind: "extra",
          key: "notice",
          extraKind: "fullWidth",
          colSpan: 3,
          coveredSlots: new Set([1]),
          render: () => "Prepared notice",
        },
        { kind: "row", key: first.key, wiring: first },
        groupSlot("core"),
        { kind: "virtualPad", key: "pad-bottom", height: 120, colSpan: 2 },
      ],
    };
    const { host } = mount(() =>
      NaiveDesktopTable({ model: enriched, controls })
    );
    await tick();
    const body = [...host.querySelectorAll("tbody > tr")];
    expect(body.map((row) => row.getAttribute("data-adapttable-part"))).toEqual(
      ["virtual-spacer", "full-width-row", "row", "group-row", "virtual-spacer"]
    );
    expect(body[0]?.querySelector("td")?.getAttribute("style")).toContain(
      "height: 80px"
    );
    expect(
      [...(body[1]?.querySelectorAll("td") ?? [])].map((cell) =>
        cell.getAttribute("colspan")
      )
    ).toEqual(["1", "1"]);
    expect(body[1]?.textContent).toBe("Prepared notice");
    expect(body[3]?.textContent).toBe("Group core");
  });
});

describe("Naive prepared mobile cards", () => {
  it("renders extras, groups, pads, detail, actions and a filtered summary", async () => {
    const base = preparedModel();
    const original = base.rows[0];
    if (!original) throw new Error("Missing row fixture");
    const action = vi.fn();
    const measure = vi.fn();
    const row: TableRowModel<Person> = {
      ...original,
      attrs: { role: "listitem", "data-adapttable-part": "card" },
      editActions: () => h("span", "Prepared edit actions"),
      actionControls: [
        {
          key: "open",
          label: "Open row",
          action: { key: "open", label: "Open row", onClick: action },
          attrs: { "data-adapttable-part": "action-button", onClick: action },
        },
      ],
      detail: {
        expanded: true,
        toggleAttrs: { "aria-label": "Collapse detail" },
        render: () => "Prepared child",
        measure,
      },
    };
    const model: MobileCardsModel<Person> = {
      attrs: { role: "list" },
      rows: [],
      bodySlots: [
        { kind: "virtualPad", key: "pad-top", height: 15, colSpan: 1 },
        {
          kind: "extra",
          key: "notice",
          extraKind: "separator",
          colSpan: 1,
          render: () => "Prepared notice",
        },
        groupSlot("core"),
        { kind: "row", key: row.key, wiring: row },
      ],
      summary: {
        cells: [
          {
            key: "score",
            attrs: {},
            label: "Score",
            context: { column: columns[1]!, value: 3 },
          },
          {
            key: "empty",
            attrs: {},
            label: "Empty",
            context: { column: { key: "empty" }, value: undefined },
          },
        ],
      },
    };
    const { host } = mount(() => NaiveMobileCards({ model, controls }));
    await tick();
    expect(find(host, part("virtual-spacer")).getAttribute("style")).toContain(
      "height: 15px"
    );
    expect(find(host, part("separator-cell")).textContent).toBe(
      "Prepared notice"
    );
    expect(find(host, part("group-row")).textContent).toBe("Group core");
    expect(find(host, part("card-detail")).textContent).toBe("Prepared child");
    expect(measure).not.toHaveBeenCalledWith(null);
    expect(find(host, part("card-actions")).textContent).toContain(
      "Prepared edit actions"
    );
    find<HTMLButtonElement>(host, part("action-button")).click();
    expect(action).toHaveBeenCalledTimes(1);
    const summary = find(host, part("summary-card"));
    expect(summary.textContent).toContain("3");
    expect(summary.textContent).not.toContain("Empty");
  });
});

describe("Naive table surfaces over the real binding", () => {
  it("renders grouped column headers and delegates collapse to the binding", async () => {
    const { host } = mount(() =>
      h(DataTable<Person>, {
        data: people,
        columns: [{ header: "Identity", children: columns }],
        rowKey: (row: Person) => row.id,
        urlSync: false,
        forceMobile: false,
        collapsibleColumnGroups: true,
      })
    );
    await tick();
    const group = find(host, part("header-group-cell"));
    expect(group.tagName).toBe("TH");
    expect(group.getAttribute("colspan")).toBe("2");
    const toggle = find<HTMLButtonElement>(host, part("column-group-toggle"));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.click();
    await tick();
    expect(
      find(host, part("column-group-toggle")).getAttribute("aria-expanded")
    ).toBe("false");
  });

  it.each([false, true])(
    "renders grouped rows with Naive disclosure controls, mobile=%s",
    async (mobile) => {
      const { host } = mount(() =>
        h(DataTable<Person>, {
          data: people,
          columns,
          rowKey: (row: Person) => row.id,
          urlSync: false,
          forceMobile: mobile,
          features: [grouping("score")],
        })
      );
      await tick();
      const toggle = find<HTMLButtonElement>(host, part("group-toggle"));
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      toggle.click();
      await tick();
      expect(
        find(host, part("group-toggle")).getAttribute("aria-expanded")
      ).toBe("false");
    }
  );

  it.each([false, true])(
    "renders inline row actions and a menu behind one trigger, mobile=%s",
    async (mobile) => {
      const open = vi.fn();
      const table = (layout?: "menu") =>
        mount(() =>
          h(DataTable<Person>, {
            data: people,
            columns,
            rowKey: (row: Person) => row.id,
            urlSync: false,
            forceMobile: mobile,
            rowActionsLayout: layout,
            classNames: {
              rowActionsMenu: "custom-menu",
              rowActionsTrigger: "custom-trigger",
            },
            features: [
              rowActions<Person>([
                { key: "open", label: "Open", onClick: open },
              ]),
            ],
          })
        );
      const inline = table();
      await tick();
      expect(inline.host.querySelector(part("row-actions-trigger"))).toBeNull();
      find<HTMLButtonElement>(inline.host, part("action-button")).click();
      expect(open).toHaveBeenCalledExactlyOnceWith(people[0]);
      inline.stop();

      const menu = table("menu");
      await tick();
      const trigger = find<HTMLButtonElement>(
        menu.host,
        part("row-actions-trigger")
      );
      expect(trigger.classList).toContain("custom-trigger");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      trigger.click();
      await tick();
      const surface = await vi.waitFor(() =>
        find(document.body, part("row-actions-menu"))
      );
      expect(surface.classList).toContain("custom-menu");
      expect(surface.getAttribute("role")).toBe("dialog");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      surface.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await tick();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
      trigger.click();
      await tick();
      const item = await vi.waitFor(() =>
        find<HTMLButtonElement>(
          find(document.body, part("row-actions-menu")),
          part("action-button")
        )
      );
      item.click();
      await tick();
      expect(open).toHaveBeenCalledTimes(2);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    }
  );

  it.each([false, true])(
    "paints decorative skeletons in the kit's table and cards, mobile=%s",
    async (mobile) => {
      const { host } = mount(() =>
        naiveLoadingState({
          rows: 2.7,
          columns: 3.2,
          mobile,
          classNames: { loadingLine: "line-paint" },
        })
      );
      await tick();
      expect(
        host.querySelector(part(mobile ? "loading-cards" : "loading-table"))
      ).not.toBeNull();
      expect(
        host.querySelectorAll(part(mobile ? "loading-card" : "loading-row"))
      ).toHaveLength(2);
      // Two placeholder rows of three lines, plus a header row on desktop.
      expect(host.querySelectorAll(part("loading-line"))).toHaveLength(
        mobile ? 6 : 9
      );
      expect(find(host, part("loading-line")).classList).toContain(
        "line-paint"
      );
    }
  );
});

describe("Naive row actions in right-to-left tables", () => {
  it("opens the menu surface in the table's direction", async () => {
    const { host } = mount(() =>
      h(DataTable<Person>, {
        data: people,
        columns,
        rowKey: (row: Person) => row.id,
        urlSync: false,
        forceMobile: false,
        dir: "rtl",
        rowActionsLayout: "menu",
        features: [
          rowActions<Person>([
            { key: "open", label: "Open", onClick: vi.fn() },
          ]),
        ],
      })
    );
    await tick();
    find<HTMLButtonElement>(host, part("row-actions-trigger")).click();
    await tick();
    const surface = await vi.waitFor(() =>
      find(document.body, part("row-actions-menu"))
    );
    expect(surface.getAttribute("dir")).toBe("rtl");
  });
});
