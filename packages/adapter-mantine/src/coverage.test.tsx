/**
 * Final coverage gap-fill for the Mantine adapter. Each test targets a
 * specific uncovered branch/line: the desktop prefetch + body selection
 * toggle, the mobile body selection toggle, the resize handle label for a
 * non-string header, the column menu's hidden-column branch, the filter
 * drawer clear-all button, the toolbar/pagination onChange handlers, the
 * search placeholder branch, and the mount-stagger null-ref guard.
 */
import type { ColumnDef, UseColumnLayoutResult } from "@adapttable/core";
import {
  createMemoryAdapter,
  useFrontendData,
  usePrefersReducedMotion,
} from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useMountStagger } from "./animation/useMountStagger";
import { ColumnMenu } from "./components/ColumnMenu";
import { FilterDrawer } from "./components/FilterDrawer";
import { PaginationFooter } from "./components/PaginationFooter";
import { DataTable } from "./DataTable";
import { defaultLabels } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  opts: { mode?: "paged" | "infinite"; isMobile?: boolean } = {}
) {
  const adapter = createMemoryAdapter("");
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      adapter,
      columns,
      paginationMode: opts.mode ?? "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        isMobile={opts.isMobile}
        {...override}
      />
    );
  }
  render(
    <MantineProvider>
      <Harness />
    </MantineProvider>
  );
  return adapter;
}

describe("DataTable desktop prefetch + body selection", () => {
  it("fires prefetch on row hover and toggles a single row's selection", () => {
    const prefetch = vi.fn();
    mount({
      prefetch,
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
    });
    // Hovering a row triggers prefetch for that row.
    const aliceRow = screen.getByText("Alice").closest("tr")!;
    fireEvent.mouseEnter(aliceRow);
    expect(prefetch).toHaveBeenCalledWith(ROWS[0]);

    // The per-row checkbox starts unchecked; clicking it selects that row.
    const rowCheckbox = screen.getAllByLabelText("Select row")[0]!;
    expect(rowCheckbox).not.toBeChecked();
    fireEvent.click(rowCheckbox);
    expect(rowCheckbox).toBeChecked();
  });
});

describe("DataTable mobile body selection", () => {
  it("toggles a single card's selection checkbox", () => {
    mount(
      { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
      { isMobile: true }
    );
    const rowCheckbox = screen.getAllByLabelText("Select row")[0]!;
    expect(rowCheckbox).not.toBeChecked();
    fireEvent.click(rowCheckbox);
    expect(rowCheckbox).toBeChecked();
  });
});

describe("DataTable resizable columns with a non-string header", () => {
  it("derives the resize handle label from the column key", () => {
    const nodeCols: ColumnDef<Row>[] = [
      { key: "name", header: <em>Name</em>, accessor: (r) => r.name },
    ];
    mount({ resizableColumns: true, columns: nodeCols });
    // No string header → resize label falls back to the column key.
    expect(
      screen.getByLabelText(`${defaultLabels.resizeColumn}: name`)
    ).toBeInTheDocument();
  });
});

interface MenuRow {
  id: string;
}
const menuCols: ColumnDef<MenuRow>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id },
  { key: "b", header: "Bravo", accessor: (r) => r.id },
];

function hiddenLayout(): UseColumnLayoutResult<MenuRow> {
  return {
    state: { hidden: ["b"], order: [], pinned: {}, widths: {} },
    visibleColumns: [menuCols[0]!],
    isHidden: (key) => key === "b",
    setHidden: vi.fn(),
    toggleVisible: vi.fn(),
    setPinned: vi.fn(),
    move: vi.fn(),
    setWidth: vi.fn(),
    pinOffset: () => undefined,
    reset: vi.fn(),
  };
}

const menuLabels = {
  columns: "Columns",
  actions: "Actions",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  resetColumns: "Reset columns",
  showColumn: "Show column",
  hideColumn: "Hide column",
};

describe("ColumnMenu hidden column", () => {
  it("renders the hidden-column styling and toggles it back on", async () => {
    const user = userEvent.setup();
    const layout = hiddenLayout();
    render(
      <MantineProvider>
        <ColumnMenu allColumns={menuCols} layout={layout} labels={menuLabels} />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    // The eye control for the hidden column reports aria-pressed=false.
    const eye = document.querySelector<HTMLElement>(
      '[aria-label="Show column: Bravo"]'
    )!;
    expect(eye).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(eye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("b");
  });
});

describe("FilterDrawer clear-all", () => {
  it("invokes onClearFilters when active filters exist", () => {
    const onClearFilters = vi.fn();
    render(
      <MantineProvider>
        <FilterDrawer
          opened
          onClose={vi.fn()}
          filters={<div>filter body</div>}
          activeFilterCount={2}
          onClearFilters={onClearFilters}
          labels={defaultLabels}
        />
      </MantineProvider>
    );
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.clearAll })
    );
    expect(onClearFilters).toHaveBeenCalled();
  });
});

describe("PaginationFooter onChange handlers", () => {
  it("commits a new page size and renders middle (non-prev/next) controls", () => {
    const onLimitChange = vi.fn();
    render(
      <MantineProvider>
        <PaginationFooter
          page={3}
          totalPages={9}
          limit={25}
          total={225}
          fromIndex={51}
          toIndex={75}
          onPageChange={vi.fn()}
          onLimitChange={onLimitChange}
          labels={defaultLabels}
        />
      </MantineProvider>
    );
    // A high total-pages count forces the pager to render "dots" controls,
    // which exercise the getControlProps default-return branch.
    expect(document.querySelector(".mantine-Pagination-dots")).not.toBeNull();

    // The combobox input carries the aria-label; open it and pick a new size.
    const sizeSelect = screen.getByRole("combobox", {
      name: defaultLabels.rowsPerPage,
    });
    fireEvent.click(sizeSelect);
    const option = screen
      .getAllByText("50")
      .find((el) => el.closest('[role="option"]'))!;
    fireEvent.click(option);
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });
});

describe("Toolbar onChange + placeholder branches", () => {
  it("uses a custom search placeholder", () => {
    mount({ searchPlaceholder: "Find people…" });
    expect(screen.getByPlaceholderText("Find people…")).toBeInTheDocument();
  });

  it("commits a sort selection from the sort-by select", () => {
    const adapter = mount({
      sortByOptions: [{ value: "name", label: "Name" }],
    });
    const select = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.click(select);
    const option = screen
      .getAllByText("Name")
      .find((el) => el.closest('[role="option"]'))!;
    fireEvent.click(option);
    expect(adapter.getSearch()).toContain("sortBy=name");
  });

  it("commits a new limit from the toolbar rows-per-page select", () => {
    const adapter = mount({}, { mode: "infinite" });
    const select = screen.getAllByLabelText("Rows per page")[0]!;
    fireEvent.click(select);
    const option = screen
      .getAllByText("50")
      .find((el) => el.closest('[role="option"]'))!;
    fireEvent.click(option);
    expect(adapter.getSearch()).toContain("limit=50");
  });
});

describe("useMountStagger null-ref guard", () => {
  it("no-ops when the ref has no current element", () => {
    const ref = createRef<HTMLElement>();
    // ref.current stays null; enabled + non-reduced motion reaches the guard.
    expect(() =>
      renderHook(() => useMountStagger(ref, [1], { enabled: true }))
    ).not.toThrow();
  });

  it("usePrefersReducedMotion is importable for the harness", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(typeof result.current).toBe("boolean");
  });
});
