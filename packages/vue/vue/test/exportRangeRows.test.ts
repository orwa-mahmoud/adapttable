import { featureStateKey, type GridFocusState } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { EXPORT_MODEL } from "../src/actions/contracts";
import { exportCsv } from "../src/export-csv";
import type { FeatureMountContext } from "../src/features/tableFeature";
import type { TableRowInventory } from "../src/hierarchy/rowInventory";
import type { TableRowModel } from "../src/layout/tableModels";
import {
  type ResolvedTableOptions,
  useDataTableShell,
} from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [
  { id: "first", name: "First source row" },
  { id: "visible", name: "Visible projected row" },
];
const base = {
  data,
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
};
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing export fixture model");
  return value;
}
describe("range export consumes the navigation row sequence", () => {
  it.each(["body", "inventory", "source"] as const)(
    "uses the current %s row sequence without changing page scope",
    (kind) => {
      const scope = effectScope();
      const request = vi.fn();
      const options = shallowRef<ResolvedTableOptions<Row>>({
        ...base,
        exportCsv: { scope: "range", request },
      });
      const shell = required(scope.run(() => useDataTableShell(base)));
      const first = required(shell.desktop.value.rows[0]);
      const second = required(shell.desktop.value.rows[1]);
      const bodyRows = shallowRef<readonly TableRowModel<Row>[]>([
        second,
        first,
      ]);
      const inventory = shallowRef<TableRowInventory<Row>>({
        loadedRows: data,
        visibleRows: [second.row, first.row],
      });
      const selection = featureStateKey<Pick<GridFocusState, "range">>(
        "vue-grid-focus-model"
      );
      // A programmatic range is an existing grid projection, not an export-owned selection.
      shell.state.set(selection, {
        range: { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } },
      });
      const context: FeatureMountContext<Row> = {
        runtime: shell.runtime,
        root: shallowRef(null),
        urlAdapter: shell.urlAdapter,
        flushViewState: shell.flushViewState,
        registerViewStateFlush: () => undefined,
        source: shell.source,
        density: shell.density,
        table: shell.table,
        selection: shell.selection,
        bodyRows: kind === "body" ? bodyRows : undefined,
        rowInventory: kind === "inventory" ? inventory : undefined,
        featureHost: shell.featureHost,
        filterRuntime: shell.filterRuntime,
        options,
        state: shell.state,
        scope,
        active: shell.active,
        reconcile: shell.reconcile,
        flushAdmission: () => undefined,
        flush: (run) => run(),
      };
      scope.run(() =>
        exportCsv<Row>({ scope: "range", request }).mount?.(context)
      );
      required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scope: "range",
          rows: [kind === "source" ? data[0] : data[1]],
        })
      );
      options.value = { ...base, exportCsv: { scope: "page", request } };
      required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({ scope: "page", rows: data })
      );
      scope.stop();
    }
  );
});
