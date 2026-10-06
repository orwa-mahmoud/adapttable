import { createMemoryAdapter, resolveLabels } from "@adapttable/core";
import { slotRender } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { PivotPanelChrome, type PivotPanelSlots } from "../src/adapter";
import { extendFeature } from "../src/features/tableFeature";
import {
  buildFormulaColumns,
  deserializeFormulaColumns,
  serializeFormulaColumns,
  useFormulaUrlState,
} from "../src/formula";
import type { TableBodySlot } from "../src/layout/tableModels";
import {
  pivot,
  type PivotConfig,
  pivotTableModel,
  usePivotUrlState,
} from "../src/pivot";
import { Sparkline, sparklineColumn } from "../src/sparkline";
import {
  rowReorder,
  RowReorderChrome,
  rowReorderControlKey,
  type RowReorderControlSlots,
  useRowReorder,
} from "../src/specialized/rowReorder";
import { virtualize, windowBodySlots } from "../src/specialized/virtualize";
import { useRowPatchStream } from "../src/stream";
import { useDataTableShell } from "../src/useDataTableShell";
import { FakeSocket } from "./fixtures/streamSocket";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture absent");
  return value;
}
function render(node: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render: node });
  app.mount(root);
  return {
    root,
    stop: () => {
      app.unmount();
      root.remove();
    },
  };
}
const rows = [
  { id: "a", score: 4 },
  { id: "b", score: 8 },
];
describe("specialized opt-in data entries", () => {
  it("keeps formula errors, cycles, display, exports and safe serialization", () => {
    const specs = [
      { key: "double", header: "Twice", formula: "score * 2" },
      { key: "bad", formula: "1 +" },
      { key: "cycle", formula: "cycle + 1" },
    ];
    const result = buildFormulaColumns<(typeof rows)[number]>(specs);
    expect(result.columns[0]?.accessor?.(rows[0]!)).toBe("8");
    expect(result.columns[0]?.header).toBe("Twice");
    expect(result.errors.bad).toBeTruthy();
    expect(result.cycles).toContain("cycle");
    expect(deserializeFormulaColumns(serializeFormulaColumns(specs))).toEqual(
      specs
    );
    expect(
      buildFormulaColumns(
        deserializeFormulaColumns("javascript:alert(1)")
      ).columns[0]?.accessor?.({})
    ).toBe("#NAME?");
  });
  it("retains adjacent pivot URL changes and isolates replaced namespaces", () => {
    const scope = effectScope();
    const adapter = createMemoryAdapter();
    const key = shallowRef("a");
    const state = required(
      scope.run(() =>
        usePivotUrlState(() => ({ urlAdapter: adapter, urlKey: key }))
      )
    );
    const config = {
      rows: ["team"],
      columns: [],
      measures: [{ key: "score", agg: "sum" as const }],
    };
    state.onConfigChange(config);
    state.onCollapsedChange(new Set(["team:a"]));
    state.flush();
    expect(state.config.value).toEqual(config);
    expect(state.collapsed.value.has("team:a")).toBe(true);
    key.value = "b";
    expect(state.config.value.rows).toEqual([]);
    key.value = "a";
    expect(state.config.value).toEqual(config);
    scope.stop();
    state.onConfigChange({ ...config, rows: [] });
    expect(state.config.value).toEqual(config);
  });
  it("serializes formula URL writes with a replaceable default and scope disposal", () => {
    const scope = effectScope();
    const adapter = createMemoryAdapter();
    const state = required(
      scope.run(() =>
        useFormulaUrlState({ urlAdapter: adapter, urlKey: "sales" })
      )
    );
    state.onFormulasChange([{ key: "n", formula: "1/0" }]);
    state.flush();
    expect(adapter.getSearch()).toContain("formula");
    expect(state.formulas.value[0]?.formula).toBe("1/0");
    scope.stop();
  });
  it("maps pivot totals and row headers onto normal table columns", () => {
    const result = pivot(
      [
        { team: "A", score: 4 },
        { team: "A", score: 6 },
      ],
      { rows: ["team"], columns: [], measures: [{ key: "score", agg: "sum" }] }
    );
    const model = pivotTableModel(result);
    expect(model.rows).toHaveLength(1);
    expect(model.pinnedRows?.bottom[0]?.cells).toContain(10);
    expect(model.rowKey(model.rows[0]!)).toBe(model.rows[0]!.key);
    const first = required(model.columns[0]);
    const firstRow = required(model.rows[0]);
    const cell = first.cell;
    const node =
      typeof cell === "function"
        ? cell({ row: firstRow, rowIndex: 0, column: first, value: "A" })
        : null;
    const dom = render(() => node);
    expect(dom.root.textContent).toBe("A");
    expect(
      dom.root.querySelector('[data-adapttable-part="pivot-row-header"]')
    ).not.toBeNull();
    dom.stop();
    expect(
      pivotTableModel(
        pivot([], { rows: [], columns: [], measures: [], grandTotals: false })
      ).pinnedRows
    ).toBeUndefined();
  });
  it.each(["line", "bar", "area"] as const)(
    "draws accessible %s sparklines from finite numbers",
    (kind) => {
      const dom = render(() =>
        Sparkline({
          values: [1, Number.NaN, 3, Infinity, 2],
          kind,
          label: "Sales over three months",
        })
      );
      expect(dom.root.querySelector("svg")?.getAttribute("aria-label")).toBe(
        "Sales over three months"
      );
      expect(dom.root.querySelector("title")?.textContent).toBe(
        "Sales over three months"
      );
      expect(dom.root.innerHTML).not.toContain("NaN");
      dom.stop();
      const column = sparklineColumn<{ values: number[] }>({
        key: "trend",
        values: (row) => row.values,
        kind,
      });
      expect(column.sortValue?.({ values: [2, 5] })).toBe(5);
      expect(column.exportValue?.({ values: [2, 5] })).toBe("2, 5");
    }
  );
  it("shares Arabic aggregation captions with measure controls without translating configuration", () => {
    const fields: Parameters<PivotPanelSlots["Field"]>[0][] = [];
    const aggregations: Parameters<PivotPanelSlots["Agg"]>[0][] = [];
    const config: PivotConfig = {
      rows: [],
      columns: [],
      measures: [
        { key: "score", agg: "sum" },
        { key: "score", agg: "avg", label: "Authored total" },
        { key: "score", agg: "median" },
        { key: "score", agg: () => 1 },
      ],
    };
    const changed = vi.fn();
    PivotPanelChrome({
      fields: [{ key: "score", label: "القيمة" }],
      config,
      onChange: changed,
      labels: {
        selectionSum: "المجموع",
        groupingAverage: "المتوسط",
        selectionCount: "العدد",
        selectionMin: "الأدنى",
        selectionMax: "الأعلى",
      },
      slots: {
        Surface: () => null,
        Zone: () => null,
        Add: () => null,
        Field: (props) => {
          fields.push(props);
          return null;
        },
        Agg: (props) => {
          aggregations.push(props);
          return null;
        },
      },
    });
    expect(fields.map((field) => field.label)).toEqual([
      "المجموع القيمة",
      "Authored total",
      "median القيمة",
      "القيمة",
    ]);
    expect(required(aggregations[0]).optionLabels).toEqual({
      sum: "المجموع",
      avg: "المتوسط",
      count: "العدد",
      min: "الأدنى",
      max: "الأعلى",
    });
    required(aggregations[0]).onChange("avg");
    expect(changed).toHaveBeenLastCalledWith({
      ...config,
      measures: [{ key: "score", agg: "avg" }, ...config.measures.slice(1)],
    });
    required(fields[0]).onRemove();
    expect(changed).toHaveBeenLastCalledWith({
      ...config,
      measures: config.measures.slice(1),
    });
    expect(config.measures[0]).toEqual({ key: "score", agg: "sum" });
  });
  it("calls required pivot controls with authoritative host-owned changes", () => {
    const changed = vi.fn();
    const rendered: Record<string, unknown>[] = [];
    const capture = (props: object) => {
      rendered.push(props as Record<string, unknown>);
      return null;
    };
    const slots: PivotPanelSlots = {
      Surface: capture,
      Zone: capture,
      Field: capture,
      Add: capture,
      Agg: capture,
    };
    PivotPanelChrome({
      fields: [
        { key: "team", label: "Team" },
        { key: "score", label: "Score" },
      ],
      config: {
        rows: ["team", "score"],
        columns: [],
        measures: [{ key: "score", agg: "sum" }],
      },
      onChange: changed,
      slots,
    });
    const up = rendered.find((props) => typeof props.onMoveUp === "function");
    (up?.onMoveUp as () => void)();
    expect(changed).toHaveBeenCalled();
    const down = rendered.find(
      (props) => typeof props.onMoveDown === "function"
    );
    (down?.onMoveDown as () => void)();
    const field = rendered.find(
      (props) => typeof props.onRemove === "function"
    );
    (field?.onRemove as () => void)();
    const agg = rendered.find((props) => typeof props.onChange === "function");
    (agg?.onChange as (value: string) => void)("avg");
    const add = rendered.find((props) => typeof props.onAdd === "function");
    (add?.onAdd as (value: string) => void)("score");
    expect(changed.mock.calls).toHaveLength(5);
    expect(() =>
      PivotPanelChrome({
        fields: [],
        config: { rows: [], columns: [], measures: [] },
        onChange: changed,
        slots: { ...slots, Add: undefined } as unknown as PivotPanelSlots,
      })
    ).toThrow("Add");
  });
});
describe("stream ownership", () => {
  it("uses the latest writer without reconnecting, replaces transport and stops late callbacks", () => {
    const sockets: FakeSocket[] = [];
    const factory = (url: string) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    };
    const written = vi.fn();
    const options = shallowRef({
      websocket: "wss://one",
      getRowId: (row: { id: string }) => row.id,
      onPatch: written,
      createWebSocket: factory,
    });
    const scope = effectScope();
    const state = required(scope.run(() => useRowPatchStream(options)));
    const first = required(sockets[0]);
    first.open();
    expect(state.status.value).toBe("open");
    first.push(JSON.stringify({ type: "remove", id: "a" }));
    const nextWriter = vi.fn();
    options.value = { ...options.value, onPatch: nextWriter };
    first.push(JSON.stringify({ type: "remove", id: "b" }));
    expect(sockets).toHaveLength(1);
    expect(nextWriter).toHaveBeenCalled();
    options.value = { ...options.value, websocket: "wss://two" };
    expect(first.readyState).toBe(3);
    expect(sockets).toHaveLength(2);
    scope.stop();
    expect(sockets[1]?.readyState).toBe(3);
    first.push("[]");
    expect(written).toHaveBeenCalledTimes(1);
  });
  it("cancels reconnect on explicit close and stays closed through changed options", () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const options = shallowRef({
      websocket: "wss://rows",
      getRowId: (row: { id: string }) => row.id,
      onPatch: vi.fn(),
      reconnect: { delayMs: 10 },
      createWebSocket: (url: string) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
    });
    const scope = effectScope();
    const state = required(scope.run(() => useRowPatchStream(options)));
    sockets[0]?.drop();
    expect(state.status.value).toBe("reconnecting");
    state.close();
    vi.advanceTimersByTime(100);
    options.value = { ...options.value, websocket: "wss://other" };
    expect(sockets).toHaveLength(1);
    scope.stop();
    vi.useRealTimers();
  });
  it("suspends and resumes stream resources in KeepAlive", async () => {
    const sockets: FakeSocket[] = [];
    const visible = shallowRef(true);
    const Child = defineComponent({
      setup() {
        useRowPatchStream({
          websocket: "wss://rows",
          getRowId: (row: { id: string }) => row.id,
          onPatch: () => undefined,
          createWebSocket: (url) => {
            const socket = new FakeSocket(url);
            sockets.push(socket);
            return socket;
          },
        });
        return () => h("div");
      },
    });
    const dom = render(() =>
      h(KeepAlive, null, { default: () => (visible.value ? h(Child) : null) })
    );
    await nextTick();
    expect(sockets).toHaveLength(1);
    visible.value = false;
    await nextTick();
    expect(sockets[0]?.readyState).toBe(3);
    visible.value = true;
    await nextTick();
    expect(sockets).toHaveLength(2);
    dom.stop();
    expect(sockets[1]?.readyState).toBe(3);
  });
});
describe("reorder and final body windows", () => {
  it("uses core keyboard moves and refuses writes after the scope is stopped", () => {
    const changed = vi.fn();
    const scope = effectScope();
    const model = required(
      scope.run(() =>
        useRowReorder({
          enabled: true,
          onRowReorder: changed,
          rowAt: (index) => rows[index],
          getRowId: (row) => row.id,
          labels: resolveLabels(undefined),
        })
      )
    );
    const event = (key: string) => ({
      key,
      currentTarget: null,
      preventDefault: vi.fn(),
    });
    const slot = {
      rowId: "a",
      localIndex: 0,
      row: rows[0]!,
      windowStart: 10,
      rowCount: 2,
    };
    model.value.controller.keyDown(event(" "), slot);
    expect(model.value.snapshot.lifted?.rowId).toBe("a");
    model.value.controller.keyDown(event("ArrowDown"), slot);
    model.value.controller.keyDown(event(" "), slot);
    expect(changed).toHaveBeenCalledWith(10, 11, rows[0]);
    scope.stop();
    model.value.controller.moveBy(0, 1, rows[0]!, 0, 2);
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it("requires adapter reorder controls and preserves host row identities", () => {
    const scope = effectScope();
    const feature = extendFeature(
      rowReorder<(typeof rows)[number]>(() => undefined),
      [slotRender(rowReorderControlKey<(typeof rows)[number]>(), () => null)]
    );
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          rowKey: (row) => row.id,
          columns: [{ key: "score" }],
          features: [feature],
          urlSync: false,
        })
      )
    );
    expect(shell.desktop.value.reorderLabel).toBeTruthy();
    expect(shell.desktop.value.columnCount).toBe(2);
    expect(
      shell.desktop.value.bodySlots
        ?.filter((slot) => slot.kind === "row")
        .map((slot) => slot.key)
    ).toEqual(["a", "b"]);
    scope.stop();
  });
  it("preserves structural boundaries and pinned rows around the window", () => {
    const scope = effectScope();
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          rowKey: (row) => row.id,
          columns: [{ key: "score" }],
          features: [virtualize(false)],
          urlSync: false,
        })
      )
    );
    const slots = required(shell.bodyProjection.value.desktop.bodySlots);
    const measure = vi.fn(() => vi.fn());
    expect(
      windowBodySlots(
        slots,
        { enabled: false, indices: [0, 1], paddingTop: 0, paddingBottom: 0 },
        1,
        measure
      )
    ).toBe(slots);
    const pinnedSlot: TableBodySlot<(typeof rows)[number]> = {
      ...required(slots[0]),
      kind: "row",
      key: "pinned",
      wiring: { ...required(shell.desktop.value.rows[0]), summary: true },
    };
    const result = windowBodySlots(
      [pinnedSlot, ...slots],
      { enabled: true, indices: [1], paddingTop: 56, paddingBottom: 112 },
      1,
      measure
    );
    expect(result.map((slot) => slot.key)).toEqual([
      "pinned",
      "pad-top",
      "b",
      "pad-bottom",
    ]);
    expect(
      result[2]?.kind === "row" && result[2].wiring.attrs["data-index"]
    ).toBe(1);
    scope.stop();
  });
  it("renders typed mobile reorder controls and missing slots fail clearly", () => {
    const scope = effectScope();
    const model = required(
      scope.run(() =>
        useRowReorder({
          enabled: true,
          rowAt: (index) => rows[index],
          labels: resolveLabels(undefined),
        })
      )
    );
    const controls: RowReorderControlSlots = {
      Handle: vi.fn(() => null),
      Button: vi.fn(() => null),
      Menu: vi.fn(() => null),
    };
    const props = {
      model: model.value,
      rowId: "a",
      row: rows[0]!,
      localIndex: 0,
      windowStart: 0,
      rowCount: 2,
      labels: resolveLabels(undefined),
      mobile: true,
      slots: controls,
    };
    RowReorderChrome(props);
    expect(controls.Button).toHaveBeenCalledTimes(2);
    RowReorderChrome({ ...props, mobile: false });
    expect(controls.Handle).toHaveBeenCalledTimes(1);
    expect(() =>
      RowReorderChrome({
        ...props,
        slots: {
          ...controls,
          Menu: undefined,
        } as unknown as RowReorderControlSlots,
      })
    ).toThrow("Menu");
    scope.stop();
  });
});
