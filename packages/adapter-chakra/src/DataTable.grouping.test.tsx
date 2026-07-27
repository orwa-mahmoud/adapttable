/**
 * Row grouping smoke: arms the grouping branch in components/tables.tsx via
 * frontend data + an opt-in `groupBy` prop.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
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
    <ChakraProvider value={defaultSystem}>
      <Harness {...props} />
    </ChakraProvider>
  );
}

const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> row grouping (chakra)", () => {
  it("renders desktop group headers with aggregates and collapses on toggle", () => {
    renderHarness();
    expect(part("group-row")).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-adapttable-part="group-label"]')
    ).toHaveLength(2);
    expect(part("group-aggregate")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();

    fireEvent.click(
      document.querySelector('[data-adapttable-part="group-toggle"]')!
    );
    expect(part("group-row")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByText("Ada")).toBeNull();
  });

  it("renders mobile group cards when isMobile is set", () => {
    renderHarness({ isMobile: true });
    expect(part("group-card")).toBeInTheDocument();
    expect(screen.getByText("Alan")).toBeInTheDocument();
  });
});
