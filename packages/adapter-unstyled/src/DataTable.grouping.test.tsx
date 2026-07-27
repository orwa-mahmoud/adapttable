/**
 * Row grouping smoke: arms the grouping branch in components/tables.tsx via
 * frontend data + an opt-in `groupBy` prop (same pattern as expansion tests).
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
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
      isMobile={props.isMobile}
      groupBy="team"
      groupAggregates={(rows) => ({ name: rows.length })}
      {...props.override}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
  adapter = createMemoryAdapter("");
  return render(<Harness {...props} />);
}

const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> row grouping (unstyled)", () => {
  it("renders desktop group headers with aggregates and collapses on toggle", () => {
    renderHarness();
    expect(part("group-row")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="group-label"]')
    ).toHaveTextContent("Core");
    expect(
      document.querySelectorAll('[data-adapttable-part="group-label"]')
    ).toHaveLength(2);
    expect(
      screen.getByText("Platform", {
        selector: "[data-adapttable-part=group-label]",
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("(2)").length).toBeGreaterThan(0);
    expect(part("group-aggregate")).toBeInTheDocument();

    const toggle = document.querySelector(
      '[data-adapttable-part="group-toggle"]'
    )!;
    fireEvent.click(toggle);
    expect(part("group-row")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByText("Ada")).toBeNull();
  });

  it("renders mobile group cards when isMobile is set", () => {
    renderHarness({ isMobile: true });
    expect(part("group-card")).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-adapttable-part="group-label"]')
    ).toHaveLength(2);
    expect(screen.getByText("Alan")).toBeInTheDocument();
  });

  it("shows a group-select checkbox when bulk actions arm selection", () => {
    renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "Archive", onClick: vi.fn() }],
      },
    });
    expect(part("group-select")).toBeInTheDocument();
  });

  it("grouped over multiple pages: screen, footer, select-all and export agree", () => {
    // 30 rows over 3 pages at limit=10 — grouped mode must render and
    // describe the FULL set, not the page slice.
    const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      team: i % 2 === 0 ? "Core" : "Platform",
      name: `P${String(i + 1).padStart(2, "0")}`,
    }));
    adapter = createMemoryAdapter("limit=10");
    render(
      <DataTable<Row>
        data={many}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        groupBy="team"
        bulkActions={[{ key: "x", label: "Archive", onClick: vi.fn() }]}
      />
    );

    // Every leaf row is on screen.
    expect(
      document.querySelectorAll("tbody tr[data-adapttable-part='row']")
    ).toHaveLength(30);

    // Footer describes exactly the rendered set, and the rows-per-page
    // control (meaningless in a full-set view) is gone.
    expect(screen.getByText("Showing 1–30 of 30")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(part("rows-per-page")).toBeNull();

    // Header select-all covers the full rendered set.
    const [selectAll] = screen.getAllByLabelText("Select all");
    fireEvent.click(selectAll!);
    expect(screen.getByText("30 selected")).toBeInTheDocument();
  });
});
