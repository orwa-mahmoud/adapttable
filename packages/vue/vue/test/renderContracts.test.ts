import {
  featureSlotKey,
  featureStateKey,
  slotRender,
} from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  type ComponentPublicInstance,
  createApp,
  defineComponent,
  effectScope,
  h,
} from "vue";

import {
  composeElementRefs,
  elementRef,
  toVueAttrs,
  toVueStyle,
} from "../src/attrs";
import {
  type CellContext,
  componentRenderer,
  flattenColumns,
  renderCell,
  renderContent,
  renderFooter,
  renderHeader,
  resolveColumns,
} from "../src/columnDef";
import {
  assertRequiredSlots,
  eraseTableRuntime,
  extendFeature,
  feature,
  featureOptionsOf,
  featureSlotFillsOf,
  normalizeFeatures,
  renderFeatureSlot,
} from "../src/features/tableFeature";
import {
  createFeatureState,
  provideFeatureState,
  useFeatureState,
} from "../src/featureState";
it("converts full event/style/class contracts without losing literal attribute tokens", () => {
  const onChange = vi.fn();
  const onInput = vi.fn();
  expect(
    toVueAttrs({
      className: "a",
      htmlFor: "input",
      onChange,
      onInput,
      style: [
        "display:block",
        {
          width: 0,
          marginInlineStart: 4,
          WebkitLineClamp: 2,
          "--size": 3,
          opacity: 0.3,
        },
      ],
      "aria-selected": false,
    })
  ).toEqual({
    class: "a",
    for: "input",
    onInput: [onChange, onInput],
    style: [
      "display:block",
      {
        width: 0,
        marginInlineStart: "4px",
        WebkitLineClamp: 2,
        "--size": 3,
        opacity: 0.3,
      },
    ],
    "aria-selected": false,
  });
  expect(toVueAttrs({ type: "radio", onChange }).onChange).toBe(onChange);
  expect(toVueAttrs({ onChange }, { changeEvent: "change" }).onChange).toBe(
    onChange
  );
  expect(toVueStyle(null)).toBeNull();
  expect(toVueStyle("display:none")).toBe("display:none");
});
it("resolves actual component targets, release refs, and rejects implicit component wrappers", () => {
  const set = vi.fn();
  const target = document.createElement("table");
  const component = {
    $: {},
    $el: target,
  } as unknown as ComponentPublicInstance;
  const ref = elementRef(set, (instance) => instance.$el as HTMLTableElement);
  if (typeof ref !== "function") throw new Error("expected callback ref");
  ref(component, {});
  ref(target, {});
  ref(null, {});
  expect(set.mock.calls.map(([value]) => value)).toEqual([
    target,
    target,
    null,
  ]);
  const unsafe = elementRef(set);
  if (typeof unsafe !== "function") throw new Error("expected callback ref");
  expect(() => unsafe(component, {})).toThrow("explicit DOM target");
  const first = vi.fn();
  const second = vi.fn();
  const composed = composeElementRefs(first, second);
  composed(null);
  composed(target);
  composed(target);
  composed(null);
  expect(first).toHaveBeenCalledTimes(2);
  expect(second).toHaveBeenCalledTimes(2);
});
describe("renderer precedence and metadata", () => {
  interface Row {
    name: string;
    score: number;
  }
  const row = { name: "Ada", score: 3 };
  it("checks component props and preserves renderer identity", () => {
    const Value = defineComponent({
      props: { value: { type: Number, required: true } },
      setup: (props) => () => h("b", props.value.toFixed(1)),
    });
    const renderer = componentRenderer<CellContext<Row, number>, typeof Value>(
      Value,
      (context) => ({ value: context.value })
    );
    expect(renderer.component).toBe(Value);
    const root = document.createElement("div");
    const app = createApp({
      render: () =>
        renderContent(renderer, {
          row,
          rowIndex: 0,
          column: { key: "score" },
          value: 3,
        }),
    });
    app.mount(root);
    expect(root.textContent).toBe("3.0");
    app.unmount();
  });
  it("honors intentionally empty scoped slots and typed header/footer renderers", () => {
    const header = {
      column: { key: "name" },
      label: "Name",
      sortDir: undefined,
      sortIndex: undefined,
      toggleSort: vi.fn(),
    };
    expect(renderHeader(header, () => null)).toBeNull();
    expect(renderHeader(header)).toBe("Name");
    expect(
      renderHeader({
        ...header,
        column: { key: "name", headerCell: () => "custom" },
      })
    ).toBe("custom");
    expect(
      renderFooter({ column: { key: "score" }, value: 3 }, () => null)
    ).toBeNull();
    expect(renderFooter({ column: { key: "score" }, value: 3 })).toBe("3");
    expect(
      renderFooter({
        column: { key: "score", footer: (context) => `sum:${context.value}` },
        value: 3,
      })
    ).toBe("sum:3");
    expect(
      renderCell({
        row,
        rowIndex: 0,
        column: { key: "score", formatValue: () => "three" },
        value: 3,
      })
    ).toBe("three");
    expect(
      renderCell({
        row,
        rowIndex: 0,
        column: { key: "name" },
        value: { nested: true },
      })
    ).toBeNull();
  });
  it("flattens nested groups without erasing Vue renderer metadata", () => {
    const cell = vi.fn(() => "custom");
    const result = flattenColumns<Row>([
      {
        header: "Person",
        children: [
          { key: "name", cell },
          { header: "Numbers", children: [{ key: "score", width: 100 }] },
        ],
      },
    ]);
    expect(result.leaves.map((column) => column.key)).toEqual([
      "name",
      "score",
    ]);
    expect(result.leaves[0]?.cell).toBe(cell);
    expect(result.groups.size).toBe(2);
    const resolved = resolveColumns(result.leaves);
    expect(resolved[0]?.accessor?.(row)).toBe("Ada");
    expect(resolved[0]?.header).toBe("Name");
  });
});
it("requires declared control fills, preserves canonical slot order and deduplicates single slots", () => {
  const slot = featureSlotKey<{ value: string }>("custom", { single: true });
  const first = feature("z", { own: 1 });
  const enhanced = extendFeature(first, [
    slotRender(slot, (props) => `z:${props.value}`),
  ]);
  const composed = extendFeature(enhanced, [
    slotRender(slot, (props) => `a:${props.value}`, { orderAs: "a" }),
  ]);
  const fills = featureSlotFillsOf([composed]);
  expect(featureOptionsOf([first])).toEqual({ own: 1 });
  expect(feature("empty").apply).toBeUndefined();
  expect(renderFeatureSlot(slot, fills, { value: "v" })).toEqual(["a:v"]);
  expect(renderFeatureSlot(featureSlotKey("empty"), fills, {})).toEqual([]);
  assertRequiredSlots([{ id: "required", requiredSlots: [slot] }], fills);
  expect(() =>
    assertRequiredSlots(
      [{ id: "missing", requiredSlots: [featureSlotKey("missing")] }],
      fills
    )
  ).toThrow("requires the adapter control slot");
  expect(() =>
    normalizeFeatures([{ id: "broken", mount: "bad" as never }])
  ).toThrow("invalid mount");
  const runtime = {
    rowAt: () => undefined,
    labels: () => undefined,
    view: () => undefined,
    featureIds: () => [],
  };
  expect(eraseTableRuntime(runtime)).toBe(runtime);
});
it("keeps optional injected state table-local and owner replacement safe", () => {
  const KEY = featureStateKey<string>("message");
  const state = createFeatureState();
  state.set(KEY, "one");
  expect(useFeatureState(KEY).value).toBeUndefined();
  const Child = defineComponent({
    setup() {
      const value = useFeatureState(KEY);
      return () => h("span", value.value);
    },
  });
  const root = document.createElement("div");
  const app = createApp({
    setup() {
      provideFeatureState(state);
      return () => h(Child);
    },
  });
  app.mount(root);
  expect(root.textContent).toBe("one");
  app.unmount();
  const owner = state.owner();
  owner.set(KEY, "owned");
  state.set(KEY, "external");
  owner.dispose();
  expect(state.get(KEY).value).toBe("external");
  owner.dispose();
  owner.set(KEY, "late");
  expect(state.get(KEY).value).toBe("external");
  state.clear();
  expect(state.get(KEY).value).toBeUndefined();
  const scope = effectScope();
  scope.run(() => expect(useFeatureState(KEY).value).toBeUndefined());
  scope.stop();
});
