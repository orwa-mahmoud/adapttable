import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  type DataTableShellProps,
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { DataTableShellView } from "./chromeBodyGate";
import { bulkActions } from "./factories";
import {
  FeatureProviders,
  type TableRuntimeView,
  useTableRuntime,
} from "./providers";
import { rowActions } from "./row-actions";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/**
 * The host's own actions reach the runtime view every kit publishes, which is
 * where an agent binding reads them. The table's built-in row controls do not.
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
  onView,
}: {
  onView: (actions: TableRuntimeView<Row>["actions"]) => void;
}) {
  onView(useTableRuntime<Row>().view()?.actions);
  return null;
}

function Shell({
  props,
  onView,
}: {
  readonly props: DataTableShellProps<Row>;
  readonly onView: (actions: TableRuntimeView<Row>["actions"]) => void;
}) {
  const shell = useDataTableShell(props, noForm);
  return (
    <DataTableShellView<Row> shell={shell}>
      {(_next: DataTableShellResult<Row>) => <Probe onView={onView} />}
    </DataTableShellView>
  );
}

function Harness({
  features,
  onView,
}: {
  features: readonly TableFeature<Row>[];
  onView: (actions: TableRuntimeView<Row>["actions"]) => void;
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
      <Shell props={props} onView={onView} />
    </FeatureProviders>
  );
}

describe("the runtime view carries the host's actions", () => {
  it("publishes composed row and bulk actions, without the built-in controls", () => {
    let seen: TableRuntimeView<Row>["actions"];
    const open = { key: "open", label: "Open", onClick: vi.fn() };
    const archive = { key: "archive", label: "Archive", onClick: vi.fn() };
    render(
      <Harness
        features={[
          rowActions<Row>([open], { onDeleteRow: vi.fn() }),
          bulkActions([archive]),
        ]}
        onView={(actions) => {
          seen = actions;
        }}
      />
    );

    expect(seen?.row.map((action) => action.key)).toEqual(["open"]);
    expect(seen?.bulk.map((action) => action.key)).toEqual(["archive"]);
  });

  it("publishes nothing when the host composed no actions", () => {
    let seen: TableRuntimeView<Row>["actions"] = { row: [], bulk: [] };
    render(
      <Harness
        features={[]}
        onView={(actions) => {
          seen = actions;
        }}
      />
    );

    expect(seen).toBeUndefined();
  });
});
