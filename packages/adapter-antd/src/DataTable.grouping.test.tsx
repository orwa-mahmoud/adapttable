/**
 * Row grouping smoke: arms grouping via frontend data + `groupBy` and exercises
 * antd's grouped dataSource / group header cells.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", team: "Core", name: "Ada" },
  { id: "2", team: "Platform", name: "Alan" },
  { id: "3", team: "Core", name: "Grace" },
];

const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team, sortable: true },
  { key: "name", header: "Name", accessor: (r) => r.name },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  isMobile?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      forceMobile={props.isMobile}
      groupBy="team"
      groupAggregates={(rows) => ({ name: rows.length })}
      {...props.override}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
  adapter = createMemoryAdapter("");
  return render(
    <ConfigProvider>
      <Harness {...props} />
    </ConfigProvider>
  );
}

const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> row grouping (antd)", () => {
  it("renders desktop group headers and collapses on toggle", () => {
    renderHarness();
    expect(part("group-row")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /group$/i }).length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Ada")).toBeInTheDocument();

    const toggle = screen.getAllByRole("button", { name: /group$/i })[0]!;
    fireEvent.click(toggle);
    expect(screen.queryByText("Ada")).toBeNull();
  });

  it("renders mobile group cards when isMobile is set", () => {
    renderHarness({ isMobile: true });
    expect(part("group-card")).toBeInTheDocument();
    expect(screen.getByText("Alan")).toBeInTheDocument();
  });

  it("shows group selection when bulk actions arm selection", () => {
    renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "Archive", onClick: vi.fn() }],
      },
    });
    expect(screen.getAllByLabelText("Select row").length).toBeGreaterThan(0);
  });
});
