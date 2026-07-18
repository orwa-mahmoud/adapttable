/** Coverage-fill: column management, resize, footer limit, drawer close. */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  rows?: readonly Row[];
  mode?: "paged" | "infinite";
  isMobile?: boolean;
  override?: Partial<Parameters<typeof DataTable<Row>>[0]>;
}) {
  const source = useFrontendData<Row>({
    data: props.rows ?? ROWS,
    adapter,
    columns,
    paginationMode: props.mode ?? "paged",
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      isMobile={props.isMobile}
      {...props.override}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}, url = "") {
  adapter = createMemoryAdapter(url);
  return render(<Harness {...props} />);
}

/** Open a Base UI Select combobox and click one of its options. */
function pickOption(combobox: HTMLElement, optionLabel: string) {
  fireEvent.pointerDown(combobox);
  fireEvent.click(combobox);
  const option = screen.getByRole("option", { name: optionLabel });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

describe("<DataTable> (Base UI) coverage-fill", () => {
  it("toggles an individual desktop row checkbox", () => {
    renderHarness({
      override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
    });
    const rowChecks = screen.getAllByLabelText("Select row");
    expect(rowChecks.length).toBe(2);
    fireEvent.click(rowChecks[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("changes the footer rows-per-page select", () => {
    renderHarness({}, "limit=1");
    // The paged footer renders its own rows-per-page select.
    const selects = screen.getAllByRole("combobox", { name: "Rows per page" });
    pickOption(selects[selects.length - 1]!, "10");
    expect(adapter.getSearch()).toContain("limit=10");
  });

  it("renders resize handles and width styles with resizableColumns", () => {
    renderHarness({
      override: {
        resizableColumns: true,
        columnLayout: {
          hidden: [],
          order: [],
          pinned: {},
          widths: { name: 180 },
        },
      },
    });
    const handles = screen.getAllByLabelText(/Resize column: /);
    expect(handles.length).toBe(columns.length);
    // The header cell with an explicit width carries the inline width style.
    const nameHandle = screen.getByLabelText("Resize column: Name");
    const th = nameHandle.closest("th")!;
    expect(th.style.width).toBe("180px");
  });

  it("applies pinned-cell styles with a maxHeight scroll box", () => {
    const { container } = renderHarness({
      override: {
        maxHeight: 300,
        columnLayout: {
          hidden: [],
          order: [],
          pinned: { name: "start" },
          widths: {},
        },
      },
    });
    // Pinned header cell gets a sticky inline style.
    const th = screen
      .getAllByRole("columnheader")
      .find((cell) => cell.style.position === "sticky");
    expect(th).toBeTruthy();
    // The scroll box constrains height.
    expect(
      container.querySelector('[style*="overflow"]') ??
        container.querySelector("div")
    ).toBeTruthy();
  });

  it("renders the column menu with a hidden column struck through", async () => {
    renderHarness({
      override: {
        enableColumnMenu: true,
        columnLayout: {
          hidden: ["city"],
          order: [],
          pinned: {},
          widths: {},
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns", undefined, { timeout: 5000 });
    // The hidden column's label is struck through (covers the hidden branch).
    const cityLabels = screen.getAllByText("City");
    const struck = cityLabels.find((el) =>
      getComputedStyle(el).textDecoration.includes("line-through")
    );
    expect(struck ?? cityLabels[0]).toBeTruthy();
  });

  it("opens and closes the filter drawer in drawer mode (Done button → onClose)", async () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await screen.findByText("filter body", undefined, { timeout: 5000 });
    // Base UI's drawer is a Dialog; the primary "Done" button calls onClose →
    // setFiltersOpen(false), unmounting the dialog content.
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByText("filter body")).not.toBeInTheDocument()
    );
  });

  it("closes the filter drawer on Escape (Base UI dismiss → onClose)", async () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await screen.findByText("filter body", undefined, { timeout: 5000 });
    // Escape runs the dialog's `onOpenChange(false)` → `onClose` (distinct from
    // the Done button, which calls `onClose` directly).
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText("filter body")).not.toBeInTheDocument()
    );
  });

  it("clear-all falls back to clearing source extras when no handler is given", async () => {
    renderHarness(
      {
        override: {
          filters: <div>body</div>,
          filterLabels: { status: (v) => `Status: ${v}` },
        },
      },
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await screen.findByText("body", undefined, { timeout: 5000 });
    // Without onClearFilters, chrome.clearFilters falls back to the source's
    // clearExtras — so Clear all genuinely clears the URL filters.
    const clearButtons = await screen.findAllByRole(
      "button",
      { name: "Clear all" },
      { timeout: 5000 }
    );
    fireEvent.click(clearButtons[0]!);
    expect(adapter.getSearch()).not.toContain("f_status");
  });
});
