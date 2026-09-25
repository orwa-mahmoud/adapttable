/**
 * What a subtotal reads like, on both surfaces this kit draws.
 *
 * The value the table holds is what the aggregate returned; the column says
 * how it reads. A desktop group row and a mobile group card are two drawings
 * of the same cell, so both go through the column.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
  budget: number;
}
const ROWS: Row[] = [
  { id: "1", team: "Core", budget: 10_000 },
  { id: "2", team: "Core", budget: 30_000 },
  { id: "3", team: "Web", budget: 50_000 },
];
const money = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const total = (rows: readonly Row[]) => ({
  budget: rows.reduce((sum, row) => sum + row.budget, 0),
});

function columns(
  formatAggregate?: ColumnDef<Row>["formatAggregate"]
): ColumnDef<Row>[] {
  return [
    { key: "team", header: "Team", accessor: (r) => r.team },
    {
      key: "budget",
      header: "Budget",
      accessor: (r) => r.budget,
      formatAggregate,
    },
  ];
}

function table(
  formatAggregate?: ColumnDef<Row>["formatAggregate"],
  extra?: Record<string, unknown>
) {
  return render(
    <MantineProvider>
      <DataTable
        data={ROWS}
        columns={columns(formatAggregate)}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
        groupAggregates={total}
        {...extra}
      />
    </MantineProvider>
  );
}

const asMoney: ColumnDef<Row>["formatAggregate"] = (value) =>
  typeof value === "number" ? money.format(value) : "—";

describe("formatAggregate (mantine)", () => {
  it("shows the raw aggregate when the column declares no formatter", () => {
    table();
    expect(screen.getByText("40000")).toBeInTheDocument();
  });

  it("reads a group header's subtotal through the column", () => {
    table(asMoney);
    expect(screen.getByText("$40,000")).toBeInTheDocument();
    expect(screen.queryByText("40000")).toBeNull();
  });

  it("reads the same subtotal on a mobile card", () => {
    table(asMoney, { forceMobile: true });
    expect(screen.getByText("$40,000")).toBeInTheDocument();
  });

  it("asks the column once per cell", () => {
    const seen: unknown[] = [];
    table((value) => {
      seen.push(value);
      return typeof value === "number" ? `seen:${value}` : "seen:other";
    });
    expect(screen.getByText("seen:40000")).toBeInTheDocument();
    // Two groups, one aggregate each.
    expect(seen).toEqual([40_000, 50_000]);
  });

  it("draws the new answer when only the formatter changes", () => {
    // The data has not moved; the column has. What the reader sees follows the
    // callback the table holds now, and the aggregate is not recomputed to do
    // it — the mapper is asked once per group per data change, not per format.
    const aggregates = vi.fn(total);
    const view = table(asMoney, { groupAggregates: aggregates });
    expect(screen.getByText("$40,000")).toBeInTheDocument();
    const calls = aggregates.mock.calls.length;

    view.rerender(
      <MantineProvider>
        <DataTable
          data={ROWS}
          columns={columns((value) =>
            typeof value === "number" ? `now:${value}` : "now:other"
          )}
          rowKey={(r) => r.id}
          urlSync={false}
          groupBy="team"
          groupAggregates={aggregates}
        />
      </MantineProvider>
    );
    expect(screen.getByText("now:40000")).toBeInTheDocument();
    expect(screen.queryByText("$40,000")).toBeNull();
    expect(aggregates.mock.calls).toHaveLength(calls);
  });
});
