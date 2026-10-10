/** The agent follows actual shell-owned state, including state outside the engine. */
import type { AgentManifest, AgentSession } from "@adapttable/ai";
import {
  applyTableFeatures,
  type ColumnDef,
  type DataTableShellProps,
  type DataTableShellResult,
  DataTableShellView,
  FeatureProviders,
  type TableRuntime,
  useDataTableShell,
  useTableRuntime,
} from "@adapttable/react/adapter";
import {
  columnMenu,
  columnSelectionCheckbox,
} from "@adapttable/react/features";
import { act, render, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import { tableAgent } from "./react";

interface Row {
  id: string;
  name: string;
  team: string;
  secret: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "A", secret: "private-one" },
  { id: "2", name: "Grace", team: "B", secret: "private-two" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "secret", header: "Secret", accessor: (row) => row.secret },
];
const noForm = () => null;
interface Captured {
  readonly shell: DataTableShellResult<Row>;
  readonly runtime: TableRuntime<Row>;
}
function Probe({
  shell,
  capture,
}: {
  readonly shell: DataTableShellResult<Row>;
  readonly capture: (value: Captured) => void;
}) {
  const runtime = useTableRuntime<Row>();
  capture({ shell, runtime });
  return null;
}
// Keep the component type stable: a remount would hide stale-session defects.
function Shell({
  props,
  capture,
}: {
  readonly props: DataTableShellProps<Row>;
  readonly capture: (value: Captured) => void;
}) {
  const shell = useDataTableShell(props, noForm);
  return (
    <DataTableShellView shell={shell}>
      {(next) => <Probe shell={next} capture={capture} />}
    </DataTableShellView>
  );
}
function Harness({
  props,
  capture,
}: {
  readonly props: DataTableShellProps<Row>;
  readonly capture: (value: Captured) => void;
}) {
  return (
    <FeatureProviders props={props}>
      <Shell props={props} capture={capture} />
    </FeatureProviders>
  );
}

export async function mountShell() {
  let current: Captured | undefined;
  let session: AgentSession | undefined;
  const published: AgentManifest[] = [];
  const props = applyTableFeatures({
    features: [
      columnMenu(),
      columnSelectionCheckbox(),
      tableAgent({
        tableId: "react-overlays",
        columns: { secret: { readable: false } },
        bridge: {
          attach: (next) => {
            session = next;
          },
          publish: (manifest) => published.push(manifest),
        },
      }),
    ],
    data: ROWS,
    columns: COLUMNS,
    rowKey: (row: Row) => row.id,
    urlSync: false,
    paginationMode: "paged" as const,
  });
  const capture = (value: Captured) => {
    current = value;
  };
  const mounted = render(<Harness props={props} capture={capture} />);
  await waitFor(() => expect(session).toBeDefined());
  const read = () => {
    if (!current || !session) throw new Error("The real shell has not mounted");
    return { ...current, session };
  };
  return {
    read,
    published,
    rerender: () =>
      mounted.rerender(<Harness props={props} capture={capture} />),
    change: async (run: (value: Captured) => void) => {
      await act(async () => {
        run(read());
        await Promise.resolve();
      });
    },
  };
}
