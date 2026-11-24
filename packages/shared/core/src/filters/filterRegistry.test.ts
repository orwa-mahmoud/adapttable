import { describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import { defaultFilterRegistry, resolveFilterRegistry } from "./filterBuiltins";
import { buildFilterRuntime, filterPredicate } from "./filterDefs";
import {
  createFilterRegistry,
  emptyFilterRegistry,
  filterTypeDefaultOp,
  filterTypeOps,
  type FilterTypeSpec,
  filterTypeSpec,
  filterWidgetFor,
  filterWidgetKind,
  renderRegisteredFilter,
  withExtendedFilterType,
  withFilterType,
} from "./filterRegistry";
import { TEXT_OPS } from "./operators";

interface Row {
  sku: string;
  name: string;
}

const SKU: FilterTypeSpec = {
  type: "sku",
  widget: "text",
  ops: ["eq"],
  defaultOp: "eq",
  urlArray: false,
  stateKeys: (def) => [def.key],
  match: (def, extra, row) => {
    const needle = extra[def.key];
    if (needle == null || needle === "") return true;
    return (row as Row).sku === String(needle);
  },
  chips: (def) => ({
    [def.key]: (value) => `SKU: ${value}`,
  }),
  conditionToExtra: (def, condition) => ({
    [def.key]:
      typeof condition.value === "string" ? condition.value : undefined,
  }),
};

describe("createFilterRegistry", () => {
  it("last write wins on a repeated type", () => {
    const first: FilterTypeSpec = { ...SKU, defaultOp: "eq" };
    const second: FilterTypeSpec = { ...SKU, defaultOp: "contains" };
    const registry = createFilterRegistry([first, second]);
    expect(registry.get("sku")?.defaultOp).toBe("contains");
    expect(registry.has("sku")).toBe(true);
    expect(registry.types()).toEqual(["sku"]);
  });

  it("emptyFilterRegistry starts with nothing", () => {
    expect(emptyFilterRegistry().types()).toEqual([]);
    expect(emptyFilterRegistry().has("text")).toBe(false);
  });
});

describe("register / extend", () => {
  it("register is immutable and adds a custom type", () => {
    const next = withFilterType(defaultFilterRegistry, SKU);
    expect(defaultFilterRegistry.has("sku")).toBe(false);
    expect(next.has("sku")).toBe(true);
    expect(filterWidgetKind({ type: "sku" }, next)).toBe("text");
    expect(filterTypeOps({ type: "sku" }, next)).toEqual(["eq"]);
    expect(filterTypeDefaultOp({ type: "sku" }, next)).toBe("eq");
    expect(filterTypeSpec("sku", next)?.type).toBe("sku");
  });

  it("extend adds operators to a built-in without forking the table", () => {
    const next = withExtendedFilterType(defaultFilterRegistry, "text", {
      ops: [...TEXT_OPS, "soundsLike"],
      defaultOp: "soundsLike",
    });
    expect(filterTypeOps({ type: "text" }, defaultFilterRegistry)).toEqual(
      TEXT_OPS
    );
    expect(filterTypeOps({ type: "text" }, next)).toContain("soundsLike");
    expect(filterTypeDefaultOp({ type: "text" }, next)).toBe("soundsLike");
    expect(next.get("text")?.widget).toBe("text");
  });

  it("registers through the host, and the registry it read stays untouched", () => {
    // A registry is immutable: `registerFilterType` builds the next one, so a
    // render that already read the current registry cannot see a type appear
    // underneath it.
    const added = withFilterType(defaultFilterRegistry, SKU);
    expect(added.has("sku")).toBe(true);
    expect(defaultFilterRegistry.has("sku")).toBe(false);
    const patched = withExtendedFilterType(defaultFilterRegistry, "text", {
      defaultOp: "eq",
    });
    expect(filterTypeDefaultOp({ type: "text" }, patched)).toBe("eq");
    expect(
      filterTypeDefaultOp({ type: "text" }, defaultFilterRegistry)
    ).not.toBe("eq");
  });

  it("extend of an unknown type warns and returns the same registry", () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const next = withExtendedFilterType(defaultFilterRegistry, "nope", {
      defaultOp: "eq",
    });
    expect(next).toBe(defaultFilterRegistry);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('unknown type "nope"')
    );
    warn.mockRestore();
  });
});

describe("resolveFilterRegistry", () => {
  it("returns the built-ins when extras are empty", () => {
    expect(resolveFilterRegistry()).toBe(defaultFilterRegistry);
    expect(resolveFilterRegistry([])).toBe(defaultFilterRegistry);
  });

  it("merges extras onto the built-ins", () => {
    const registry = resolveFilterRegistry([SKU]);
    expect(registry.has("text")).toBe(true);
    expect(registry.has("sku")).toBe(true);
  });
});

describe("custom type as a first-class consumer", () => {
  it("match, chips and URL keys come from the spec", () => {
    const registry = resolveFilterRegistry([SKU]);
    const runtime = buildFilterRuntime<Row>(
      [{ key: "sku", type: "sku", label: "SKU" }],
      registry
    );
    expect(runtime.registry.has("sku")).toBe(true);
    expect(runtime.filterFn({ sku: "A-1", name: "Ada" }, { sku: "A-1" })).toBe(
      true
    );
    expect(runtime.filterFn({ sku: "A-1", name: "Ada" }, { sku: "B-2" })).toBe(
      false
    );
    expect(runtime.filterLabels.sku!("A-1")).toBe("SKU: A-1");
    expect(runtime.arrayExtraKeys).toEqual([]);
  });

  it("unknown type warns and matches every row", () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const predicate = filterPredicate<Row>(
      { key: "sku", type: "nope" },
      defaultFilterRegistry
    );
    expect(predicate({ sku: "A-1", name: "Ada" }, { sku: "nope" })).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown filter type "nope"')
    );
    warn.mockRestore();
  });
});

describe("renderRegisteredFilter", () => {
  it("draws a type's own render and nothing when the type has none", () => {
    const render = vi.fn(() => "drawn");
    const registry = createFilterRegistry([{ ...SKU, render }]);
    const def = { key: "sku", type: "sku" } as const;
    expect(
      renderRegisteredFilter(def, {} as never, {} as never, registry, "field")
    ).toBe("drawn");
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({ def, className: "field" })
    );
    expect(
      renderRegisteredFilter(
        def,
        {} as never,
        {} as never,
        emptyFilterRegistry()
      )
    ).toBeUndefined();
  });
});

describe("lookup helpers without a spec", () => {
  it("ops and defaultOp fall back when the type is unknown", () => {
    const empty = emptyFilterRegistry();
    expect(filterWidgetKind({ type: "text" }, empty)).toBeUndefined();
    expect(filterTypeOps({ type: "text" }, empty)).toEqual(["eq"]);
    expect(filterTypeDefaultOp({ type: "text" }, empty)).toBe("eq");
    expect(filterTypeSpec("text", empty)).toBeUndefined();
  });
});

describe("filterWidgetFor", () => {
  const widgets = [
    { kinds: ["text"] as const, render: "text field" },
    { kinds: ["dateRange", "numberRange"] as const, render: "range field" },
  ];

  it("draws the widget composed for the def's kind", () => {
    const registry = defaultFilterRegistry;
    expect(filterWidgetFor({ key: "q", type: "text" }, registry, widgets)).toBe(
      "text field"
    );
    expect(
      filterWidgetFor({ key: "age", type: "numberRange" }, registry, widgets)
    ).toBe("range field");
  });

  it("follows a registered type to the widget it names", () => {
    const registry = withFilterType(defaultFilterRegistry, SKU);
    expect(
      filterWidgetFor({ key: "sku", type: "sku" }, registry, widgets)
    ).toBe("text field");
  });

  it("draws nothing for a type that names no widget", () => {
    expect(
      filterWidgetFor(
        { key: "q", type: "text" },
        emptyFilterRegistry(),
        widgets
      )
    ).toBeUndefined();
  });

  it("names the filter and the missing widget when none was composed", () => {
    expect(() =>
      filterWidgetFor(
        { key: "status", type: "select" },
        defaultFilterRegistry,
        widgets
      )
    ).toThrow(
      'filter "status" of type "select" draws the "select" widget, which this filters feature was not composed with'
    );
  });
});
