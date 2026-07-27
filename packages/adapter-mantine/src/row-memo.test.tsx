import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
  { id: "c", name: "Cara", city: "Doha" },
];

// One spy accessor on every column: a row render costs exactly
// `columns.length` calls, so call-count deltas measure row re-renders.
const accessor = vi.fn((row: Row) => row.name);

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor },
  { key: "city", header: "City", accessor },
];

// Hoisted (identity-stable) callback props — the memo comparator checks
// them, so an inline equivalent would simply opt the rows out of memo.
const rowKey = (row: Row) => row.id;
const bulkActions = [
  { key: "export", label: "Export", onClick: () => undefined },
];
const renderRowDetail = (row: Row) => <div>Detail for {row.name}</div>;

interface HarnessProps {
  withDetail?: boolean;
  isMobile?: boolean;
  summaryRow?: (rows: readonly Row[]) => Partial<Record<string, string>>;
}

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness({ withDetail, isMobile, summaryRow }: HarnessProps) {
  const source = useFrontendData<Row>({ data: ROWS, adapter, columns });
  return (
    <DataTable<Row>
      source={source}
      columns={columns}
      rowKey={rowKey}
      bulkActions={bulkActions}
      renderRowDetail={withDetail ? renderRowDetail : undefined}
      isMobile={isMobile}
      summaryRow={summaryRow}
    />
  );
}

function renderHarness(props: HarnessProps = {}) {
  adapter = createMemoryAdapter("");
  return render(
    <MantineProvider>
      <Harness {...props} />
    </MantineProvider>
  );
}

describe("desktop row memoization (Mantine)", () => {
  it("a search keystroke re-renders the chrome but no row", () => {
    renderHarness();
    const search = screen.getByRole("searchbox");
    const before = accessor.mock.calls.length;

    fireEvent.change(search, { target: { value: "a" } });

    // The tree re-rendered (the live input value is React state)…
    expect(search).toHaveValue("a");
    // …but every row held: no accessor ran again.
    expect(accessor.mock.calls).toHaveLength(before);
  });

  it("toggling one row's checkbox re-renders only that row", () => {
    renderHarness();
    const boxes = screen.getAllByLabelText("Select row");
    const before = accessor.mock.calls.length;

    fireEvent.click(boxes[0]!);

    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
    // Exactly one row re-rendered: one accessor call per column.
    expect(accessor.mock.calls.length - before).toBe(columns.length);
  });

  it("expanding one row re-renders only that row", () => {
    renderHarness({ withDetail: true });
    const toggles = screen.getAllByRole("button", { name: "Expand row" });
    const before = accessor.mock.calls.length;

    fireEvent.click(toggles[0]!);

    expect(screen.getByText("Detail for Alice")).toBeInTheDocument();
    expect(accessor.mock.calls.length - before).toBe(columns.length);
  });
});

describe("mobile card memoization (Mantine)", () => {
  it("a search keystroke re-renders the chrome but no card", () => {
    renderHarness({ isMobile: true });
    const search = screen.getByRole("searchbox");
    const before = accessor.mock.calls.length;

    fireEvent.change(search, { target: { value: "a" } });

    expect(search).toHaveValue("a");
    expect(accessor.mock.calls).toHaveLength(before);
  });

  it("toggling one card's checkbox re-renders only that card", () => {
    renderHarness({ isMobile: true });
    const boxes = screen.getAllByLabelText("Select row");
    const before = accessor.mock.calls.length;

    fireEvent.click(boxes[0]!);

    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
    // At most the toggled card re-rendered (the compiler may even skip its
    // accessor work) — an unmemoized list would re-run every card here.
    expect(accessor.mock.calls.length - before).toBeLessThanOrEqual(
      columns.length
    );
  });
});

describe("summary aggregation (Mantine)", () => {
  it("runs only when its input rows change", () => {
    const summaryRow = vi.fn(() => ({ name: "3 people" }));
    renderHarness({ summaryRow });
    expect(screen.getByText("3 people")).toBeInTheDocument();
    const before = summaryRow.mock.calls.length;

    // Keystrokes re-render the table; the aggregate must not re-run until
    // the debounced term commits and actually changes the rows.
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "ali" } });
    expect(summaryRow.mock.calls).toHaveLength(before);
  });
});
