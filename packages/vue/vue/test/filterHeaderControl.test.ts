import {
  defaultFilterRegistry,
  type FilterDef,
  type FilterFormSource,
  type FilterWidgetRenderProps,
  resolveLabels,
  withFilterType,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { computed, createSSRApp, effectScope, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import {
  FilterHeaderControlChrome,
  FilterHeaderRowChrome,
  type FilterHeaderSlots,
  useFilterHeaderControl,
} from "../src/header-filters";

interface Row {
  name: string;
  amount: number;
  active: boolean;
}
const labels = resolveLabels({});
const slots: FilterHeaderSlots = {
  Search: (control) => h("i", control.value),
  Select: (control) => h("b", control.value),
  Range: (control) => h("u", control.value),
  Multi: (control) => h("em", control.summary),
};
function fixture(
  def: FilterDef<Row>,
  initial: FilterFormSource<Row>["extra"] = {}
) {
  const definition = shallowRef(def);
  const extra = shallowRef(initial);
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn((patch: FilterFormSource<Row>["extra"]) => {
    extra.value = { ...extra.value, ...patch };
  });
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
  }));
  const scope = effectScope();
  const model = scope.run(() =>
    useFilterHeaderControl(() => ({
      def: definition.value,
      source: source.value,
      labels,
      className: "compact",
      menuClassName: "choices",
    }))
  )!;
  return { definition, extra, setExtra, setExtras, source, scope, model };
}
describe("compact header filter models", () => {
  it("uses the neutral list representation for a single-choice header", () => {
    const f = fixture({
      key: "name",
      type: "select",
      options: [{ value: "Ada", label: "Ada" }],
    });
    const current = f.model.value;
    if (current?.kind !== "select") throw new Error("Expected select");
    expect(current.props.options).toEqual([
      { value: "", label: labels.boolAny },
      { value: "Ada", label: "Ada" },
    ]);
    current.props.onChange("Ada");
    expect(f.setExtra).toHaveBeenLastCalledWith("name", ["Ada"]);
    expect(f.model.value?.kind === "select" && f.model.value.props.value).toBe(
      "Ada"
    );
    current.props.onChange("");
    expect(f.setExtra).toHaveBeenLastCalledWith("name", undefined);
    f.scope.stop();
    current.props.onChange("Ada");
    expect(f.setExtra).toHaveBeenCalledTimes(2);
  });

  it("shares range inference, serialized zero and the two-bound model", () => {
    const f = fixture({ key: "amount", type: "numberRange" });
    let current = f.model.value;
    if (current?.kind !== "range") throw new Error("Expected range");
    expect(current.upper).toBeUndefined();
    current.lower.onChange("0");
    expect(f.extra.value.amountMin).toBe("0");
    expect(f.extra.value.amountOp).toBe("gte");
    f.extra.value = { amountMin: 1, amountMax: 3, amountOp: "between" };
    current = f.model.value;
    if (current?.kind !== "range") throw new Error("Expected range");
    expect(current.upper?.value).toBe("3");
    current.upper?.onChange("4");
    expect(f.extra.value.amountMax).toBe("4");
    f.scope.stop();
  });

  it("keeps false distinct from any and rejects invalid boolean tokens", () => {
    const f = fixture({ key: "active", type: "boolean" });
    const current = f.model.value;
    if (current?.kind !== "select") throw new Error("Expected boolean select");
    current.props.onChange("false");
    expect(f.extra.value.active).toBe("false");
    current.props.onChange("invalid");
    expect(f.setExtra).toHaveBeenCalledTimes(1);
    current.props.onChange("");
    expect(f.extra.value.active).toBeUndefined();
    f.scope.stop();
  });

  it("keeps text writes with their original definition and stops after disposal", () => {
    const f = fixture({ key: "name", type: "text" });
    const current = f.model.value;
    if (current?.kind !== "text") throw new Error("Expected text");
    current.props.onChange("Ada");
    expect(f.extra.value.name).toBe("Ada");
    const count = f.setExtras.mock.calls.length;
    f.definition.value = { key: "active", type: "boolean" };
    current.props.onChange("retired");
    expect(f.setExtras).toHaveBeenCalledTimes(count);
    f.scope.stop();
  });

  it("uses neutral multi summaries and removes an empty list", () => {
    const f = fixture({
      key: "name",
      type: "checklist",
      options: [{ value: "Ada", label: "Ada Lovelace" }],
    });
    let current = f.model.value;
    if (current?.kind !== "multi") throw new Error("Expected multi");
    expect(current.props.summary).toBe(labels.boolAny);
    current.props.onToggle("Ada", true);
    current = f.model.value;
    if (current?.kind !== "multi") throw new Error("Expected multi");
    expect(current.props.summary).toBe("Ada Lovelace");
    expect(current.props.menuClassName).toBe("choices");
    current.props.onToggle("Ada", false);
    expect(f.extra.value.name).toBeUndefined();
    f.scope.stop();
  });

  it("keeps option requests owned by the current loader across replacement and disposal", async () => {
    let finishFirst!: (
      options: readonly { value: string; label: string }[]
    ) => void;
    let finishSecond!: (
      options: readonly { value: string; label: string }[]
    ) => void;
    const first = vi.fn(
      () =>
        new Promise<readonly { value: string; label: string }[]>((resolve) => {
          finishFirst = resolve;
        })
    );
    const second = vi.fn(
      () =>
        new Promise<readonly { value: string; label: string }[]>((resolve) => {
          finishSecond = resolve;
        })
    );
    const f = fixture({ key: "name", type: "select", options: first });
    await Promise.resolve();
    f.definition.value = { key: "name", type: "select", options: second };
    await Promise.resolve();
    finishFirst([{ value: "old", label: "Old" }]);
    await Promise.resolve();
    await Promise.resolve();
    let current = f.model.value;
    if (current?.kind !== "select") throw new Error("Expected select");
    expect(current.props.options.map((option) => option.value)).toEqual([""]);
    finishSecond([{ value: "Ada", label: "Ada" }]);
    await Promise.resolve();
    await Promise.resolve();
    current = f.model.value;
    if (current?.kind !== "select") throw new Error("Expected select");
    expect(current.props.options.map((option) => option.value)).toEqual([
      "",
      "Ada",
    ]);
    current.props.onChange("Ada");
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    f.scope.stop();
    current.props.onChange("retired");
    expect(f.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
  });

  it("renders registered Vue content and does not start an option loader during SSR", async () => {
    const load = vi.fn(() => Promise.resolve([]));
    const base = defaultFilterRegistry.get("text")!;
    const render = <TRow>(props: FilterWidgetRenderProps<TRow>) => {
      props.source.setExtra("name", "server-write");
      return [h("strong", "Custom"), [false, 0]];
    };
    const registry = withFilterType(defaultFilterRegistry, {
      ...base,
      type: "custom",
      render,
    });
    const write = vi.fn();
    const html = await renderToString(
      createSSRApp({
        setup() {
          const model = useFilterHeaderControl({
            def: { key: "name", type: "custom", options: load },
            source: { extra: {}, setExtra: write, setExtras: write },
            labels,
            registry,
          });
          return () =>
            FilterHeaderControlChrome({ model: model.value, controls: slots });
        },
      })
    );
    expect(html).toContain("<strong>Custom</strong>");
    expect(html).toContain("0");
    expect(load).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("hands a removed custom renderer back to built-in choices", async () => {
    const load = vi.fn(() => Promise.resolve([{ value: "Ada", label: "Ada" }]));
    const base = defaultFilterRegistry.get("select")!;
    const registry = shallowRef(
      withFilterType(defaultFilterRegistry, {
        ...base,
        type: "custom-select",
        render: () => null,
      })
    );
    const def: FilterDef<Row> = {
      key: "name",
      type: "custom-select",
      options: load,
    };
    const source: FilterFormSource<Row> = {
      extra: {},
      setExtra: vi.fn(),
      setExtras: vi.fn(),
    };
    const scope = effectScope();
    const model = scope.run(() =>
      useFilterHeaderControl<Row>(() => ({
        def,
        source,
        labels,
        registry: registry.value,
      }))
    )!;
    expect(model.value?.kind).toBe("custom");
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
    registry.value = withFilterType(defaultFilterRegistry, {
      ...base,
      type: "custom-select",
    });
    await vi.waitFor(() => {
      const current = model.value;
      if (current?.kind !== "select")
        throw new Error("Expected built-in select");
      expect(current.props.options.map((option) => option.value)).toEqual([
        "",
        "Ada",
      ]);
    });
    expect(load).toHaveBeenCalledOnce();
    scope.stop();
  });

  it("omits unsupported definitions instead of inventing a native fallback", () => {
    const f = fixture({ key: "name", type: "unregistered" });
    expect(f.model.value).toBeUndefined();
    expect(
      FilterHeaderControlChrome({ model: f.model.value, controls: slots })
    ).toBeNull();
    f.scope.stop();
  });

  it.each([
    ["text", "i"],
    ["select", "b"],
    ["multiSelect", "em"],
  ] as const)(
    "routes a %s model through its required adapter slot",
    async (type, tag) => {
      const f = fixture({
        key: "name",
        type,
        options: [{ value: "Ada", label: "Ada" }],
      });
      const html = await renderToString(
        createSSRApp({
          render: () =>
            FilterHeaderControlChrome({
              model: f.model.value,
              controls: slots,
            }),
        })
      );
      expect(html).toContain(`<${tag}>`);
      expect(html).not.toMatch(/<(?:input|select|button)\b/);
      f.scope.stop();
    }
  );

  it("requires every interactive slot and only renders structure itself", async () => {
    const f = fixture(
      { key: "amount", type: "numberRange" },
      { amountMin: 1, amountMax: 2 }
    );
    for (const key of ["Search", "Select", "Range", "Multi"] as const) {
      expect(() =>
        FilterHeaderControlChrome({
          model: f.model.value,
          controls: {
            ...slots,
            [key]: undefined,
          },
        })
      ).toThrow(`${key} control slot`);
    }
    const html = await renderToString(
      createSSRApp({
        render: () =>
          FilterHeaderControlChrome({ model: f.model.value, controls: slots }),
      })
    );
    expect(html).toContain(
      'data-adapttable-part="filter-header-input" class="compact"'
    );
    expect(html).not.toMatch(/<(?:input|select|button)\b/);
    f.scope.stop();
  });
});

it("keeps header row geometry from the caller's projected order and pads", async () => {
  const f = fixture({ key: "name", type: "text" });
  const control = vi.fn(() => h("i", "Slot"));
  const props = {
    columns: [{ key: "amount" }, { key: "name" }],
    defs: [{ key: "name", type: "text" }],
    source: f.source.value,
    labels,
    expandable: true,
    showReorder: true,
    selection: true,
    showActions: true,
    columnSpacers: { start: 120, end: 80 },
    stickyAttr: true,
    pinSide: (key: string) => (key === "name" ? "end" : undefined),
    cellStyle: () => ({ top: "32px" }),
    classNames: {
      filterHeaderRow: "row",
      filterHeaderCell: "cell",
      headerCell: "header",
    },
    controls: { Control: control },
  } as const;
  const html = await renderToString(
    createSSRApp({
      render: () => h("table", [h("thead", [FilterHeaderRowChrome(props)])]),
    })
  );
  const host = document.createElement("div");
  host.innerHTML = html;
  expect(
    [...host.querySelectorAll("[data-column-key]")].map((element) =>
      element.getAttribute("data-column-key")
    )
  ).toEqual(["amount", "name"]);
  expect(
    host.querySelector("[data-column-key='name']")?.getAttribute("data-pinned")
  ).toBe("end");
  expect(host.querySelector("tr")?.children).toHaveLength(8);
  expect(control).toHaveBeenCalledOnce();
  expect(FilterHeaderRowChrome({ ...props, enabled: false })).toBeNull();
  expect(FilterHeaderRowChrome({ ...props, defs: [] })).toBeNull();
  f.scope.stop();
});

it("keeps an unpadded row minimal and requires its adapter-owned control", async () => {
  const f = fixture({ key: "name", type: "text" });
  const props = {
    columns: [{ key: "name" }],
    defs: [{ key: "name", type: "text" }],
    source: f.source.value,
    labels,
  };
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h("table", [
          h("thead", [
            FilterHeaderRowChrome({
              ...props,
              controls: { Control: () => h("i", "Control") },
            }),
          ]),
        ]),
    })
  );
  const host = document.createElement("div");
  host.innerHTML = html;
  expect(host.querySelector("tr")?.children).toHaveLength(1);
  expect(host.querySelector("th")?.textContent).toBe("Control");
  expect(host.querySelector("th")?.hasAttribute("data-pinned")).toBe(false);
  expect(host.querySelector("th")?.hasAttribute("data-sticky")).toBe(false);
  expect(() =>
    FilterHeaderRowChrome({
      ...props,
      controls: {} as unknown as { Control: () => null },
    })
  ).toThrow("requires the Control slot");
  f.scope.stop();
});
