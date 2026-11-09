/**
 * Row grouping smoke: arms grouping via `groupBy` and exercises
 * antd's grouped dataSource / group header cells.
 */
import { createMemoryAdapter } from "@adapttable/react";
import {
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/react/adapter";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";

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

function renderHarness(
  props: {
    isMobile?: boolean;
    override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
  } = {}
) {
  return render(
    <DataTable
      data={ROWS}
      columns={columns}
      rowKey={(r) => r.id}
      urlSync={false}
      forceMobile={props.isMobile}
      groupBy="team"
      groupAggregates={(rows) => ({ name: rows.length })}
      {...props.override}
    />
  );
}

const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

function columnOffset(row: Element, key: string): number {
  let offset = 0;
  for (const cell of row.querySelectorAll<HTMLTableCellElement>(
    ":scope > td"
  )) {
    if (cell.dataset.columnKey === key) return offset;
    offset += cell.colSpan;
  }
  throw new Error(`Missing ${key} cell`);
}

describe("<DataTable> row grouping (antd)", () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "keeps grouped columns aligned with reordering (aggregates=%s, selection=%s)",
    (aggregates, selection) => {
      renderHarness({
        override: {
          features: [rowReorder(vi.fn())],
          groupFooters: true,
          groupAggregates: aggregates
            ? (rows) => ({ name: rows.length })
            : undefined,
          bulkActions: selection
            ? [{ key: "x", label: "Archive", onClick: vi.fn() }]
            : undefined,
        },
      });
      const dataRow = part("row")!;
      for (const group of document.querySelectorAll(
        '[data-adapttable-part="group-row"], [data-adapttable-part="group-footer-row"]'
      )) {
        expect(columnOffset(group, "team")).toBe(columnOffset(dataRow, "team"));
        if (aggregates)
          expect(columnOffset(group, "name")).toBe(
            columnOffset(dataRow, "name")
          );
        else
          expect(
            group.querySelector('td[data-column-key="team"]')
          ).toHaveAttribute("colspan", "2");
        expect(
          group.querySelector('[data-adapttable-part="row-reorder-handle"]')
        ).toBeNull();
      }
    }
  );

  it("renders desktop group headers and collapses on toggle", () => {
    renderHarness();
    expect(part("group-row")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /group$/i }).length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Ada")).toBeInTheDocument();

    const toggle = document.querySelectorAll(
      '[data-adapttable-part="group-toggle"]'
    )[0]!;
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
    expect(screen.getAllByLabelText(/^Select all: /).length).toBeGreaterThan(0);
  });

  /** Thirty people over three pages of ten. */
  const MANY: Row[] = Array.from({ length: 30 }, (_, i) => ({
    id: String(i + 1),
    team: i % 2 === 0 ? "Core" : "Platform",
    name: `P${String(i + 1).padStart(2, "0")}`,
  }));

  it("describes the full grouped set in a paged table's footer", () => {
    render(
      <DataTable<Row>
        data={MANY}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("limit=10")}
        groupBy="team"
      />
    );
    expect(
      document.querySelectorAll("tbody tr[data-adapttable-part='row']")
    ).toHaveLength(30);
    expect(screen.getByText("Showing 1–30 of 30")).toBeInTheDocument();
    expect(
      document.querySelectorAll(
        ".ant-pagination-item:not(.ant-pagination-prev, .ant-pagination-next)"
      )
    ).toHaveLength(1);
  });

  it("windows a paged grouped table's lines when virtualize is composed", () => {
    // jsdom has no layout: a feature that fills KEYED_WINDOW with a fixed
    // slice stands in for the virtualizer.
    const windowed: TableFeature<Row> = {
      id: "virtualize",
      apply: () => ({ virtualize: true }),
      renders: [
        slotRender(
          KEYED_WINDOW,
          ({ children, enabled, keys }: KeyedWindowSlotProps) =>
            children({
              enabled,
              indices: enabled ? [0, 1, 2, 3] : keys.map((_, index) => index),
              paddingTop: 0,
              paddingBottom: enabled ? 1200 : 0,
              measureElement: vi.fn(),
            })
        ),
      ],
    };
    render(
      <DataTable<Row>
        data={MANY}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("limit=10")}
        groupBy="team"
        features={[windowed]}
      />
    );
    const drawn = document.querySelectorAll(
      "tbody tr[data-adapttable-part='row'], tbody tr[data-adapttable-part='group-row']"
    );
    expect(drawn).toHaveLength(4);
  });
});
