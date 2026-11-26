/**
 * Features are called inline on every render. A controlled option the host
 * changes reaches its feature without remounting it, and reordering the
 * array changes nothing: the state the features hold stays.
 */
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { DataTableShellView } from "./chromeBodyGate";
import { selection } from "./factories";
import { FeatureProviders } from "./providers";
import { rowPinning } from "./row-pinning";
import { applyTableFeatures } from "./tableFeature";

interface Row {
  readonly id: string;
  readonly name: string;
}

const ROWS: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];
const rowKey = (row: Row): string => row.id;
const noForm = () => null;

function mount() {
  let view: DataTableShellResult<Row> | undefined;
  function Table({
    ids,
    pinsFirst,
  }: {
    readonly ids: readonly string[];
    readonly pinsFirst: boolean;
  }) {
    const chosen = selection({
      selectedIds: ids,
      onSelectionChange: () => undefined,
    });
    const pins = rowPinning();
    const props = applyTableFeatures({
      features: pinsFirst ? [pins, chosen] : [chosen, pins],
      data: ROWS,
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
  const screen = render(<Table ids={["a"]} pinsFirst={false} />);
  return {
    get view() {
      if (!view) throw new Error("The table did not render");
      return view;
    },
    show: (ids: readonly string[], pinsFirst: boolean) => {
      screen.rerender(<Table ids={ids} pinsFirst={pinsFirst} />);
    },
  };
}

describe("inline features", () => {
  it("take a new controlled option and keep their state when reordered", () => {
    const table = mount();
    expect(table.view.tableProps.table.selection?.isSelected("a")).toBe(true);
    act(() => {
      table.view.tableProps.rowPinning?.pin("b", "top");
    });
    act(() => {
      table.show(["b"], false);
    });
    const { selection: chosen } = table.view.tableProps.table;
    expect(chosen?.isSelected("b")).toBe(true);
    expect(chosen?.isSelected("a")).toBe(false);
    expect(table.view.tableProps.rowPinning?.sideOf("b")).toBe("top");
    act(() => {
      table.show(["b"], true);
    });
    expect(table.view.tableProps.table.selection?.isSelected("b")).toBe(true);
    expect(table.view.tableProps.rowPinning?.sideOf("b")).toBe("top");
  });
});
