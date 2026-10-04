import type {
  ColumnDef,
  DataTableHandle,
  RowPinState,
} from "@adapttable/vue/adapter";
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
import { resizableColumns } from "../src/columns";
import {
  cellSpan,
  extraRows,
  pinnedSummaryRows,
  rowActions,
  rowAppearance,
  rowPinning,
} from "../src/rows";
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
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", sortable: true },
  { key: "amount", sortable: true },
];
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
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
function fixture(
  extra: Partial<DataTableProps<Row>>,
  events: Record<string, unknown> = {}
) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns,
    rowKey: (row) => row.id,
    forceMobile: false,
    urlSync: false,
    searchable: false,
    ...extra,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const handle = shallowRef<DataTableHandle<Row> | null>(null);
  const component = defineComponent({
    setup: () => () =>
      h(DataTable<Row>, { ...props.value, ...events, ref: handle }),
  });
  const app = createApp(component);
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, props, handle };
}

describe("native optional rows and columns", () => {
  it.each([false, true])(
    "renders host/add/duplicate/delete actions once with native confirmation, mobile=%s",
    async (mobile) => {
      const run = vi.fn();
      const add = vi.fn();
      const duplicate = vi.fn();
      const remove = vi.fn();
      const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
      const view = fixture({
        forceMobile: mobile,
        features: [
          rowActions<Row>([{ key: "open", label: "Open row", onClick: run }], {
            onAddRow: add,
            onDuplicateRow: duplicate,
            onDeleteRow: remove,
          }),
        ],
        classNames: {
          rowAction: "action-hook",
          addRow: "add-hook",
          actionsCell: "actions-hook",
          cardActions: "cards-actions-hook",
        },
      });
      await settle();
      const actions = view.root.querySelectorAll<HTMLButtonElement>(
        part("row-action")
      );
      expect(actions).toHaveLength(9);
      expect(actions[0]?.classList.contains("action-hook")).toBe(true);
      node<HTMLButtonElement>(
        view.root,
        `${part("row-action")}[aria-label="Open row"]`
      ).click();
      await settle();
      expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
      node<HTMLButtonElement>(view.root, part("add-row")).click();
      expect(add).toHaveBeenCalledTimes(1);
      const duplicateButton = [...actions].find((button) =>
        button.getAttribute("aria-label")?.includes("Duplicate")
      );
      if (!duplicateButton) throw new Error("Missing duplicate");
      duplicateButton.click();
      expect(duplicate).toHaveBeenCalledExactlyOnceWith(rows[0]);
      const deleteButton = [...actions].find((button) =>
        button.getAttribute("aria-label")?.includes("Delete")
      );
      if (!deleteButton) throw new Error("Missing delete");
      deleteButton.click();
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(remove).not.toHaveBeenCalled();
      confirm.mockReturnValue(true);
      deleteButton.click();
      expect(remove).toHaveBeenCalledExactlyOnceWith(rows[0]);
      expect(view.root.textContent).toContain("Core");
    }
  );
  it("forwards custom confirmation and ignores hidden/disabled actions", async () => {
    const run = vi.fn();
    const confirm = vi.fn();
    const view = fixture({
      confirm,
      features: [
        rowActions<Row>([
          {
            key: "hidden",
            label: "Hidden",
            onClick: run,
            isHidden: () => true,
          },
          {
            key: "disabled",
            label: "Disabled",
            onClick: run,
            disabledReason: () => "Locked",
          },
          {
            key: "remove",
            label: "Remove",
            onClick: run,
            confirm: {
              title: "Confirm remove",
              message: (row) => `Remove ${row.team}?`,
              confirmLabel: "Remove now",
            },
          },
        ]),
      ],
    });
    await settle();
    expect(view.root.textContent).not.toContain("Hidden");
    const disabled = node<HTMLButtonElement>(
      view.root,
      `${part("row-action")}[aria-label="Disabled"]`
    );
    expect(disabled.disabled).toBe(true);
    expect(disabled.title).toBe("Locked");
    disabled.click();
    expect(run).not.toHaveBeenCalled();
    node<HTMLButtonElement>(
      view.root,
      `${part("row-action")}[aria-label="Remove"]`
    ).click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({
      title: "Confirm remove",
      message: "Remove Core?",
      confirmLabel: "Remove now",
    });
    expect(run).not.toHaveBeenCalled();
  });
  it("revokes detached action buttons after feature removal", async () => {
    const run = vi.fn();
    const view = fixture({
      features: [
        rowActions<Row>([{ key: "open", label: "Open", onClick: run }]),
      ],
    });
    await settle();
    const button = node<HTMLButtonElement>(view.root, part("row-action"));
    view.props.value = { ...view.props.value, features: [] };
    await settle();
    button.click();
    expect(run).not.toHaveBeenCalled();
    expect(view.root.querySelector(part("actions-header"))).toBeNull();
  });
  it.each([false, true])(
    "pins through the binding model and keeps controlled requests authoritative, mobile=%s",
    async (mobile) => {
      const state = shallowRef<RowPinState>({ top: [], bottom: [] });
      const update = vi.fn();
      const view = fixture({
        forceMobile: mobile,
        features: [
          rowPinning({ pinnedRowIds: state, onPinnedRowIdsChange: update }),
        ],
      });
      await settle();
      const target = node<HTMLElement>(view.root, '[data-row-id="c"]');
      const pin = [
        ...target.querySelectorAll<HTMLButtonElement>(part("row-action")),
      ].find((button) => button.getAttribute("aria-label")?.includes("top"));
      if (!pin) throw new Error("Missing top pin");
      pin.click();
      await settle();
      expect(update).toHaveBeenCalledExactlyOnceWith({
        top: ["c"],
        bottom: [],
      });
      expect(view.handle.value?.getView()?.pinning?.rows).toEqual({
        top: [],
        bottom: [],
      });
      state.value = { top: ["c"], bottom: [] };
      await settle();
      expect(view.handle.value?.getView()?.pinning?.rows).toEqual(state.value);
      expect(
        view.root.querySelector("[data-row-id]")?.getAttribute("data-row-id")
      ).toBe("c");
    }
  );
  it.each([false, true])(
    "preserves independent summary selection geometry and injected extras, mobile=%s",
    async (mobile) => {
      const view = fixture({
        forceMobile: mobile,
        selectable: true,
        features: [
          pinnedSummaryRows<Row>({
            top: [{ id: "total", team: "TOTAL", amount: 6 }],
          }),
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
            rowClassName: (row) => `row-${row.id}`,
            rowStyle: (row) => ({ opacity: row.id === "a" ? 0.5 : 1 }),
            rowHeight: (_row, index) => 30 + index,
          }),
        ],
      });
      await settle();
      expect(view.root.textContent).toContain("TOTAL");
      expect(view.root.textContent).toContain("Important note");
      const first = node<HTMLElement>(view.root, '[data-row-id="a"]');
      expect(first.classList.contains("row-a")).toBe(true);
      expect(first.style.opacity).toBe("0.5");
      expect(
        view.root.querySelectorAll(
          mobile ? "article input[type=checkbox]" : "tbody input[type=checkbox]"
        )
      ).toHaveLength(3);
      if (!mobile) {
        const summary = node<HTMLTableRowElement>(
          view.root,
          `${part("pinned-summary-top")} `
        );
        expect(summary.children).toHaveLength(3);
        expect(summary.querySelector("input")).toBeNull();
      }
    }
  );
  it("inflates desktop spans over native extra rows and leaves mobile values complete", async () => {
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
            render: () => h("span", "Note"),
          },
        ]),
      ],
    });
    await settle();
    expect(
      node<HTMLTableCellElement>(view.root, '[data-row-id="a"] td').rowSpan
    ).toBe(3);
    expect(node(view.root, '[data-row-id="b"]').children).toHaveLength(1);
    view.props.value = { ...view.props.value, forceMobile: true };
    await settle();
    expect(node(view.root, '[data-row-id="b"]').textContent).toContain("Core");
    expect(view.root.querySelector("[rowspan]")).toBeNull();
  });
  it.each(["ltr", "rtl"] as const)(
    "forwards native column resize keyboard handlers in %s",
    async (dir) => {
      const change = vi.fn();
      const view = fixture(
        {
          dir,
          features: [resizableColumns()],
          classNames: { resizeHandle: "resize-hook" },
        },
        { "onUpdate:columnLayout": change }
      );
      await settle();
      const handle = node<HTMLElement>(view.root, part("resize-handle"));
      expect(handle.getAttribute("role")).toBe("button");
      expect(handle.tabIndex).toBe(0);
      expect(handle.classList.contains("resize-hook")).toBe(true);
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
          bubbles: true,
          cancelable: true,
        })
      );
      await settle();
      expect(change).toHaveBeenCalledOnce();
      expect(change.mock.calls[0]?.[0].widths.team).toBeGreaterThanOrEqual(60);
      view.props.value = { ...view.props.value, features: [] };
      await settle();
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      expect(change).toHaveBeenCalledOnce();
    }
  );
  it("hydrates native pin/actions/summary controls and emits no duplicate host requests", async () => {
    const run = vi.fn();
    const props: DataTableProps<Row> = {
      data: rows,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      features: [
        rowActions<Row>([{ key: "open", label: "Open", onClick: run }]),
        rowPinning({ pinnedRowIds: { top: ["c"], bottom: [] } }),
        pinnedSummaryRows<Row>({
          bottom: [{ id: "total", team: "TOTAL", amount: 6 }],
        }),
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
    cleanups.push(() => {
      app.unmount();
      root.remove();
    });
    await settle();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    node<HTMLButtonElement>(
      root,
      `${part("row-action")}[aria-label="Open"]`
    ).click();
    expect(run).toHaveBeenCalledExactlyOnceWith(rows[2]);
  });
});
