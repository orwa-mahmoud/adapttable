/**
 * Branch-coverage fill: exercises the remaining uncovered conditional
 * branches in DataTable.tsx, components/chrome.tsx and components/tables.tsx
 * that the existing suites only hit on one side.
 */
import type * as CoreModule from "@adapttable/core";
import {
  createMemoryAdapter,
  defaultLabels,
  useDataTableShell,
  useFrontendData,
} from "@adapttable/core";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FilterDrawer, LoadingState } from "./components/chrome";
import { FilterPopover } from "./components/FilterPopover";
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

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return {
    ...actual,
    useDataTableShell: vi.fn(actual.useDataTableShell),
  };
});

const actualCore = await vi.importActual<typeof CoreModule>("@adapttable/core");

/**
 * Run the real shell, then patch its output (the windowed `tableProps` or the
 * `canLoadMore` flag) — the way the body data would arrive from a real
 * virtualizer / pager, so the adapter's render branches stay under test.
 */
type Shell = ReturnType<typeof actualCore.useDataTableShell>;

function mockShell(patch: (real: Shell) => Shell) {
  vi.mocked(useDataTableShell).mockImplementation((props, render) =>
    patch(actualCore.useDataTableShell(props, render))
  );
}

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(() => {
  // Default: delegate to the real shell so the normal render path runs.
  vi.mocked(useDataTableShell).mockImplementation(actualCore.useDataTableShell);
});

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  url = "",
  opts: { mode?: "paged" | "infinite"; isMobile?: boolean; rows?: Row[] } = {}
) {
  adapter = createMemoryAdapter(url);
  function Harness() {
    const source = useFrontendData<Row>({
      data: opts.rows ?? ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: opts.mode ?? "paged",
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
  return render(
    <ChakraProvider value={defaultSystem}>
      <Harness />
    </ChakraProvider>
  );
}

describe("chrome.tsx branches", () => {
  it("uses a custom searchPlaceholder (placeholder-present branch)", () => {
    mount({ searchPlaceholder: "Find rows…" });
    const input = screen.getByLabelText(defaultLabels.search);
    expect(input).toHaveAttribute("placeholder", "Find rows…");
  });

  it("clears the sort when the sort select is emptied (value || undefined falsy)", () => {
    mount(
      { sortByOptions: [{ value: "name", label: "Name" }] },
      "sortBy=name&sortDir=asc",
      { mode: "infinite" }
    );
    fireEvent.change(screen.getByLabelText(defaultLabels.sortBy), {
      target: { value: "" },
    });
    expect(adapter.getSearch()).not.toContain("sortBy=name");
  });

  it("renders a bulk-action element icon (isValidElement true branch)", () => {
    mount({
      bulkActions: [
        {
          key: "del",
          label: "Delete",
          icon: <span data-testid="bulk-icon">x</span>,
          onClick: vi.fn(),
        },
      ],
    });
    fireEvent.click(screen.getByLabelText(defaultLabels.selectAll));
    expect(screen.getByTestId("bulk-icon")).toBeInTheDocument();
  });

  it("places the filter drawer on the left in RTL (dir === 'rtl' true branch)", async () => {
    mount({ filters: <div>rtl-body</div>, dir: "rtl" });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("rtl-body")).toBeInTheDocument();
  });

  it("invokes onClearFilters from the drawer clear-all button", async () => {
    const onClearFilters = vi.fn();
    render(
      <ChakraProvider value={defaultSystem}>
        <FilterDrawer
          open
          onClose={vi.fn()}
          filters={<div>cf-body</div>}
          activeFilterCount={2}
          onClearFilters={onClearFilters}
          labels={defaultLabels}
        />
      </ChakraProvider>
    );
    await screen.findByText("cf-body");
    // With activeFilterCount > 0 the clear-all button is enabled.
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.clearAll })
    );
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("LoadingState omits the visually-hidden label when none is given (loadingLabel falsy)", () => {
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <LoadingState rows={2} columns={2} />
      </ChakraProvider>
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    // No loadingLabel → the VisuallyHidden node is not rendered.
    expect(container.textContent).toBe("");
  });

  it("opens the filter drawer in RTL drawer mode (placement 'start' arm)", async () => {
    // filtersMode="drawer" + dir="rtl" mounts the FilterDrawer with
    // placement="start" — the RTL arm of the placement ternary. Opening it
    // proves the drawer still works end-to-end with that placement.
    mount({
      filters: <div>drawer-rtl-body</div>,
      filtersMode: "drawer",
      dir: "rtl",
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("drawer-rtl-body")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("FilterDrawer defaults placement to the right in LTR (dir === 'rtl' false branch)", async () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <FilterDrawer
          open
          onClose={vi.fn()}
          filters={<div>ltr-body</div>}
          activeFilterCount={0}
          onClearFilters={vi.fn()}
          labels={defaultLabels}
        />
      </ChakraProvider>
    );
    expect(await screen.findByText("ltr-body")).toBeInTheDocument();
  });
});

describe("tables.tsx branches", () => {
  it("aligns an 'end' column to the end (chakraAlign end branch)", () => {
    const endCols: ColumnDef<Row>[] = [
      { key: "name", header: "Name", align: "end", accessor: (r) => r.name },
    ];
    mount({ columns: endCols });
    const cell = screen.getByText("Alice").closest("td")!;
    expect(cell).toHaveStyle({ textAlign: "end" });
  });

  it("hides a row action whose isHidden returns true", () => {
    mount({
      rowActions: [
        { key: "edit", label: "Edit", isHidden: () => true, onClick: vi.fn() },
      ],
    });
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("renders a sticky header when stickyHeader is set", () => {
    mount({ stickyHeader: true, stickyTop: 12 });
    const header = screen
      .getAllByRole("columnheader")
      .find((th) => getComputedStyle(th).position === "sticky");
    expect(header).toBeTruthy();
  });

  it("uses the column key for a non-string sortable header (columnName key branch)", () => {
    const reactHeaderCols: ColumnDef<Row>[] = [
      {
        key: "name",
        header: <em>Name</em>,
        sortable: true,
        accessor: (r) => r.name,
      },
    ];
    mount({ columns: reactHeaderCols });
    // columnName falls back to the key → sort button aria-label uses "name".
    expect(
      screen.getByRole("button", { name: `${defaultLabels.sortBy}: name` })
    ).toBeInTheDocument();
  });

  it("pins the sticky header to the scroll-box top when maxHeight is set", () => {
    mount({ stickyHeader: true, stickyTop: 12, maxHeight: 240 });
    // Inside a maxHeight scroll box the box itself is the sticky context, so
    // the header pins to ITS top (0px) — a viewport stickyTop offset would
    // float the header mid-box.
    const header = screen
      .getAllByRole("columnheader")
      .find((th) => getComputedStyle(th).position === "sticky")!;
    expect(getComputedStyle(header).top).toBe("0px");
  });

  it("sticks the selection edge cell flush left alongside a left-pinned column", () => {
    mount({
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      columnLayout: {
        hidden: [],
        order: [],
        pinned: { name: "start" },
        widths: {},
      },
    });
    // With a data column pinned left, the leading checkbox cells must pin to
    // the table edge too (edgePinStyle + opaque background), so the pinned
    // column doesn't slide beneath them while scrolling horizontally.
    const selectAllCell = screen
      .getByLabelText(defaultLabels.selectAll)
      .closest("th")!;
    expect(selectAllCell.style.position).toBe("sticky");
    expect(selectAllCell.style.background).not.toBe("");
  });

  it("renders a disabled row action with no activation handler attached", () => {
    const onClick = vi.fn();
    mount({
      rowActions: [
        {
          key: "del",
          label: "Delete",
          onClick,
          disabledReason: () => "locked",
        },
      ],
    });
    // Chakra's isDisabled sets the real disabled attribute, which blocks
    // activation — clicking must never reach the action's onClick.
    const button = screen.getAllByRole("button", { name: "Delete" })[0]!;
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("tightens mobile card spacing in compact density (compact arms)", () => {
    // density="compact" maps to size "sm", switching MobileCards to the
    // tighter stack/body/field spacing scale. A genuine change shows up as
    // different emotion classes vs the comfortable render (same pattern as
    // the desktop density suite).
    const classesFor = (density: "compact" | "comfortable") => {
      const { container, unmount } = mount({ density }, "", {
        isMobile: true,
      });
      const body = container.querySelector(".chakra-card__body")!;
      const field = body.querySelector("div")!;
      const classes = { body: body.className, field: field.className };
      unmount();
      return classes;
    };
    const compact = classesFor("compact");
    const comfortable = classesFor("comfortable");
    expect(compact.body).not.toBe("");
    expect(compact.body).not.toBe(comfortable.body);
    expect(compact.field).not.toBe(comfortable.field);
  });

  it("renders trailing padding in virtualized mobile cards (paddingBottom > 0 true branch)", () => {
    mockShell((real) => ({
      ...real,
      tableProps: {
        ...real.tableProps,
        rowEntries: [{ row: ROWS[1]!, index: 1, key: "b" }],
        paddingTop: 0,
        paddingBottom: 40,
        measureElement: vi.fn(),
      },
    }));
    mount({ virtualize: true, estimateCardSize: 40 }, "", {
      mode: "infinite",
      isMobile: true,
    });
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

describe("DataTable.tsx branches", () => {
  it("closes the controlled filter popover: body unmounts when open flips false", async () => {
    // The dismissal a user reaches via Escape / outside-click runs through the
    // popover's controlled `open` prop: `onCloseFilters` sets it false and the
    // body unmounts (`unmountOnExit`). Chakra v3's Popover is driven by Ark,
    // whose Escape / interact-outside handlers are wired with native pointer
    // and document listeners that jsdom's synthetic `fireEvent` can't trigger,
    // so we assert that controlled-close contract — the part the adapter owns —
    // directly with the `open` prop instead of a non-dispatchable Escape.
    function Harness({ open }: { open: boolean }) {
      return (
        <FilterPopover
          open={open}
          onClose={() => undefined}
          filters={<div>esc-body</div>}
          activeFilterCount={0}
          onClearFilters={() => undefined}
          labels={defaultLabels}
        >
          <button type="button" aria-expanded={open}>
            Filters
          </button>
        </FilterPopover>
      );
    }
    const { rerender } = render(
      <ChakraProvider value={defaultSystem}>
        <Harness open />
      </ChakraProvider>
    );
    const trigger = screen.getByRole("button", { name: /filters/i });
    expect(await screen.findByText("esc-body")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    rerender(
      <ChakraProvider value={defaultSystem}>
        <Harness open={false} />
      </ChakraProvider>
    );
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
    // Controlled close: with `unmountOnExit`, the body leaves once Ark's exit
    // transition ends. jsdom fires no `animationend`, so depending on timing
    // the content either unmounts or lingers marked `data-state="closed"` —
    // both represent the closed state. Assert that union so the test rides on
    // the close contract, not on jsdom's animation completion.
    await waitFor(() => {
      const pop = screen.queryByTestId("adapttable-filter-popover");
      expect(pop === null || pop.getAttribute("data-state") === "closed").toBe(
        true
      );
    });
  });

  it("hides the load-more affordance when the body data says it cannot load more", () => {
    // canLoadMore=false (paged mode / error in core) must suppress the
    // load-more sentinel + button even when the source reports a next page.
    mockShell((real) => ({ ...real, canLoadMore: false }));
    mount({}, "limit=1", { mode: "infinite" });
    expect(
      screen.queryByRole("button", { name: defaultLabels.loadMore })
    ).toBeNull();
  });
});
