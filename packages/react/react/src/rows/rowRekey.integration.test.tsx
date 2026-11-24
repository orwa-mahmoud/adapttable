/**
 * A rekey moves everything the table keeps by row id: the selection, the
 * pinned rows and the open details follow the row to its new id in the commit
 * that rekeyed it, and a later patch finds the row by that id.
 */
import { applyRowPatches, rekeyRow, updateRow } from "@adapttable/core";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { DataTableShellView } from "../features/chromeBodyGate";
import { dirtyIndicators, editing } from "../features/editing";
import { bulkActions, selection } from "../features/factories";
import { FeatureProviders } from "../features/providers";
import { rowDetail } from "../features/row-detail";
import { rowPinning } from "../features/row-pinning";
import {
  applyTableFeatures,
  type TableFeature,
} from "../features/tableFeature";
import {
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";

interface Row {
  readonly id: string;
  readonly name: string;
}

const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];
const rowKey = (row: Row): string => row.id;
const ROWS: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const noForm = () => null;

function mount(
  extra: {
    selectedIds?: readonly string[];
    onSelectionChange?: (ids: string[]) => void;
  } = {},
  more: readonly TableFeature<Row>[] = []
) {
  let view: DataTableShellResult<Row> | undefined;
  const features = [
    selection(extra),
    bulkActions([
      { key: "archive", label: "Archive", onClick: () => undefined },
    ]),
    rowPinning(),
    rowDetail<Row>(() => null),
    ...more,
  ];
  function Table({ rows }: { readonly rows: readonly Row[] }) {
    const props = applyTableFeatures({
      features,
      data: rows,
      columns,
      rowKey,
      urlSync: false,
    });
    return (
      <FeatureProviders props={props}>
        <Shell props={props} />
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
  const screen = render(<Table rows={ROWS} />);
  return {
    get view() {
      if (!view) throw new Error("The table did not render");
      return view;
    },
    show: (rows: readonly Row[]) => {
      screen.rerender(<Table rows={rows} />);
    },
  };
}

describe("a rekeyed row", () => {
  it("keeps its selection, pin and open detail under its new id", () => {
    const table = mount();
    act(() => {
      table.view.tableProps.table.selection?.toggle("a");
      table.view.tableProps.rowPinning?.pin("a", "top");
      table.view.tableProps.expansion?.toggle("a");
    });
    const rekeyed = applyRowPatches(
      ROWS,
      [rekeyRow<Row>("a", { id: "a2" }), updateRow<Row>("a2", { name: "Al" })],
      rowKey
    );
    act(() => {
      table.show(rekeyed);
    });
    const { selection } = table.view.tableProps.table;
    expect(selection?.isSelected("a2")).toBe(true);
    expect(selection?.isSelected("a")).toBe(false);
    expect(table.view.tableProps.rowPinning?.sideOf("a2")).toBe("top");
    expect(table.view.tableProps.rowPinning?.sideOf("a")).toBeUndefined();
    expect(table.view.tableProps.expansion?.isExpanded("a2")).toBe(true);
  });

  it("asks a host that holds the selection to move it", () => {
    const onSelectionChange = vi.fn();
    const table = mount({ selectedIds: ["b"], onSelectionChange });
    expect(table.view.tableProps.table.selection?.isSelected("b")).toBe(true);
    act(() => {
      table.show(
        applyRowPatches(ROWS, [rekeyRow<Row>("b", { id: "b2" })], rowKey)
      );
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b2"]);
  });

  it("keeps an open cell editor, its draft and its dirty mark", () => {
    const table = mount({}, [
      editing<Row>(() => undefined, { onDirtyChange: () => undefined }),
      dirtyIndicators(),
    ]);
    act(() => {
      const edit = table.view.tableProps.editing;
      edit?.state.begin("a", "name", "Ada", ROWS[0]);
      edit?.state.setDraft("Typed");
      edit?.dirty?.mark("a", "name");
    });
    expect(table.view.tableProps.editing?.dirty?.isDirty("a", "name")).toBe(
      true
    );
    act(() => {
      table.show(
        applyRowPatches(ROWS, [rekeyRow<Row>("a", { id: "a2" })], rowKey)
      );
    });
    const edit = table.view.tableProps.editing;
    expect(edit?.state.active).toEqual({ rowId: "a2", columnKey: "name" });
    expect(edit?.state.draft).toBe("Typed");
    expect(edit?.dirty?.isDirty("a2", "name")).toBe(true);
    expect(edit?.dirty?.isDirty("a", "name")).toBe(false);
  });

  it("leaves the state alone for new data that is not a patch of the old", () => {
    const table = mount();
    act(() => {
      table.view.tableProps.table.selection?.toggle("a");
    });
    act(() => {
      table.show([{ id: "a2", name: "Ada" }, ROWS[1]!]);
    });
    expect(table.view.tableProps.table.selection?.isSelected("a2")).toBe(false);
  });
});
