import { describe, expect, it, vi } from "vitest";

import { resolveLabels } from "../labels";
import type { QueryFilterGroup } from "../source/queryContract";
import {
  builtInFilterSpecs,
  defaultFilterRegistry,
  resolveFilterRegistry,
} from "./filterBuiltins";
import type { FilterDef } from "./filterDefs";
import {
  filterTreeChipLabel,
  filterTreeCombinatorOptions,
  filterTreeConditionModel,
  filterTreeEditorActions,
  filterTreeOpLabel,
  filterTreeValueEditor,
  newFilterTreeCondition,
} from "./filterTreeEditor";

const labels = resolveLabels({});
const registry = defaultFilterRegistry;
const def = (key: string, type: string, label?: string): FilterDef => ({
  key,
  type,
  label,
});
const textSpec = builtInFilterSpecs.find((spec) => spec.type === "text")!;
const custom = resolveFilterRegistry([{ ...textSpec, type: "sku" }]);

describe("filterTreeOpLabel", () => {
  it("labels an operator its widget knows, else shows it raw", () => {
    expect(filterTreeOpLabel("text", "contains", labels)).toBe(
      labels.opContains
    );
    expect(filterTreeOpLabel("numberRange", "gte", labels)).toBe(
      labels.opAtLeast
    );
    expect(filterTreeOpLabel("dateRange", "before", labels)).toBe(
      labels.opBefore
    );
    expect(filterTreeOpLabel("text", "gte", labels)).toBe("gte");
    expect(filterTreeOpLabel(undefined, "eq", labels)).toBe("eq");
  });

  it("names the operators of the choice widgets instead of showing them raw", () => {
    expect(filterTreeOpLabel("select", "eq", labels)).toBe(labels.opEqual);
    expect(filterTreeOpLabel("boolean", "eq", labels)).toBe(labels.opEqual);
    expect(filterTreeOpLabel("multiSelect", "in", labels)).toBe(labels.opIn);
    expect(filterTreeOpLabel("checklist", "notIn", labels)).toBe(
      labels.opNotIn
    );
    expect(filterTreeOpLabel("select", "between", labels)).toBe("between");
  });
});

describe("filterTreeValueEditor", () => {
  const editor = (type: string, op: string, value?: unknown) =>
    filterTreeValueEditor(
      def("k", type),
      { key: "k", op, value },
      registry,
      labels
    );

  it("has no editor for a valueless operator", () => {
    expect(editor("text", "empty")).toEqual({ kind: "none" });
  });

  it("offers true or false for a boolean", () => {
    const on = editor("boolean", "eq", true);
    expect(on).toMatchObject({ kind: "boolean", choice: "true" });
    expect(editor("boolean", "eq", "false")).toMatchObject({ choice: "false" });
    expect(editor("boolean", "eq", false)).toMatchObject({ choice: "false" });
    if (on.kind === "boolean") {
      expect(on.options.map((o) => o.value)).toEqual(["true", "false"]);
      expect(on.write("false")).toBe(false);
    }
  });

  it("splits and joins a relative token", () => {
    const counted = editor("dateRange", "relative", "last:7");
    const fresh = editor("dateRange", "relative");
    expect(fresh).toMatchObject({
      kind: "relative",
      preset: "today",
      counted: false,
    });
    expect(counted).toMatchObject({ kind: "relative", counted: true });
    if (counted.kind === "relative") {
      expect(counted.options.length).toBeGreaterThan(0);
      expect(counted.writeCount("x")).toBe("last:1");
      expect(typeof counted.writePreset("today")).toBe("string");
    }
  });

  it("edits the two bounds of between", () => {
    const pair = editor("numberRange", "between", [1, 9]);
    expect(pair).toMatchObject({
      kind: "between",
      type: "number",
      a: "1",
      b: "9",
    });
    if (pair.kind === "between") {
      expect(pair.writeA("2")).toEqual(["2", "9"]);
      expect(pair.writeB("8")).toEqual(["1", "8"]);
    }
    expect(editor("dateRange", "between", "2026-01-01")).toMatchObject({
      type: "date",
      a: "2026-01-01",
      b: "",
    });
  });

  it("edits one value, splitting a list", () => {
    const list = editor("numberRange", "in", ["1", 2, { x: 1 }]);
    expect(list).toMatchObject({ kind: "single", type: "text", text: "1,2," });
    if (list.kind === "single") expect(list.write("a,b")).toEqual(["a", "b"]);
    const single = editor("text", "contains", null);
    expect(single).toMatchObject({ kind: "single", type: "text", text: "" });
    if (single.kind === "single") expect(single.write("a,b")).toBe("a,b");
    expect(editor("text", "contains", false)).toMatchObject({ text: "false" });
    expect(editor("text", "contains", { x: 1 })).toMatchObject({ text: "" });
  });
});

describe("filterTreeConditionModel", () => {
  const defs = [def("name", "text", "Name"), def("active", "boolean")];

  it("builds the field and operator choices and the edits", () => {
    const model = filterTreeConditionModel(
      { key: "name", op: "contains", value: "a" },
      defs,
      registry,
      labels
    )!;
    expect(model.fieldOptions.map((option) => option.value)).toEqual([
      "name",
      "active",
    ]);
    expect(model.fieldOptions[0]?.label).toBe("Name");
    expect(model.opOptions.length).toBeGreaterThan(1);
    expect(model.withField("active")).toEqual(
      newFilterTreeCondition(defs[1]!, registry)
    );
    expect(model.withField("gone")).toBeUndefined();
    expect(model.withOp("eq")).toEqual({
      key: "name",
      op: "eq",
      value: undefined,
    });
    expect(model.withValue("b")).toMatchObject({ value: "b" });
  });

  it("falls back to the first def, and offers no operator choice for one", () => {
    const one = resolveFilterRegistry([
      { ...textSpec, type: "one", ops: ["eq"] },
    ]);
    const model = filterTreeConditionModel(
      { key: "gone", op: "eq" },
      [def("x", "one")],
      one,
      labels
    )!;
    expect(model.def.key).toBe("x");
    expect(model.opOptions).toEqual([]);
    expect(
      filterTreeConditionModel({ key: "a", op: "eq" }, [], registry, labels)
    ).toBeUndefined();
  });
});

describe("filterTreeEditorActions", () => {
  const first = def("name", "text");
  const tree: QueryFilterGroup = {
    combinator: "and",
    conditions: [{ key: "name", op: "contains", value: "a" }],
  };

  it("starts a tree, and edits an existing one", () => {
    const commit = vi.fn();
    const empty = filterTreeEditorActions(undefined, commit, first, registry);
    empty.addCondition([]);
    expect(commit.mock.lastCall?.[0].conditions).toHaveLength(1);
    empty.addGroup([]);
    expect(commit.mock.lastCall?.[0].conditions).toHaveLength(1);

    const actions = filterTreeEditorActions(tree, commit, first, registry);
    actions.setCombinator([], "or");
    expect(commit.mock.lastCall?.[0].combinator).toBe("or");
    actions.setCombinator([], "nope");
    expect(commit.mock.lastCall?.[0].combinator).toBe("and");
    actions.replace([0], { key: "name", op: "eq" });
    expect(commit.mock.lastCall?.[0].conditions[0].op).toBe("eq");
    actions.remove([0]);
    expect(commit).toHaveBeenCalledTimes(6);
  });

  it("offers AND before OR", () => {
    expect(filterTreeCombinatorOptions(labels).map((o) => o.value)).toEqual([
      "and",
      "or",
    ]);
  });
});

describe("filterTreeChipLabel", () => {
  it("names the field, operator and value", () => {
    const defs = [def("name", "text", "Name"), def("when", "dateRange")];
    expect(
      filterTreeChipLabel(
        { key: "name", op: "contains", value: "ab" },
        defs,
        labels
      )
    ).toContain("Name");
    expect(
      filterTreeChipLabel({ key: "gone", op: "eq", value: 3 }, defs, labels)
    ).toContain("gone");
    expect(
      filterTreeChipLabel(
        { key: "when", op: "relative", value: "today" },
        defs,
        labels
      )
    ).toContain(labels.relToday);
    expect(
      filterTreeChipLabel(
        { key: "name", op: "in", value: ["a", null] },
        defs,
        labels
      )
    ).toContain("a");
    expect(
      filterTreeChipLabel({ key: "name", op: "in", value: [] }, defs, labels)
    ).toBe(
      filterTreeChipLabel({ key: "name", op: "in", value: "" }, defs, labels)
    );
    expect(
      filterTreeChipLabel(
        { key: "name", op: "contains", value: {} },
        defs,
        labels
      )
    ).toBe(filterTreeChipLabel({ key: "name", op: "contains" }, defs, labels));
  });

  it("labels a custom type's operators through its registry widget", () => {
    const defs = [def("sku", "sku", "SKU")];
    const condition = { key: "sku", op: "contains", value: "x" };
    expect(filterTreeChipLabel(condition, defs, labels)).not.toContain(
      labels.opContains
    );
    expect(filterTreeChipLabel(condition, defs, labels, custom)).toContain(
      labels.opContains
    );
  });
});
