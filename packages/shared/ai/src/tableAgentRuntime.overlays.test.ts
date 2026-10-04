import {
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
  type TableEngine,
  type TableRevisionAxis,
} from "@adapttable/core";
import type { TableRuntimeView } from "@adapttable/core/binding";
import { afterEach, describe, expect, it } from "vitest";

import { createTableAgentController } from "./tableAgentController";
import { viewRevisionStamp } from "./tableAgentRuntime";
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));
function engineTable(): {
  engine: TableEngine<unknown>;
  table: NeutralTable<unknown>;
} {
  const engine = createTableEngine<unknown>({
    data: [{ id: "1", name: "Ada" }],
    columns: [{ key: "id" }, { key: "name" }],
    rowKey: (row) => String((row as { id: string }).id),
  });
  cleanup.push(engine.dispose);
  return { engine, table: createNeutralTable(engine, "people") };
}
function view(neutralTable?: NeutralTable<unknown>): TableRuntimeView {
  return {
    rows: [{ id: "1", name: "Ada" }],
    getRowId: () => "1",
    rowLabel: () => "Ada",
    neutralTable,
    columnLayout: { keys: ["id", "name"], hidden: [] },
    pinning: { columns: {}, rows: { top: [], bottom: [] } },
    selection: { selectedIds: new Set(), replace: () => undefined },
  };
}
function controller(read: () => TableRuntimeView, tableId = "people") {
  const controller = createTableAgentController({
    options: {
      current: {
        tableId,
        columns: { id: { type: "string" }, name: { type: "string" } },
        approval: "never",
      },
    },
    runtime: {
      current: {
        view: read,
        rowAt: (index) => read().rows[index],
        labels: () => undefined,
        featureIds: () => [],
      },
    },
    flushAdmission: () => undefined,
    flush: (run) => run(),
  });
  cleanup.push(controller.disconnect);
  return controller;
}
describe.each(["engine", "server"] as const)("%s runtime overlays", (tier) => {
  const base = () => view(tier === "engine" ? engineTable().table : undefined);
  it.each([
    "hide",
    "order",
    "column-pin",
    "row-pin",
    "selection",
    "all-matching",
    "across-pages",
  ] as const)("advances the stamp for %s changes", (operation) => {
    const before = base();
    let after: TableRuntimeView;
    switch (operation) {
      case "hide":
        after = {
          ...before,
          columnLayout: { keys: ["id", "name"], hidden: ["name"] },
        };
        break;
      case "order":
        after = {
          ...before,
          columnLayout: { keys: ["name", "id"], hidden: [] },
        };
        break;
      case "column-pin":
        after = { ...before, pinning: { columns: { name: "start" } } };
        break;
      case "row-pin":
        after = {
          ...before,
          pinning: { columns: {}, rows: { top: ["1"], bottom: [] } },
        };
        break;
      case "selection":
        after = {
          ...before,
          selection: { selectedIds: new Set(["1"]), replace: () => undefined },
        };
        break;
      case "all-matching":
        after = {
          ...before,
          selection: {
            selectedIds: new Set(),
            allMatching: true,
            replace: () => undefined,
          },
        };
        break;
      case "across-pages":
        after = {
          ...before,
          selection: {
            selectedIds: new Set(),
            acrossPages: true,
            replace: () => undefined,
          },
        };
        break;
    }
    expect(viewRevisionStamp(after)).not.toBe(viewRevisionStamp(before));
  });
  it("normalizes set-like fields without mutating host collections", () => {
    const ids = new Set(["b", "a"]);
    const hidden = Object.freeze(["name", "id"]);
    const pins = Object.freeze({ name: "end" as const, id: "start" as const });
    const first = {
      ...base(),
      columnLayout: { keys: ["id", "name"], hidden },
      pinning: { columns: pins },
      selection: { selectedIds: ids, replace: () => undefined },
    };
    const equivalent = {
      ...first,
      columnLayout: { keys: ["id", "name"], hidden: ["id", "name", "name"] },
      pinning: { columns: { id: "start" as const, name: "end" as const } },
      selection: { selectedIds: new Set(["a", "b"]), replace: () => undefined },
    };
    expect(viewRevisionStamp(first)).toBe(viewRevisionStamp(equivalent));
    expect([...ids]).toEqual(["b", "a"]);
    expect(hidden).toEqual(["name", "id"]);
    expect(Object.keys(pins)).toEqual(["name", "id"]);
  });
  it("preserves order-sensitive column and row pin order", () => {
    const first = {
      ...base(),
      pinning: { columns: {}, rows: { top: ["1", "2"], bottom: ["3", "4"] } },
    };
    expect(
      viewRevisionStamp({
        ...first,
        pinning: { columns: {}, rows: { top: ["2", "1"], bottom: ["3", "4"] } },
      })
    ).not.toBe(viewRevisionStamp(first));
    expect(
      viewRevisionStamp({
        ...first,
        pinning: { columns: {}, rows: { top: ["1", "2"], bottom: ["4", "3"] } },
      })
    ).not.toBe(viewRevisionStamp(first));
  });
  it("keeps omitted scope metadata equivalent to explicit false", () => {
    const initial = base();
    const ids = new Set(["1"]);
    const omitted = {
      ...initial,
      selection: { selectedIds: ids, replace: () => undefined },
    };
    const explicit = {
      ...initial,
      selection: {
        selectedIds: ids,
        allMatching: false,
        acrossPages: false,
        replace: () => undefined,
      },
    };
    expect(viewRevisionStamp(explicit)).toBe(viewRevisionStamp(omitted));
  });
  it("keeps an idempotent no-op at the same session revision", () => {
    let current = base();
    const live = controller(() => current).session();
    const revision = live.manifest().viewRevision;
    current = {
      ...current,
      selection: {
        selectedIds: new Set(),
        allMatching: false,
        acrossPages: false,
        replace: () => undefined,
      },
      columnLayout: { keys: ["id", "name"], hidden: [] },
      pinning: { columns: {}, rows: { top: [], bottom: [] } },
    };
    expect(live.manifest().viewRevision).toBe(revision);
  });
});
describe("source and authority boundaries", () => {
  it.each(["data", "view", "schema", "policy"] as const)(
    "retains the %s engine revision axis",
    (axis) => {
      const source = engineTable();
      const current = view(source.table);
      const before = viewRevisionStamp(current);
      source.engine.invalidate([axis satisfies TableRevisionAxis]);
      expect(viewRevisionStamp(current)).not.toBe(before);
    }
  );
  it("isolates independent sessions and retains source replacement epochs", () => {
    const one = engineTable();
    const two = engineTable();
    let first = view(one.table);
    const second = view(two.table);
    const left = controller(() => first, "left").session();
    const right = controller(() => second, "right").session();
    const start = left.manifest().viewRevision;
    const other = right.manifest().viewRevision;
    first = {
      ...first,
      columnLayout: { keys: ["id", "name"], hidden: ["name"] },
    };
    const changed = left.manifest().viewRevision;
    expect(changed).toBeGreaterThan(start);
    expect(right.manifest().viewRevision).toBe(other);
    const replacement = engineTable();
    first = { ...first, neutralTable: replacement.table };
    expect(left.manifest().viewRevision).toBeGreaterThan(changed);
    expect(right.manifest().viewRevision).toBe(other);
  });
  it("observes scope without granting full-dataset reads or new operations", async () => {
    let current = view();
    const live = controller(() => current).session();
    const beforeSource = live.manifest().source;
    const beforeKeys = live.catalog().map((entry) => entry.key);
    const before = await live.execute(
      "rows.read",
      { scope: "full", offset: 0, limit: 1 },
      live.manifest().viewRevision,
      "before"
    );
    expect(before.ok).toBe(false);
    current = {
      ...current,
      selection: {
        selectedIds: new Set(["1"]),
        allMatching: true,
        acrossPages: true,
        replace: () => undefined,
      },
    };
    expect(live.manifest().source).toEqual(beforeSource);
    expect(live.catalog().map((entry) => entry.key)).toEqual(beforeKeys);
    const after = await live.execute(
      "rows.read",
      { scope: "full", offset: 0, limit: 1 },
      live.manifest().viewRevision,
      "after"
    );
    expect(after.ok).toBe(false);
    expect(after.error?.code).toBe(before.error?.code);
  });
});
