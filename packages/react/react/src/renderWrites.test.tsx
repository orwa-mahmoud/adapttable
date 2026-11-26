/**
 * A render reads the table's stores and writes none of them: every write
 * comes from an event or an effect. Each table store is wrapped so a write
 * records the stack it was made on; one made inside a component render
 * carries React's render frame.
 */
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type * as TableStoreModule from "../../../shared/core/src/state/tableStore";
import type { ColumnDef } from "./columnDef";
import { DataTableShellView } from "./features/chromeBodyGate";
import { columnMenu, selection } from "./features/factories";
import { FeatureProviders } from "./features/providers";
import { rowPinning } from "./features/row-pinning";
import { applyTableFeatures } from "./features/tableFeature";
import { createMemoryAdapter } from "./url/adapter";
import {
  type DataTableShellResult,
  useDataTableShell,
} from "./useDataTableShell";

const writes: string[] = [];
// Every frame, so a write made deep inside a render still shows the render.
Error.stackTraceLimit = Infinity;

/** A store whose writes, and its scopes' writes, are recorded. */
function recorded(
  store: TableStoreModule.TableStore
): TableStoreModule.TableStore {
  const record = () => writes.push(new Error("store write").stack ?? "");
  return {
    ...store,
    dispatch: (action) => {
      record();
      store.dispatch(action);
    },
    batch: (run) => {
      record();
      store.batch(run);
    },
    scope: (seed) => recorded(store.scope(seed)),
  };
}

vi.mock("../../../shared/core/src/state/tableStore", async (load) => {
  const actual = await load<typeof TableStoreModule>();
  return {
    ...actual,
    createTableStore: (seed?: Parameters<typeof actual.createTableStore>[0]) =>
      recorded(actual.createTableStore(seed)),
  };
});

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true, accessor: (r) => r.name },
];
const rowKey = (row: Row) => row.id;
const noForm = () => null;

/** Writes made while React was rendering a component. */
const inRender = () =>
  writes.filter((stack) => stack.includes("renderWithHooks"));

describe("a React table render", () => {
  it("writes none of the table's stores", () => {
    const adapter = createMemoryAdapter("");
    let view: DataTableShellResult<Row> | undefined;
    function Table(props: {
      readonly selectedIds: readonly string[];
      readonly limit: number;
    }) {
      const shellProps = applyTableFeatures({
        features: [
          columnMenu(),
          rowPinning(),
          selection({
            selectedIds: props.selectedIds,
            onSelectionChange: () => undefined,
          }),
        ],
        data: ROWS,
        columns,
        rowKey,
        urlAdapter: adapter,
        defaults: { limit: props.limit },
      });
      return (
        <FeatureProviders props={shellProps}>
          <Shell props={shellProps} />
        </FeatureProviders>
      );
    }
    function Shell({ props }: { readonly props: object }) {
      const shell = useDataTableShell(props as never, noForm as never);
      return (
        <DataTableShellView shell={shell}>
          {(next) => {
            view = next as DataTableShellResult<Row>;
            return null;
          }}
        </DataTableShellView>
      );
    }

    const { rerender } = render(<Table selectedIds={[]} limit={10} />);
    rerender(<Table selectedIds={["a"]} limit={10} />);
    rerender(<Table selectedIds={["a"]} limit={20} />);
    act(() => view!.table.toggleSort("name"));
    act(() => view!.source.setSearch("bo"));
    act(() => view!.chrome.columnLayout.setWidth("name", 180));
    expect(view!.source.limit).toBe(20);

    expect(writes.length).toBeGreaterThan(0);
    expect(inRender()).toEqual([]);
  });
});
