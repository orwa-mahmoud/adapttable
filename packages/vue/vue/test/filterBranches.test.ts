import {
  defaultFilterRegistry,
  type ExtraFilters,
  type FilterDef,
  type FilterFormSource,
  type QueryFilterGroup,
  resolveLabels,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  type FilterTreeButtonProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  effectScope,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { extendFeature } from "../src/features/tableFeature";
import {
  ChecklistChrome,
  FilterFieldChrome,
  type FilterFieldSlots,
  FilterPanelChrome,
  type FilterPanelSlots,
  filters,
  FilterTreeChrome,
  filterTypes,
  filterViewKey,
  useChecklistModel,
  useChecklistWindow,
  useFilterField,
  useFilterOptions,
  useFilterTreeModel,
} from "../src/filters";
import {
  headerFilterModelKey,
  headerFilters,
  headerFilterSlotKey,
  useHeaderFilter,
} from "../src/header-filters";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  number: number;
  flag: boolean;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", number: 4, flag: true },
  { id: "g", name: "Grace", number: 8, flag: false },
];
const labels = resolveLabels(undefined);
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};
function bag() {
  const extra = shallowRef<ExtraFilters>({});
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    allFilteredRows: data,
    setExtra: (key, value) => {
      extra.value = { ...extra.value, [key]: value };
    },
    setExtras: (patch) => {
      extra.value = { ...extra.value, ...patch };
    },
  }));
  return { extra, source };
}
const fieldControls: FilterFieldSlots = {
  Input: (props) => h("i", props.attrs, props.value),
  Select: (props) => h("b", props.attrs, props.value),
  Checkbox: (props) => h("u", props.attrs, props.label),
};
describe("complete filter control contracts", () => {
  it.each(["numberRange", "dateRange"] as const)(
    "writes %s operators and both bounds through neutral writers",
    (type) => {
      const scope = effectScope();
      const { source, extra } = bag();
      const definition = shallowRef<FilterDef<Row>>({ key: "number", type });
      const model = scope.run(() =>
        useFilterField(() => ({
          id: "field",
          def: definition.value,
          source: source.value,
          labels,
        }))
      )!;
      const op = model.value.controls[0]!;
      if (op.kind !== "select") throw new Error("operator missing");
      expect(model.value.controls).toHaveLength(1);
      expect(op.props.value).toBe("");
      expect(op.props.options[0]).toEqual({ value: "", label: labels.boolAny });
      op.props.onChange("between");
      const a = model.value.controls[1]!;
      if (a.kind !== "input") throw new Error("first bound missing");
      a.props.onChange(type === "numberRange" ? "2" : "2026-01-01");
      const b = model.value.controls[2]!;
      if (b.kind !== "input") throw new Error("second bound missing");
      b.props.onChange(type === "numberRange" ? "6" : "2026-02-01");
      expect(Object.keys(extra.value).length).toBeGreaterThan(1);
      FilterFieldChrome({
        model: model.value,
        controls: fieldControls,
        classNames: {
          filterField: "field",
          filterLabel: "label",
          filterControl: "control",
        },
      });
      op.props.onChange(type === "dateRange" ? "empty" : "eq");
      expect(model.value.controls).toHaveLength(type === "dateRange" ? 1 : 2);
      op.props.onChange("");
      expect(model.value.controls).toHaveLength(1);
      expect(
        Object.values(extra.value).every((value) => value === undefined)
      ).toBe(true);
      op.props.onChange("unknown");
      definition.value = { key: "other", type };
      expect(model.value.controls[0]?.kind).toBe("select");
      scope.stop();
    }
  );
  it("writes text, boolean, select and multiple choices while ignoring invalid choices", async () => {
    const scope = effectScope();
    const { source, extra } = bag();
    const def = shallowRef<FilterDef<Row>>({ key: "name", type: "text" });
    const model = scope.run(() =>
      useFilterField(() => ({
        id: "field",
        def: def.value,
        source: source.value,
        labels,
      }))
    )!;
    const write = (index: number, value: string) => {
      const control = model.value.controls[index]!;
      if (control.kind !== "checkbox") control.props.onChange(value);
    };
    write(1, "Ada");
    expect(extra.value.name).toBe("Ada");
    write(0, "unknown");
    write(0, "empty");
    expect(model.value.controls).toHaveLength(1);
    def.value = { key: "flag", type: "boolean" };
    write(0, "true");
    expect(extra.value.flag).toBe("true");
    write(0, "bad");
    expect(extra.value.flag).toBe("true");
    write(0, "");
    expect(extra.value.flag).toBeUndefined();
    def.value = {
      key: "name",
      type: "select",
      options: [{ value: "Grace", label: "Grace" }],
    };
    await tick();
    write(0, "Grace");
    expect(extra.value.name).toBe("Grace");
    write(0, "");
    expect(extra.value.name).toBeUndefined();
    def.value = {
      key: "name",
      type: "multiSelect",
      options: [
        { value: "Ada", label: "Ada" },
        { value: "Grace", label: "Grace" },
      ],
    };
    await tick();
    const first = model.value.controls[0]!;
    if (first.kind !== "checkbox") throw new Error("checkbox missing");
    first.props.onChange(true);
    expect(extra.value.name).toEqual(["Ada"]);
    FilterFieldChrome({ model: model.value, controls: fieldControls });
    const checked = model.value.controls[0]!;
    if (checked.kind === "checkbox") checked.props.onChange(false);
    expect(extra.value.name).toEqual([]);
    def.value = { key: "custom", type: "unknown" };
    expect(() => model.value).toThrow(
      "needs a registered adapter field renderer"
    );
    scope.stop();
  });
  it("reports loader rejection and accepts static/auto definitions", async () => {
    const scope = effectScope();
    const fail = new Error("Unavailable");
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: () => Promise.reject(fail),
    });
    const result = scope.run(() => useFilterOptions(def))!;
    await tick();
    await tick();
    expect(result.value.error).toBe(fail);
    def.value = { key: "name", type: "select", options: "auto" };
    expect(result.value).toEqual({ options: [], loading: false });
    scope.stop();
  });
  it("renders popover/drawer structure, required controls and current actions", () => {
    const scope = effectScope();
    const feature = extendFeature(
      filters<Row>([{ key: "name", type: "text" }], { mode: "drawer" }),
      [
        slotRender(TOOLBAR_EXTRAS, () => null),
        slotRender(ACTIVE_FILTER_CHIPS, () => null),
      ]
    );
    const shell = scope.run(() =>
      useDataTableShell<Row>({
        data,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features: [feature],
        urlSync: false,
      })
    )!;
    const panel = shell.state.get(filterViewKey<Row>());
    const model = panel.value!;
    const anchor = document.createElement("button");
    document.body.append(anchor);
    model.trigger.triggerRef(anchor);
    model.trigger.onPointerDown();
    model.trigger.onClick();
    shell.source.value.setExtra("name", "Ada");
    expect(panel.value?.count).toBe(1);
    const actions = new Map<string, () => void>();
    const surface = vi.fn((props) => props.children);
    const controls: FilterPanelSlots<Row> = {
      Trigger: () => null,
      Field: () => null,
      Button: (props) => {
        actions.set(props.part, props.onClick);
        return null;
      },
      Popover: surface,
      Drawer: surface,
    };
    FilterPanelChrome({
      model: panel.value!,
      controls,
      classNames: {
        filtersPanel: "panel",
        filtersForm: "form",
        filtersActions: "actions",
        filtersToolbar: "toolbar",
      },
    });
    expect(surface.mock.calls[0]?.[0].open).toBe(true);
    actions.get("filters-clear")?.();
    expect(shell.source.value.extra.name).toBeUndefined();
    actions.get("filters-done")?.();
    expect(panel.value?.open).toBe(false);
    panel.value!.trigger.onClick();
    panel.value!.close("escape");
    expect(document.activeElement).toBe(anchor);
    expect(() =>
      FilterPanelChrome({
        model: panel.value!,
        controls: {
          ...controls,
          Trigger: undefined,
        } as unknown as FilterPanelSlots<Row>,
      })
    ).toThrow("Trigger");
    FilterPanelChrome({
      model: { ...panel.value!, mode: "popover" },
      controls,
    });
    scope.stop();
    anchor.remove();
  });
  it("publishes typed header definitions and unregisters them on removal", () => {
    const scope = effectScope();
    const features = shallowRef([
      extendFeature(headerFilters(), [
        slotRender(headerFilterSlotKey<Row>(), (props) =>
          h("b", props.def.key)
        ),
      ]),
    ]);
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data,
        columns: [{ key: "name", filter: { type: "text" } }, { key: "number" }],
        rowKey: (row) => row.id,
        features: features.value,
        urlSync: false,
        dir: "rtl",
      }))
    )!;
    const model = shell.state.get(headerFilterModelKey<Row>());
    expect(model.value?.controls.size).toBe(1);
    expect(model.value?.controls.get("name")?.dir).toBe("rtl");
    features.value = [];
    expect(model.value).toBeUndefined();
    scope.stop();
  });
  it("registers custom built-in-shaped filter types only on their own table", () => {
    const spec = { ...defaultFilterRegistry.get("text")!, type: "custom-text" };
    const scope = effectScope();
    const feature = extendFeature(
      filters<Row>([{ key: "name", type: "custom-text" }]),
      [
        slotRender(TOOLBAR_EXTRAS, () => null),
        slotRender(ACTIVE_FILTER_CHIPS, () => null),
      ]
    );
    const shell = scope.run(() =>
      useDataTableShell<Row>({
        data,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features: [filterTypes([spec]), feature],
        urlSync: false,
      })
    )!;
    expect(shell.filterRuntime.value?.registry.has("custom-text")).toBe(true);
    scope.stop();
  });
  it("rejects missing headless IDs and invalid tree sources without hidden controls", () => {
    const scope = effectScope();
    const { source } = bag();
    expect(() =>
      scope.run(() =>
        useFilterField({
          def: { key: "name", type: "text" },
          source: source.value,
          labels,
        })
      )
    ).toThrow("explicit id");
    expect(() =>
      scope.run(() =>
        useHeaderFilter({
          def: { key: "name", type: "text" },
          source: source.value,
          labels,
        })
      )
    ).toThrow("explicit id");
    const tree = scope.run(() =>
      useFilterTreeModel<Row>({
        defs: [{ key: "name", type: "text" }],
        source: {},
      })
    )!;
    expect(() => tree.value.actions.addCondition([])).toThrow(
      "filter-tree writes"
    );
    scope.stop();
  });
  it("closes completed header choices only when requested, and resets on definition replacement", async () => {
    const scope = effectScope();
    const { source } = bag();
    const def = shallowRef<FilterDef<Row>>({ key: "name", type: "select" });
    const model = scope.run(() =>
      useHeaderFilter(() => ({
        id: "header",
        def: def.value,
        source: source.value,
        labels,
        closeOnSelect: true,
      }))
    )!;
    model.value.trigger.onClick();
    model.value.field.source.setExtra("name", "Ada");
    await tick();
    expect(model.value.open).toBe(false);
    model.value.trigger.onClick();
    def.value = { key: "flag", type: "boolean" };
    expect(model.value.open).toBe(false);
    model.value.field.source.setExtras({ flag: "true" });
    await tick();
    scope.stop();
    model.value.close();
  });
});
describe("tree value editors and checklist lifecycle", () => {
  it.each([
    { type: "text", condition: { key: "value", op: "contains", value: "Ada" } },
    {
      type: "numberRange",
      condition: { key: "value", op: "between", value: [2, 4] },
    },
    { type: "boolean", condition: { key: "value", op: "eq", value: true } },
    {
      type: "dateRange",
      condition: { key: "value", op: "relative", value: "last:7" },
    },
    { type: "text", condition: { key: "value", op: "empty" } },
  ])(
    "routes every $type/$condition.op tree value through required controls",
    ({ type, condition }) => {
      const scope = effectScope();
      const tree = shallowRef<QueryFilterGroup>({
        combinator: "and",
        conditions: [condition],
      });
      const model = scope.run(() =>
        useFilterTreeModel<Row>(() => ({
          defs: [
            { key: "value", type },
            { key: "other", type: "text" },
          ],
          source: {
            filterTree: tree.value,
            setFilterTree: (value) => {
              tree.value = value!;
            },
          },
        }))
      )!;
      const selects: FilterTreeSelectProps[] = [];
      const fields: FilterTreeInputProps[] = [];
      const buttons: FilterTreeButtonProps[] = [];
      const controls = {
        Select: (props: FilterTreeSelectProps): VNodeChild => {
          selects.push(props);
          return null;
        },
        Input: (props: FilterTreeInputProps): VNodeChild => {
          fields.push(props);
          return null;
        },
        Button: (props: FilterTreeButtonProps): VNodeChild => {
          buttons.push(props);
          return null;
        },
        Disclosure: (props: {
          children: VNodeChild;
          onExpandedChange: (value: boolean) => void;
        }): VNodeChild => {
          props.onExpandedChange(true);
          return props.children;
        },
      };
      FilterTreeChrome({ model: model.value, controls });
      for (const input of fields) input.onChange("3");
      for (const select of selects) {
        if (select.label === labels.value)
          select.onChange(select.options[0]?.value ?? "true");
        if (select.label === labels.operator)
          select.onChange(select.options[0]?.value ?? "eq");
        if (select.label === labels.filterField) {
          select.onChange("unknown");
          select.onChange("other");
        }
        if (select.label === labels.filterTree) select.onChange("or");
      }
      expect(model.value.expanded).toBe(true);
      expect(tree.value.combinator).toBe("or");
      buttons
        .find((button) => button.label === labels.filterAddCondition)
        ?.onClick();
      buttons
        .find((button) => button.label === labels.filterAddGroup)
        ?.onClick();
      expect(tree.value.conditions.length).toBeGreaterThan(1);
      scope.stop();
    }
  );
  it("checklist window measures replaced refs and releases ResizeObservers", async () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    class Resize {
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal("ResizeObserver", Resize);
    const scope = effectScope();
    const count = shallowRef(100);
    const enabled = shallowRef(true);
    const window = scope.run(() => useChecklistWindow(count, enabled))!;
    const one = document.createElement("div");
    Object.defineProperty(one, "clientWidth", { value: 450 });
    one.scrollTop = 160;
    window.ref(one);
    await nextTick();
    expect(observe).toHaveBeenCalledWith(one);
    expect(window.window.value.start).toBeGreaterThan(0);
    window.onScroll();
    window.ref(document.createElement("div"));
    await nextTick();
    expect(disconnect).toHaveBeenCalledOnce();
    enabled.value = false;
    await nextTick();
    expect(window.window.value.end).toBe(100);
    scope.stop();
    expect(disconnect).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
  it("checklist omits unavailable rows and handles empty search/control failures", () => {
    const scope = effectScope();
    const { source } = bag();
    const model = scope.run(() =>
      useChecklistModel<Row>(() => ({
        def: { key: "name", type: "checklist" },
        source: source.value,
      }))
    )!;
    model.value.state.setQuery("missing");
    const names: string[] = [];
    const controls = {
      Search: (props: { onChange: (value: string) => void }) => {
        props.onChange("missing");
        return null;
      },
      Button: (props: { label: string; onClick: () => void }) => {
        names.push(props.label);
        props.onClick();
        return null;
      },
      Checkbox: () => null,
    };
    ChecklistChrome({ model: model.value, controls });
    expect(names).toContain(labels.checklistClear);
    expect(
      ChecklistChrome({
        model: {
          ...model.value,
          state: { ...model.value.state, available: false },
        },
        controls,
      })
    ).toBeNull();
    scope.stop();
  });
});

describe("empty and missing filter control boundaries", () => {
  it("omits empty tree definitions and rejects absent tree/header/checklist controls", () => {
    const scope = effectScope();
    const tree = scope.run(() =>
      useFilterTreeModel<Row>({
        defs: [],
        source: { setFilterTree: () => undefined },
      })
    )!;
    const treeSlots = {
      Select: () => null,
      Input: () => null,
      Button: () => null,
      Disclosure: () => null,
    };
    expect(
      FilterTreeChrome({ model: tree.value, controls: treeSlots })
    ).toBeNull();
    expect(() => tree.value.actions.addCondition([])).toThrow(
      "at least one filter definition"
    );
    const withDef = { ...tree.value, defs: [{ key: "name", type: "text" }] };
    expect(() =>
      FilterTreeChrome({
        model: withDef,
        controls: {
          ...treeSlots,
          Button: undefined,
        } as unknown as typeof treeSlots,
      })
    ).toThrow("Button");
    const { source } = bag();
    const checklist = scope.run(() =>
      useChecklistModel<Row>({
        def: { key: "name", type: "checklist" },
        source: source.value,
      })
    )!;
    const checklistSlots = {
      Search: () => null,
      Button: () => null,
      Checkbox: () => null,
    };
    expect(() =>
      ChecklistChrome({
        model: checklist.value,
        controls: {
          ...checklistSlots,
          Checkbox: undefined,
        } as unknown as typeof checklistSlots,
      })
    ).toThrow("Checkbox");
    scope.stop();
  });
  it("removes a nested group through its shared action", () => {
    const scope = effectScope();
    const tree = shallowRef<QueryFilterGroup>({
      combinator: "and",
      conditions: [{ combinator: "or", conditions: [] }],
    });
    const model = scope.run(() =>
      useFilterTreeModel<Row>(() => ({
        defs: [{ key: "name", type: "text" }],
        source: {
          filterTree: tree.value,
          setFilterTree: (value) => {
            tree.value = value!;
          },
        },
      }))
    )!;
    const buttons: FilterTreeButtonProps[] = [];
    FilterTreeChrome({
      model: model.value,
      controls: {
        Select: () => null,
        Input: () => null,
        Button: (props) => {
          buttons.push(props);
          return null;
        },
        Disclosure: (props) => props.children,
      },
    });
    buttons
      .find((button) => button.label === labels.filterRemoveGroup)!
      .onClick();
    expect(tree.value).toBeUndefined();
    scope.stop();
  });
  it("renders and changes individual checklist options through native-checkbox contract", () => {
    const scope = effectScope();
    const { source, extra } = bag();
    const model = scope.run(() =>
      useChecklistModel<Row>({
        def: { key: "name", type: "checklist" },
        source: source.value,
      })
    )!;
    ChecklistChrome({
      model: model.value,
      controls: {
        Search: () => null,
        Button: () => null,
        Checkbox: (props) => {
          if (props.label === "Ada") props.onChange(true);
          return null;
        },
      },
    });
    expect(extra.value.name).toEqual(["Ada"]);
    scope.stop();
  });
});
