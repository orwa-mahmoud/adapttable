import {
  type ConfirmRequest,
  createMemoryAdapter,
  resolveLabels,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { aggregate } from "../src/aggregate/aggregate";
import { computed as computedColumn } from "../src/columns/computed";
import {
  cellSpan,
  collapsibleColumnGroups,
  extraRows,
  fitColumns,
  multiSort,
  pinnedSummaryRows,
  resizableColumns,
  rowAppearance,
} from "../src/features/headlessFactories";
import { rowActions, rowActionsModelKey } from "../src/features/rowActions";
import { rowPinning } from "../src/features/rowPinning";
import type { TableFeature } from "../src/features/tableFeature";
import {
  COLUMN_RESIZE_MODEL,
  rowPinningModelKey,
} from "../src/layout/modelChannels";
import { rowActionControls } from "../src/rows/rowActionControls";
import { useRowMutations } from "../src/rows/rowMutations";
import { useRowPinning } from "../src/rows/rowPinning";
import { useDataTableShell } from "../src/useDataTableShell";
const rows = [
  { id: "a", team: "blue", amount: 2 },
  { id: "b", team: "blue", amount: 4 },
  { id: "c", team: "red", amount: 3 },
];
type Row = (typeof rows)[number];
const columns = [
  { key: "team", sortable: true, accessor: (row: Row) => row.team },
  { key: "amount", sortable: true, accessor: (row: Row) => row.amount },
];
function shell(features: readonly TableFeature<Row>[]) {
  const current = shallowRef(features);
  const scope = effectScope();
  const table = scope.run(() =>
    useDataTableShell({
      data: rows,
      columns,
      rowKey: (row: Row) => row.id,
      features: current,
      urlSync: false,
    })
  );
  if (!table) throw new Error("scope did not run");
  return { scope, table, current };
}
describe("optional headless factories", () => {
  it("multiSort uses source sorting and removes only its patch", () => {
    const test = shell([multiSort()]);
    const attrs = test.table.table.sortButtonAttrs(required(columns[0]));
    (attrs.onClick as (event: { shiftKey: boolean }) => void)({
      shiftKey: true,
    });
    expect(test.table.source.value.sortLevels).toEqual([
      { key: "team", dir: "asc" },
    ]);
    (
      test.table.table.sortButtonAttrs(required(columns[1]))
        .onClick as (event: { shiftKey: boolean }) => void
    )({ shiftKey: true });
    expect(test.table.source.value.sortLevels).toHaveLength(2);
    test.current.value = [];
    expect(test.table.featureOptions.value.multiSort).toBeUndefined();
    test.scope.stop();
  });
  it("fitColumns actually supplies flex sizing and retracts on replacement", () => {
    const test = shell([fitColumns()]);
    expect(test.table.desktop.value.attrs.style).toMatchObject({
      width: "100%",
    });
    expect(
      test.table.table.headerCellAttrs(required(columns[0])).style
    ).toMatchObject({
      width: "50%",
    });
    test.current.value = [];
    expect(test.table.featureOptions.value.fitColumns).toBeUndefined();
    expect(
      test.table.table.headerCellAttrs(required(columns[0])).style
    ).not.toMatchObject({ width: "50%" });
    test.scope.stop();
  });
  it("column groups collapse through the same controlled layout", () => {
    const scope = effectScope();
    const change = vi.fn();
    const table = scope.run(() =>
      useDataTableShell({
        data: rows,
        rowKey: (row: Row) => row.id,
        columns: [{ key: "group", header: "Both", children: columns }],
        features: [collapsibleColumnGroups()],
        urlSync: false,
        onColumnLayoutChange: change,
      })
    );
    table!.table.layout.value.toggleColumnGroup("group");
    expect(table!.table.layout.value.state.collapsedGroups).toContain("group");
    scope.stop();
  });
  it("cell spans omit covered cells and extra rows inflate spans", () => {
    const test = shell([
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
    ]);
    const slots = test.table.desktop.value.bodySlots!;
    expect(slots.map((slot) => slot.kind)).toEqual([
      "row",
      "extra",
      "row",
      "row",
    ]);
    const first = required(slots[0]);
    if (first.kind !== "row") throw new Error("missing row");
    expect(required(first.wiring.cells[0]).attrs.rowspan).toBe(3);
    const second = required(slots[2]);
    if (second.kind !== "row") throw new Error("missing row");
    expect(second.wiring.cells.map((cell) => cell.key)).toEqual(["amount"]);
    const mobile = required(test.table.mobile.value.bodySlots![0]);
    if (mobile.kind !== "row") throw new Error("missing card");
    expect(mobile.wiring.cells).toHaveLength(2);
    expect(mobile.wiring.attrs.role).toBe("listitem");
    expect(required(mobile.wiring.cells[0]).attrs.role).toBeUndefined();
    expect(required(mobile.wiring.cells[0]).attrs.rowspan).toBeUndefined();
    test.current.value = [];
    expect(test.table.desktop.value.bodySlots).toBeUndefined();
    test.scope.stop();
  });
  it("pinned summary rows are outside source and selection", () => {
    const summary = { id: "total", team: "All", amount: 9 };
    const test = shell([pinnedSummaryRows({ top: [summary] })]);
    const slot = required(test.table.desktop.value.bodySlots![0]);
    if (slot.kind !== "row") throw new Error("missing summary");
    expect(slot.key).toBe("adapttable:pinned-summary:top:0");
    expect(slot.wiring.checkboxAttrs).toBeUndefined();
    expect(slot.wiring.row).toBe(summary);
    expect(test.table.source.value.rows).toEqual(rows);
    test.scope.stop();
  });
  it("row appearance applies to desktop and cards without mutating data", () => {
    const style = vi.fn((row: Row) => ({ opacity: row.id === "a" ? 0.5 : 1 }));
    const test = shell([
      rowAppearance<Row>({
        rowClassName: (row) => row.id,
        rowStyle: style,
        rowHeight: (_, index) => 30 + index,
      }),
    ]);
    const slot = required(test.table.desktop.value.bodySlots![1]);
    if (slot.kind !== "row") throw new Error("missing row");
    expect(slot.wiring.attrs.class).toBe("b");
    expect(slot.wiring.attrs.style).toMatchObject({
      opacity: 1,
      height: "31px",
    });
    test.scope.stop();
  });
  it("row pinning reorders rows, publishes live runtime, and revokes retained actions", () => {
    const test = shell([rowPinning()]);
    const model = test.table.state.get(rowPinningModelKey<Row>()).value!;
    model.pin("c", "top");
    expect(test.table.runtime.view()?.pinning?.rows?.top).toEqual(["c"]);
    expect(required(test.table.desktop.value.bodySlots![0]).key).toBe("c");
    test.current.value = [];
    model.pin("a", "bottom");
    expect(
      test.table.state.get(rowPinningModelKey<Row>()).value
    ).toBeUndefined();
    expect(test.table.runtime.view()?.pinning?.setRowPin).toBeUndefined();
    test.scope.stop();
  });
  it("controlled pin callbacks never publish unaccepted host state", () => {
    const pins = shallowRef({ top: ["a"], bottom: [] as string[] });
    const notify = vi.fn();
    const test = shell([
      rowPinning({ pinnedRowIds: pins, onPinnedRowIdsChange: notify }),
    ]);
    test.table.state.get(rowPinningModelKey<Row>()).value!.pin("b", "bottom");
    expect(notify).toHaveBeenCalledWith({ top: ["a"], bottom: ["b"] });
    expect(test.table.runtime.view()?.pinning?.rows).toEqual(pins.value);
    test.scope.stop();
  });
  it("pin URL state stays namespaced, updates from navigation and unsubscribes", () => {
    const backend = createMemoryAdapter("left.rowPin=a%3Atop&unrelated=keep");
    let listeners = 0;
    const adapter = {
      ...backend,
      subscribe: (listener: () => void) => {
        listeners++;
        const stop = backend.subscribe(listener);
        return () => {
          listeners--;
          stop();
        };
      },
    };
    const scope = effectScope();
    const table = scope.run(() =>
      useDataTableShell({
        data: rows,
        columns,
        rowKey: (row: Row) => row.id,
        features: [rowPinning()],
        urlAdapter: adapter,
        urlKey: "left",
      })
    )!;
    const model = table.state.get(rowPinningModelKey<Row>()).value!;
    expect(model.state.top).toEqual(["a"]);
    model.pin("c", "bottom");
    expect(adapter.getSearch()).toContain("unrelated=keep");
    expect(table.runtime.view()?.pinning?.rows?.bottom).toEqual(["c"]);
    scope.stop();
    expect(listeners).toBe(0);
    model.pin("b", "top");
    expect(adapter.getSearch()).not.toContain("b%3Atop");
  });
  it("row actions preserve host promises and replacement callbacks, then revoke", async () => {
    const first = vi.fn(() => Promise.resolve(42));
    const second = vi.fn(() => Promise.resolve(84));
    const test = shell([
      rowActions<Row>([], { onAddRow: first, onDeleteRow: first }),
    ]);
    const model = test.table.state.get(rowActionsModelKey<Row>()).value!;
    expect(await model.addRow()).toBe(42);
    expect(required(model.actions[0]).confirm?.danger).toBe(true);
    test.current.value = [
      rowActions<Row>([], { onAddRow: second, confirmDeleteRow: false }),
    ];
    expect(
      await test.table.state.get(rowActionsModelKey<Row>()).value!.addRow()
    ).toBe(84);
    test.current.value = [];
    expect(model.addRow()).toBeUndefined();
    expect(first).toHaveBeenCalledTimes(1);
    test.scope.stop();
  });
});
describe("standalone Vue row models", () => {
  it("uncontrolled pins notify without mutating input and stale actions are inert", () => {
    const scope = effectScope();
    const changed = vi.fn();
    const model = scope.run(() =>
      useRowPinning<Row>({
        enabled: true,
        getRowId: (row) => row.id,
        labels: resolveLabels(undefined),
        onPinnedRowIdsChange: changed,
      })
    )!;
    const pin = model.value.pin;
    pin("a", "top");
    expect(model.value.state.top).toEqual(["a"]);
    expect(changed).toHaveBeenCalledTimes(1);
    scope.stop();
    pin("b", "top");
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it("callback getters update while host rows remain untouched", async () => {
    const scope = effectScope();
    const save = vi.fn((row: Row) => Promise.resolve(row.id));
    const opts = shallowRef({
      labels: resolveLabels(undefined),
      onDuplicateRow: save,
    });
    const model = scope.run(() => useRowMutations<Row>(() => opts.value))!;
    const action = required(model.value.actions[0]);
    expect(await action.onClick?.(required(rows[0]))).toBe("a");
    expect(required(rows[0]).amount).toBe(2);
    scope.stop();
    await action.onClick?.(required(rows[1]));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
describe("rendering helpers", () => {
  it("aggregates neutral built-ins and Vue custom content", () => {
    const vnode = h("strong", "Total");
    expect(aggregate<Row>({ amount: "sum" })(rows)).toEqual({ amount: 9 });
    expect(aggregate<Row>({ team: () => vnode })(rows).team).toBe(vnode);
  });
  it("computed columns share memoized value across rendering, sorting and export", () => {
    const value = vi.fn((row: Row) => row.amount * 2);
    const column = computedColumn<Row, number>({
      key: "double",
      deps: (row) => [row.amount],
      value,
      format: (number) => `$${number}`,
    });
    const row = { ...required(rows[0]) };
    expect(column.accessor?.(row)).toBe(4);
    expect(column.sortValue?.(row)).toBe(4);
    expect(column.exportValue?.(row)).toBe(4);
    expect(column.formatValue?.(row)).toBe("$4");
    expect(value).toHaveBeenCalledTimes(1);
    row.amount = 5;
    expect(column.accessor?.(row)).toBe(10);
    expect(value).toHaveBeenCalledTimes(2);
  });
});

describe("lifetime and adapter controls", () => {
  it("resizableColumns removes pending drag listeners and invalidates old handles", () => {
    let pending: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
      pending = run;
      return 2;
    });
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const test = shell([resizableColumns()]);
    const model = test.table.state.get(COLUMN_RESIZE_MODEL).value!;
    const attrs = model.attrs("team", "Resize team")!;
    const node = document.createElement("table");
    node.dir = "ltr";
    node.innerHTML = "<thead><tr><th><span></span></th></tr></thead>";
    document.body.append(node);
    vi.spyOn(
      node.querySelector("th")!,
      "getBoundingClientRect"
    ).mockReturnValue({ width: 150 } as DOMRect);
    const event = {
      currentTarget: node.querySelector("span")!,
      clientX: 100,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    (attrs.onPointerdown as (event: unknown) => void)(event);
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 125 }));
    test.current.value = [];
    pending?.(0);
    document.dispatchEvent(new MouseEvent("pointerup"));
    expect(cancel).toHaveBeenCalledWith(2);
    expect(test.table.table.layout.value.state.widths.team).toBeUndefined();
    (attrs.onKeydown as (event: unknown) => void)({
      ...event,
      key: "ArrowRight",
    });
    expect(test.table.table.layout.value.state.widths.team).toBeUndefined();
    expect(
      required(test.table.desktop.value.headers[0]).resizeAttrs
    ).toBeUndefined();
    test.scope.stop();
    node.remove();
    vi.unstubAllGlobals();
  });
  it("row controls use required confirmation and recheck a delayed acceptance", () => {
    const run = vi.fn();
    let active = true;
    let request: ConfirmRequest | undefined;
    const actions = [
      { key: "hidden", label: "Hidden", isHidden: () => true },
      {
        key: "disabled",
        label: "Disabled",
        disabledReason: () => "Wait",
        onClick: run,
      },
      {
        key: "remove",
        label: "Remove",
        onClick: run,
        confirm: {
          title: "Remove",
          message: () => "Sure?",
          confirmLabel: "Yes",
        },
      },
    ];
    const controls = rowActionControls({
      row: required(rows[0]),
      actions,
      confirm: (value) => {
        request = value;
      },
      cancelLabel: "Cancel",
      enabled: () => active,
    });
    expect(controls.map((control) => control.key)).toEqual([
      "disabled",
      "remove",
    ]);
    expect(required(controls[0]).attrs.disabled).toBe(true);
    (required(controls[0]).attrs.onClick as () => void)();
    expect(run).not.toHaveBeenCalled();
    (required(controls[1]).attrs.onClick as () => void)();
    expect(request?.cancelLabel).toBe("Cancel");
    active = false;
    request?.onConfirm();
    expect(run).not.toHaveBeenCalled();
  });
  it("SSR creates no URL subscription and publishes no live resize or pin setter", async () => {
    const adapter = createMemoryAdapter("rowPin=a%3Atop");
    const subscribe = vi.spyOn(adapter, "subscribe");
    let live: ReturnType<typeof useDataTableShell<Row>> | undefined;
    const app = createSSRApp({
      setup() {
        live = useDataTableShell({
          data: rows,
          columns,
          rowKey: (row: Row) => row.id,
          urlAdapter: adapter,
          features: [
            rowPinning(),
            resizableColumns(),
            rowActions<Row>([], { onAddRow: () => undefined }),
          ],
        });
        return () => h("div", String(live?.source.value.rows.length));
      },
    });
    expect(await renderToString(app)).toContain("3");
    expect(subscribe).not.toHaveBeenCalled();
    expect(live?.state.get(COLUMN_RESIZE_MODEL).value).toBeUndefined();
    expect(live?.runtime.view()?.pinning?.setRowPin).toBeUndefined();
  });
});

describe("suspended feature resources", () => {
  it("deactivation unsubscribes late-added pins, aborts resize and reactivates with fresh controls", async () => {
    const backend = createMemoryAdapter();
    let listeners = 0;
    const adapter = {
      ...backend,
      subscribe: (listener: () => void) => {
        listeners += 1;
        const stop = backend.subscribe(listener);
        return () => {
          listeners -= 1;
          stop();
        };
      },
    };
    const visible = shallowRef(true);
    const features = shallowRef<readonly TableFeature<Row>[]>([]);
    let table: ReturnType<typeof useDataTableShell<Row>> | undefined;
    const Child = {
      setup() {
        table = useDataTableShell({
          data: rows,
          columns,
          rowKey: (row: Row) => row.id,
          features,
          urlAdapter: adapter,
        });
        return () => h("div", "Table");
      },
    };
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Child) : h("span")),
        }),
    });
    app.mount(host);
    await nextTick();
    features.value = [rowPinning(), resizableColumns()];
    await nextTick();
    expect(listeners).toBeGreaterThan(1);
    const pin = table?.state.get(rowPinningModelKey<Row>()).value;
    const resize = table?.state.get(COLUMN_RESIZE_MODEL).value;
    expect(pin).toBeDefined();
    expect(resize).toBeDefined();
    pin?.pin("a", "top");
    visible.value = false;
    await nextTick();
    expect(listeners).toBe(0);
    expect(table?.state.get(COLUMN_RESIZE_MODEL).value).toBeUndefined();
    pin?.pin("b", "bottom");
    expect(adapter.getSearch()).not.toContain("b%3Abottom");
    visible.value = true;
    await nextTick();
    expect(listeners).toBeGreaterThan(1);
    expect(table?.state.get(COLUMN_RESIZE_MODEL).value).not.toBe(resize);
    expect(
      table?.state.get(rowPinningModelKey<Row>()).value?.state.top
    ).toEqual(["a"]);
    app.unmount();
    host.remove();
    expect(listeners).toBe(0);
  });
});

describe("current commands and boundaries", () => {
  it("host action commands stay distinct from built-in row mutation actions", () => {
    const old = vi.fn();
    const latest = vi.fn();
    const test = shell([
      rowActions<Row>([{ key: "open", label: "Open", onClick: old }], {
        onDeleteRow: vi.fn(),
        onDuplicateRow: vi.fn(),
      }),
    ]);
    const model = test.table.state.get(rowActionsModelKey<Row>()).value!;
    expect(model.rowActions?.map((action) => action.key)).toEqual([
      "open",
      "adapttable:duplicate-row",
      "adapttable:delete-row",
    ]);
    const click = model.rowActions?.[0]?.onClick;
    click?.(required(rows[0]));
    expect(old).toHaveBeenCalledWith(required(rows[0]));
    test.current.value = [
      rowActions<Row>([{ key: "open", label: "Open", onClick: latest }]),
    ];
    click?.(required(rows[1]));
    expect(latest).not.toHaveBeenCalled();
    test.table.state
      .get(rowActionsModelKey<Row>())
      .value?.rowActions?.[0]?.onClick?.(required(rows[1]));
    expect(latest).toHaveBeenCalledWith(required(rows[1]));
    expect(
      test.table.runtime.view()?.actions?.row.map((action) => action.key)
    ).toEqual(["open"]);
    test.table.table.layout.value.setHidden("__actions", true);
    expect(
      test.table.runtime.view()?.actions?.row.map((action) => action.key)
    ).toEqual(["open"]);
    test.current.value = [];
    click?.(required(rows[0]));
    expect(latest).toHaveBeenCalledTimes(1);
    test.scope.stop();
  });
  it("mounted resize keyboard writes actual layout and ignores removed columns", () => {
    const test = shell([resizableColumns()]);
    const model = test.table.state.get(COLUMN_RESIZE_MODEL).value!;
    const attrs = model.attrs("team", "Resize")!;
    const table = document.createElement("table");
    table.dir = "rtl";
    table.innerHTML = "<thead><tr><th><span></span></th></tr></thead>";
    document.body.append(table);
    vi.spyOn(
      table.querySelector("th")!,
      "getBoundingClientRect"
    ).mockReturnValue({ width: 150 } as DOMRect);
    const event = {
      currentTarget: table.querySelector("span"),
      key: "ArrowLeft",
      preventDefault: vi.fn(),
    };
    (attrs.onKeydown as (event: unknown) => void)(event);
    expect(test.table.table.layout.value.state.widths.team).toBe(166);
    const missing = model.attrs("missing", "Missing")!;
    (missing.onKeydown as (event: unknown) => void)(event);
    expect(test.table.table.layout.value.state.widths.missing).toBeUndefined();
    test.scope.stop();
    table.remove();
  });
  it("unpin uses current state and mutation remove preserves the callback promise", async () => {
    const scope = effectScope();
    const callback = vi.fn(() => Promise.resolve("removed"));
    const pins = scope.run(() =>
      useRowPinning<Row>({
        enabled: true,
        getRowId: (row) => row.id,
        labels: resolveLabels(undefined),
      })
    )!;
    pins.value.pin("a", "top");
    required(pins.value.actions[2])?.onClick?.(required(rows[0]));
    expect(pins.value.state.top).toEqual([]);
    const mutations = scope.run(() =>
      useRowMutations<Row>({
        labels: resolveLabels(undefined),
        onDeleteRow: callback,
        confirmDeleteRow: false,
      })
    )!;
    expect(required(mutations.value.actions[0])?.confirm).toBeUndefined();
    expect(
      await required(mutations.value.actions[0])?.onClick?.(required(rows[0]))
    ).toBe("removed");
    scope.stop();
  });
});

describe("composed body feature removal", () => {
  it("retracts each removed family while retaining the other body behavior", () => {
    const summary = { id: "sum", team: "All", amount: 9 };
    const test = shell([
      cellSpan<Row>(({ row, column }) =>
        row.id === "a" && column.key === "team" ? { rowSpan: 2 } : undefined
      ),
      extraRows([{ key: "note", kind: "separator", beforeRowId: "b" }]),
      pinnedSummaryRows({ top: [summary] }),
      rowAppearance<Row>({ rowClassName: () => "marked" }),
    ]);
    test.current.value = test.current.value.filter(
      (feature) => feature.id !== "row-appearance"
    );
    const summarySlot = test.table.desktop.value.bodySlots?.[0];
    expect(
      summarySlot?.kind === "row" ? summarySlot.wiring.attrs.class : undefined
    ).toBeUndefined();
    test.current.value = test.current.value.filter(
      (feature) => feature.id !== "pinned-summary-rows"
    );
    expect(test.table.desktop.value.bodySlots?.[0]?.key).toBe("a");
    test.current.value = test.current.value.filter(
      (feature) => feature.id !== "cell-span"
    );
    const second = test.table.desktop.value.bodySlots?.find(
      (slot) => slot.key === "b"
    );
    expect(
      second?.kind === "row" ? second.wiring.cells.length : undefined
    ).toBe(2);
    expect(
      test.table.desktop.value.bodySlots?.some((slot) => slot.kind === "extra")
    ).toBe(true);
    test.current.value = [];
    expect(test.table.desktop.value.bodySlots).toBeUndefined();
    expect(test.table.source.value.rows).toEqual(rows);
    test.scope.stop();
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected fixture value");
  return value;
}
