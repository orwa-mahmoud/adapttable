import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { filterViewKey, rowActionsModelKey } from "../layout/modelChannels";
import {
  type ResolvedTableOptions,
  useDataTableShell,
} from "../useDataTableShell";
import { columnMenu } from "./columnMenu";
import type { FeatureMountContext } from "./tableFeature";

interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [{ id: "a", name: "Ada" }];
const base: ResolvedTableOptions<Row> = {
  data,
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  urlSync: false,
};

describe("column menu feature", () => {
  it("publishes the menu model and draws it from the toolbar entry", () => {
    const scope = effectScope();
    const opened = vi.fn();
    const shell = scope.run(() => useDataTableShell(base));
    if (!shell) throw new Error("Missing shell");
    shell.state.set(filterViewKey<Row>(), {
      openPanel: opened,
    } as never);
    shell.state.set(rowActionsModelKey<Row>(), {
      hasRowActions: true,
    } as never);
    const feature = columnMenu();
    const context: FeatureMountContext<Row> = {
      runtime: shell.runtime,
      root: shallowRef(document.createElement("div")),
      urlAdapter: shell.urlAdapter,
      flushViewState: shell.flushViewState,
      registerViewStateFlush: () => undefined,
      source: shell.source,
      table: shell.table,
      featureHost: shell.featureHost,
      filterRuntime: shell.filterRuntime,
      options: shallowRef({ ...base, rowReorder: true }),
      feature: () => feature,
      state: shell.state,
      scope,
      active: shell.active,
      reconcile: shell.reconcile,
      flushAdmission: () => undefined,
      flush: (run) => run(),
    };
    scope.run(() => feature.mount?.(context));
    const render = feature.renders?.[0]?.render;
    if (!render) throw new Error("Missing column menu render");
    const drawn = vi.fn();
    expect(
      render({
        presentation: {} as never,
        density: "regular",
        onDensityChange: () => undefined,
        read: () => undefined,
        draw: drawn,
      })
    ).toBeNull();
    const node = render({
      presentation: { dir: "ltr" } as never,
      density: "regular",
      onDensityChange: () => undefined,
      read: (key) => shell.state.get(key).value,
      draw: drawn,
    });
    expect(drawn).toHaveBeenCalled();
    const model = drawn.mock.calls[0]?.[1] as {
      onAutoSize: () => void;
      onAutoSizeColumn: (key: string) => void;
      onSortColumn: (key: string, dir: "asc" | "desc") => void;
      onRenameColumn: (key: string, name: string) => void;
      onFilterColumn?: () => void;
      hasRowActions?: boolean;
      hasRowReorder?: boolean;
    };
    model.onAutoSize();
    model.onAutoSizeColumn("name");
    model.onSortColumn("name", "asc");
    model.onRenameColumn("name", "Person");
    model.onFilterColumn?.();
    expect(opened).toHaveBeenCalledTimes(1);
    expect(model.hasRowActions).toBe(true);
    expect(model.hasRowReorder).toBe(true);
    expect(node).not.toBeNull();
    scope.stop();
  });
});
