import { featureStateKey } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import { effectScope, onScopeDispose, shallowRef, watch } from "vue";

import type {
  FeatureMountContext,
  TableFeature,
} from "../src/features/tableFeature";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
}
const key = featureStateKey<number>("model-lifetime");
const rows: readonly Row[] = [{ id: "1" }];
const columns = [{ key: "id" }];
const rowKey = (row: Row) => row.id;
describe("optional editing model lifetime", () => {
  it("keeps one lazy model through feature dependencies and disposes only its owner on replacement", () => {
    const events: string[] = [];
    const values: unknown[] = [];
    const model = (context: FeatureMountContext<Row>) => {
      events.push("model");
      context.state.set(key, 1);
      watch(context.options, (value) => values.push(value.testValue), {
        immediate: true,
        flush: "sync",
      });
      onScopeDispose(() => events.push("model-scope-stop"));
      return () => events.push("model-cleanup");
    };
    const setup = () => {
      events.push("setup");
      return () => {
        events.push("setup-stop");
      };
    };
    const feature = (dependency: number): TableFeature<Row> => ({
      id: "editing",
      dependencies: [dependency],
      setup,
      apply: () => ({ editingModel: model, testValue: dependency }),
    });
    const declarations = shallowRef<readonly TableFeature<Row>[]>([]);
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell({
        data: rows,
        columns,
        rowKey,
        urlSync: false,
        features: declarations,
      })
    )!;
    expect(events).toEqual([]);
    declarations.value = [feature(1)];
    expect(events).toEqual(["setup", "model"]);
    declarations.value = [feature(2)];
    expect(events).toEqual(["setup", "model", "setup-stop", "setup"]);
    expect(values.at(-1)).toBe(2);
    expect(shell.state.get(key).value).toBe(1);
    const replacement = (context: FeatureMountContext<Row>) => {
      events.push("replacement");
      context.state.set(key, 2);
      return () => events.push("replacement-stop");
    };
    declarations.value = [
      { id: "replacement", apply: () => ({ editingModel: replacement }) },
    ];
    expect(events.slice(-4)).toEqual([
      "setup-stop",
      "model-cleanup",
      "model-scope-stop",
      "replacement",
    ]);
    expect(shell.state.get(key).value).toBe(2);
    declarations.value = [];
    expect(shell.state.get(key).value).toBeUndefined();
    expect(events.at(-1)).toBe("replacement-stop");
    scope.stop();
    expect(events.filter((event) => event === "model-cleanup")).toHaveLength(1);
    expect(events.filter((event) => event === "replacement-stop")).toHaveLength(
      1
    );
  });
  it("rolls back a throwing model scope and recovers with the next valid factory", () => {
    const stopped = vi.fn();
    const declarations = shallowRef<readonly TableFeature<Row>[]>([]);
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell({
        data: rows,
        columns,
        rowKey,
        urlSync: false,
        features: declarations,
      })
    )!;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(() => {
        declarations.value = [
          {
            id: "broken",
            apply: () => ({
              editingModel: (context: FeatureMountContext<Row>) => {
                context.state.set(key, 1);
                onScopeDispose(stopped);
                throw new Error("broken model");
              },
            }),
          },
        ];
      }).toThrow("broken model");
      expect(stopped).toHaveBeenCalledOnce();
      expect(shell.state.get(key).value).toBeUndefined();
      declarations.value = [
        {
          id: "valid",
          apply: () => ({
            editingModel: (context: FeatureMountContext<Row>) => {
              context.state.set(key, 2);
            },
          }),
        },
      ];
      expect(shell.state.get(key).value).toBe(2);
      scope.stop();
      expect(stopped).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
      scope.stop();
    }
  });
});
