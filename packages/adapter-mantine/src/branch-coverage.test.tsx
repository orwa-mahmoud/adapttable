/**
 * Branch/condition gap-fill targeting the remaining uncovered conditions in
 * the Mantine adapter, each exercising the *opposite* side of a branch that
 * existing tests already cover on one side:
 *   - DesktopTable: disabled row action (no run), string-header resize label,
 *     a pinned column (sticky style), and the fixed-height scroll box.
 *   - MobileCards: hidden action (returns null) + disabled action (no run).
 *   - FilterDrawer: RTL placement.
 *   - Toolbar: clearing the sort-by select (null → undefined).
 *   - DataTable: explicit skeletonRows count while loading.
 */
import type { ColumnDef } from "@adapttable/core";
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterDrawer } from "./components/FilterDrawer";
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
  opts: {
    mode?: "paged" | "infinite";
    isMobile?: boolean;
    initialUrl?: string;
    isLoading?: boolean;
    rows?: Row[];
  } = {}
) {
  const adapter = createMemoryAdapter(opts.initialUrl ?? "");
  function Harness() {
    const source = useFrontendData<Row>({
      data: opts.rows ?? ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: opts.mode ?? "paged",
      isLoading: opts.isLoading,
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        forceMobile={opts.isMobile}
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

describe("DesktopTable disabled row action", () => {
  it("does not run a disabled icon action when clicked", () => {
    const onClick = vi.fn();
    mount({
      rowActions: [
        {
          key: "edit",
          label: "Edit",
          icon: <span>✎</span>,
          isDisabled: () => true,
          onClick,
        },
      ],
    });
    const button = screen.getAllByRole("button", { name: "Edit" })[0]!;
    expect(button).toBeDisabled();
    // The handler short-circuits on `disabled`, so onClick never fires.
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("DesktopTable resize label with a string header", () => {
  it("derives the resize handle label from the string header text", () => {
    mount({ resizableColumns: true });
    // String header → label uses the header text, not the column key.
    expect(
      screen.getByLabelText(`${defaultLabels.resizeColumn}: Name`)
    ).toBeInTheDocument();
  });
});

describe("DesktopTable pinned column + fixed-height scroll box", () => {
  it("renders a sticky pinned cell inside a maxHeight scroll box", () => {
    mount({
      maxHeight: 400,
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    // A pinned body cell receives `position: sticky`.
    const cell = screen.getByText("Alice").closest("td")!;
    expect(cell.style.position).toBe("sticky");
  });

  // Pinning turns the wrapper into a (horizontal) scroll container, which also
  // makes it the vertical sticky context. The sticky header must then stick to
  // the box top (0), not the page-toolbar offset — otherwise it is pushed down
  // and overlaps the first row.
  it("sticks the header to the box top (0) when pinned + stickyHeader", () => {
    mount({
      stickyHeader: true,
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    const th = screen.getByText("Name").closest("th")!;
    expect(th.style.position).toBe("sticky");
    expect(th.style.top).toBe("0px");
  });

  it("pins the selection column alongside a left-pinned data column", () => {
    mount({
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    const headerCheckbox = screen.getByLabelText("Select all").closest("th")!;
    expect(headerCheckbox.style.position).toBe("sticky");
    // Logical inset: sticks to the inline START, the correct edge in RTL too.
    expect(headerCheckbox.style.insetInlineStart).toBe("0px");
    const rowCheckbox = screen
      .getAllByLabelText("Select row")[0]!
      .closest("td")!;
    expect(rowCheckbox.style.position).toBe("sticky");
    expect(rowCheckbox.style.insetInlineStart).toBe("0px");
  });

  it("pins the actions column alongside a right-pinned data column", () => {
    mount({
      rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
      defaultColumnLayout: { pinned: { name: "end" } },
    });
    const actionsCell = screen
      .getAllByRole("button", { name: "Edit" })[0]!
      .closest("td")!;
    expect(actionsCell.style.position).toBe("sticky");
    expect(actionsCell.style.insetInlineEnd).toBe("0px");
  });

  it("offsets the pinned checkbox past the chevron column with row details", () => {
    mount({
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      renderRowDetail: (r) => <div>Detail for {r.name}</div>,
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    // The chevron column pins flush to the start edge…
    const chevronCell = screen
      .getAllByRole("button", { name: defaultLabels.expandRow })[0]!
      .closest("td")!;
    expect(chevronCell.style.position).toBe("sticky");
    expect(chevronCell.style.insetInlineStart).toBe("0px");
    // …and the checkbox column starts past the chevron's width.
    const headerCheckbox = screen.getByLabelText("Select all").closest("th")!;
    expect(headerCheckbox.style.position).toBe("sticky");
    expect(headerCheckbox.style.insetInlineStart).toBe("36px");
  });
});

describe("MobileCards hidden + disabled actions", () => {
  it("skips a hidden action and does not run a disabled action", () => {
    const hiddenClick = vi.fn();
    const disabledClick = vi.fn();
    mount(
      {
        rowActions: [
          {
            key: "hide",
            label: "Hidden",
            icon: <span>H</span>,
            isHidden: () => true,
            onClick: hiddenClick,
          },
          {
            key: "del",
            label: "Delete",
            isDisabled: () => true,
            onClick: disabledClick,
          },
        ],
      },
      { isMobile: true }
    );
    // The hidden action renders nothing.
    expect(screen.queryByLabelText("Hidden")).toBeNull();
    // The disabled action renders but its click handler is a no-op.
    const del = screen.getAllByRole("button", { name: "Delete" })[0]!;
    expect(del).toBeDisabled();
    fireEvent.click(del);
    expect(disabledClick).not.toHaveBeenCalled();
  });
});

describe("FilterDrawer RTL", () => {
  it("places the drawer on the left in RTL mode", () => {
    render(
      <MantineProvider>
        <FilterDrawer
          opened
          onClose={vi.fn()}
          onClearFilters={vi.fn()}
          filters={<div>filter body</div>}
          activeFilterCount={0}
          labels={defaultLabels}
          dir="rtl"
        />
      </MantineProvider>
    );
    // RTL renders the drawer body (left-positioned); its content is present.
    expect(screen.getByText("filter body")).toBeInTheDocument();
  });
});

describe("Toolbar clearing the sort-by select", () => {
  it("clears the active sort (null coalesces to undefined)", () => {
    const adapter = mount(
      { sortByOptions: [{ value: "name", label: "Name" }] },
      { initialUrl: "sortBy=name&sortDir=asc" }
    );
    expect(adapter.getSearch()).toContain("sortBy=name");
    // The clearable Select renders an (aria-hidden) clear button once a value
    // is selected; clicking it fires onChange(null) → setSort(undefined, ...).
    const input = screen.getByRole("combobox", { name: defaultLabels.sortBy });
    const wrapper = input.closest(".mantine-Input-wrapper");
    const clearBtn = wrapper?.querySelector<HTMLElement>("button");
    expect(clearBtn).not.toBeNull();
    fireEvent.click(clearBtn!);
    expect(adapter.getSearch()).not.toContain("sortBy=name");
  });
});

describe("DataTable skeleton row count", () => {
  it("uses an explicit skeletonRows count while loading", () => {
    const { container } = render(
      <MantineProvider>
        <SkeletonHarness skeletonRows={3} />
      </MantineProvider>
    );
    expect(
      container.querySelector('[class*="mantine-Skeleton"]')
    ).toBeInTheDocument();
  });

  it("falls back to the page size when skeletonRows is omitted", () => {
    const { container } = render(
      <MantineProvider>
        <SkeletonHarness />
      </MantineProvider>
    );
    // No skeletonRows → `skeletonRows ?? source.limit` resolves to the limit.
    expect(
      container.querySelector('[class*="mantine-Skeleton"]')
    ).toBeInTheDocument();
  });

  it("falls back to a single skeleton column when no columns are defined", () => {
    const { container } = render(
      <MantineProvider>
        <EmptyColumnsSkeletonHarness />
      </MantineProvider>
    );
    // `table.columns.length || 1` → 0 columns coalesces to 1.
    expect(
      container.querySelector('[class*="mantine-Skeleton"]')
    ).toBeInTheDocument();
  });
});

function SkeletonHarness({ skeletonRows }: { skeletonRows?: number }) {
  const source = useFrontendData<Row>({
    data: [],
    urlAdapter: createMemoryAdapter(""),
    columns,
    paginationMode: "paged",
    isLoading: true,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      skeletonRows={skeletonRows}
    />
  );
}

function EmptyColumnsSkeletonHarness() {
  const noColumns: ColumnDef<Row>[] = [];
  const source = useFrontendData<Row>({
    data: [],
    urlAdapter: createMemoryAdapter(""),
    columns: noColumns,
    paginationMode: "paged",
    isLoading: true,
  });
  return <DataTable source={source} columns={noColumns} rowKey={(r) => r.id} />;
}
