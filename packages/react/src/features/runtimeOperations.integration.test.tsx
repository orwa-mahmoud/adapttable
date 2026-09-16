import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  type DataTableShellProps,
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { DataTableShellView } from "./chromeBodyGate";
import { editing } from "./editing";
import { FeatureProviders, useTableRuntime } from "./providers";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/**
 * What an agent sees is what the table can actually do RIGHT NOW.
 *
 * The neutral table publishes its operations from the live runtime view, so a
 * feature the host stops composing has to disappear from that map — an agent
 * offered a capability the table no longer wires would fail at execute.
 */
interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "a", name: "Alice" }];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const noForm = () => null;

function Probe({
  onOperations,
}: {
  onOperations: (
    ops: Readonly<Record<string, boolean>> | undefined,
    hasNeutralTable: boolean
  ) => void;
}) {
  const runtime = useTableRuntime<Row>();
  const view = runtime.view();
  // Read it the way an agent does — through the neutral table the session
  // holds — not by calling the deriver directly.
  onOperations(view?.neutralTable?.operations, Boolean(view?.neutralTable));
  return null;
}

interface ShellProps {
  readonly props: DataTableShellProps<Row>;
  readonly onOperations: (
    ops: Readonly<Record<string, boolean>> | undefined,
    hasNeutralTable: boolean
  ) => void;
}

/**
 * Declared at module level on purpose: a component defined inside the harness
 * would be a NEW type on every render, so React would remount the whole
 * subtree and no staleness could ever be observed.
 */
function Shell({ props, onOperations }: ShellProps) {
  const shell = useDataTableShell(props, noForm);
  return (
    <DataTableShellView<Row> shell={shell}>
      {(_next: DataTableShellResult<Row>) => (
        <Probe onOperations={onOperations} />
      )}
    </DataTableShellView>
  );
}

function Harness({
  features,
  onOperations,
}: {
  features: readonly TableFeature<Row>[];
  onOperations: (
    ops: Readonly<Record<string, boolean>> | undefined,
    hasNeutralTable: boolean
  ) => void;
}) {
  const props = applyTableFeatures({
    features,
    data: ROWS,
    columns,
    rowKey: (r: Row) => r.id,
    urlSync: false,
  });
  return (
    <FeatureProviders props={props}>
      <Shell props={props} onOperations={onOperations} />
    </FeatureProviders>
  );
}

describe("runtime operations follow the composed features", () => {
  it("drops editCells when the editing feature is no longer composed", () => {
    let latest: Readonly<Record<string, boolean>> | undefined;
    let sawNeutralTable = false;
    const record = (
      ops: Readonly<Record<string, boolean>> | undefined,
      hasNeutralTable: boolean
    ): void => {
      latest = ops;
      sawNeutralTable = hasNeutralTable;
    };
    const withEditing: TableFeature<Row>[] = [editing<Row>(() => undefined)];
    const view = render(
      <Harness features={withEditing} onOperations={record} />
    );
    // The agent path is the neutral table's own map, not a fallback.
    expect(sawNeutralTable).toBe(true);
    expect(latest?.editCells).toBe(true);

    view.rerender(<Harness features={[]} onOperations={record} />);
    expect(sawNeutralTable).toBe(true);
    expect(latest?.editCells).toBe(false);
  });
});
