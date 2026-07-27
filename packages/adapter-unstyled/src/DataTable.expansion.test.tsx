/**
 * Row expansion (desktop chevron column + detail rows, mobile card details)
 * and the memoized desktop row: unchanged rows must not re-render — their
 * accessors are the observable proxy — on search keystrokes or another
 * row's selection change.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
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
      {...props.override}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
  adapter = createMemoryAdapter("");
  return render(<Harness {...props} />);
}

const detail = (row: Row) => <div>detail-{row.name}</div>;
const expandButtons = () => screen.getAllByRole("button", { name: /row$/ });
const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> row expansion (unstyled)", () => {
  it("renders the expand column collapsed by default, with class hooks", () => {
    const { container } = renderHarness({
      override: {
        renderRowDetail: detail,
        classNames: {
          expandHeader: "my-eh",
          expandCell: "my-ec",
          expandButton: "my-eb",
        },
      },
    });
    const header = part("expand-header");
    expect(header).toHaveClass("my-eh");
    // One leading chevron cell per row, every panel collapsed.
    const cells = container.querySelectorAll(
      '[data-adapttable-part="expand-cell"].my-ec'
    );
    expect(cells).toHaveLength(2);
    const buttons = screen.getAllByRole("button", { name: "Expand row" });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveClass("my-eb");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).not.toHaveAttribute("data-expanded");
      expect(button.querySelector("svg")).toBeInTheDocument();
    }
    expect(part("detail-row")).toBeNull();
    expect(screen.queryByText("detail-Alice")).toBeNull();
  });

  it("renders no expand column without renderRowDetail", () => {
    renderHarness();
    expect(part("expand-header")).toBeNull();
    expect(part("expand-cell")).toBeNull();
  });

  it("toggles a detail row with aria + data hooks and a full-width colSpan", () => {
    renderHarness({
      override: {
        renderRowDetail: detail,
        classNames: { detailRow: "my-dr", detailCell: "my-dc" },
      },
    });
    const [alice] = expandButtons();
    fireEvent.click(alice!);

    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(screen.queryByText("detail-Bob")).toBeNull();
    expect(alice).toHaveAttribute("aria-expanded", "true");
    expect(alice).toHaveAttribute("aria-label", "Collapse row");
    expect(alice).toHaveAttribute("data-expanded");
    const row = part("detail-row");
    expect(row).toHaveClass("my-dr");
    const cell = part("detail-cell");
    expect(cell).toHaveClass("my-dc");
    // Two data columns + the expand column.
    expect(cell).toHaveAttribute("colspan", "3");

    fireEvent.click(alice!);
    expect(part("detail-row")).toBeNull();
    expect(alice).toHaveAttribute("aria-expanded", "false");
    expect(alice).toHaveAttribute("aria-label", "Expand row");
    expect(alice).not.toHaveAttribute("data-expanded");
  });

  it("keeps multiple detail rows open independently", () => {
    renderHarness({ override: { renderRowDetail: detail } });
    const [alice, bob] = expandButtons();
    fireEvent.click(alice!);
    fireEvent.click(bob!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(screen.getByText("detail-Bob")).toBeInTheDocument();
    fireEvent.click(alice!);
    expect(screen.queryByText("detail-Alice")).toBeNull();
    expect(screen.getByText("detail-Bob")).toBeInTheDocument();
  });

  it("spans the detail cell across the selection and actions columns", () => {
    renderHarness({
      override: {
        renderRowDetail: detail,
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
      },
    });
    fireEvent.click(expandButtons()[0]!);
    // Expand + selection + two data columns + actions.
    expect(part("detail-cell")).toHaveAttribute("colspan", "5");
  });

  it("does not activate onRowClick from the expand button", () => {
    const onRowClick = vi.fn();
    renderHarness({ override: { renderRowDetail: detail, onRowClick } });
    fireEvent.click(expandButtons()[0]!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(onRowClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("mobile: the expand button reveals the card detail inside the card", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: {
        renderRowDetail: detail,
        classNames: { cardDetail: "my-cd" },
      },
    });
    expect(part("card-detail")).toBeNull();
    const [alice] = expandButtons();
    expect(alice).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(alice!);

    expect(alice).toHaveAttribute("aria-expanded", "true");
    const cardDetail = container.querySelector(
      '[data-adapttable-part="card"] [data-adapttable-part="card-detail"]'
    );
    expect(cardDetail).toHaveClass("my-cd");
    expect(cardDetail).toHaveTextContent("detail-Alice");
    expect(screen.queryByText("detail-Bob")).toBeNull();

    fireEvent.click(alice!);
    expect(part("card-detail")).toBeNull();
  });
});

describe("<DataTable> memoized desktop rows (unstyled)", () => {
  it("a search keystroke does not re-invoke accessors for unchanged rows", () => {
    const accessor = vi.fn((r: Row) => r.name);
    const spyColumns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor },
    ];
    renderHarness({ override: { columns: spyColumns } });
    expect(accessor).toHaveBeenCalled();
    accessor.mockClear();

    // The keystroke re-renders the table shell (controlled input) but the
    // rows are untouched until the debounce commits — every row bails out.
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ali" },
    });
    expect(accessor).not.toHaveBeenCalled();
  });

  it("a checkbox toggle re-renders only that row", () => {
    const accessor = vi.fn((r: Row) => r.name);
    const spyColumns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor },
    ];
    renderHarness({
      override: {
        columns: spyColumns,
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      },
    });
    accessor.mockClear();

    const first = screen.getAllByLabelText("Select row")[0]!;
    fireEvent.click(first);
    expect(first).toBeChecked();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    // Only Alice's row re-rendered; Bob's accessor never re-ran.
    expect(accessor).toHaveBeenCalledTimes(1);
    expect(accessor).toHaveBeenCalledWith(ROWS[0]);

    // The bailed-out row still toggles through the latest-ref callback —
    // its selection joins (not replaces) the first row's.
    accessor.mockClear();
    fireEvent.click(screen.getAllByLabelText("Select row")[1]!);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(accessor).toHaveBeenCalledTimes(1);
    expect(accessor).toHaveBeenCalledWith(ROWS[1]);
  });

  it("expanding a row re-renders only that row", () => {
    const accessor = vi.fn((r: Row) => r.name);
    const spyColumns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor },
    ];
    renderHarness({
      override: { columns: spyColumns, renderRowDetail: detail },
    });
    accessor.mockClear();

    fireEvent.click(expandButtons()[0]!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(accessor).toHaveBeenCalledTimes(1);
    expect(accessor).toHaveBeenCalledWith(ROWS[0]);
  });
});
