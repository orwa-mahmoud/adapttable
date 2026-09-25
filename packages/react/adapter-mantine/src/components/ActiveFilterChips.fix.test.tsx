import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table.test-utils";
import type { ColumnDef } from "../index";
import { renderMantine } from "../test-utils";
import { ActiveFilterChips } from "./ActiveFilterChips";

const CHIP_LABEL = "Status: Active";

describe("ActiveFilterChips remove button label", () => {
  it("defaults to the removeFilter label, not the clear-all text", () => {
    const onRemove = vi.fn();
    renderMantine(
      <ActiveFilterChips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove }]}
        onClearAll={vi.fn()}
        label="filters"
        clearAllLabel="Clear all"
      />
    );

    const remove = screen.getByRole("button", {
      name: `Remove filter: ${CHIP_LABEL}`,
    });
    expect(
      screen.queryByRole("button", { name: `Clear all: ${CHIP_LABEL}` })
    ).toBeNull();
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("uses a caller-supplied removeLabel", () => {
    renderMantine(
      <ActiveFilterChips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove: vi.fn() }]}
        label="filters"
        clearAllLabel="Clear all"
        removeLabel={(l) => `Quitar: ${l}`}
      />
    );

    expect(
      screen.getByRole("button", { name: `Quitar: ${CHIP_LABEL}` })
    ).toBeInTheDocument();
  });
});

interface Row {
  id: string;
  status: string;
}
const ROWS: Row[] = [
  { id: "a", status: "Active" },
  { id: "b", status: "Paused" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "status", header: "Status", accessor: (r) => r.status },
];

function Harness({
  adapter,
}: Readonly<{ adapter: ReturnType<typeof createMemoryAdapter> }>) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns: COLS,
    paginationMode: "paged",
  });
  return (
    <DataTable
      source={source}
      columns={COLS}
      rowKey={(r) => r.id}
      filterLabels={{ status: (v) => `Status: ${v}` }}
      labels={{ removeFilter: (l) => `Drop ${l}` }}
    />
  );
}

describe("<DataTable> (Mantine) filter chips", () => {
  it("names the chip's remove button with the table's removeFilter label", () => {
    const adapter = createMemoryAdapter("f_status=Active");
    renderMantine(<Harness adapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: `Drop ${CHIP_LABEL}` }));
    expect(adapter.getSearch()).not.toContain("f_status");
  });
});
