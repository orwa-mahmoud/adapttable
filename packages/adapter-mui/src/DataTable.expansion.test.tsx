/**
 * Row expansion (desktop chevron column, detail rows, mobile cards) and the
 * memoized desktop row: a search keystroke must not re-run cell accessors,
 * and toggling one row's checkbox must re-render only that row.
 */
import {
  createMemoryAdapter,
  defaultConfirm,
  type RowExpansionState,
  useDataTable,
  useFrontendData,
} from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DesktopTable,
  MobileCards,
  useStableToggle,
} from "./components/tables";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
// Every value contains an "a", so a one-letter search keeps the row set —
// and the row indices — identical (the memo test depends on that).
const PEOPLE: Row[] = [
  { id: "a1", name: "Alice", city: "Dubai" },
  { id: "a2", name: "Carla", city: "Doha" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city },
];
const theme = createTheme();

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const source = useFrontendData<Row>({
    data: PEOPLE,
    urlAdapter: adapter,
    columns,
    paginationMode: "paged",
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      {...props.override}
    />
  );
}

function renderTable(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  url = ""
) {
  adapter = createMemoryAdapter(url);
  return render(
    <ThemeProvider theme={theme}>
      <Harness override={override} />
    </ThemeProvider>
  );
}

/** Direct table/cards mount, for prop combinations DataTable never produces. */
function PartsHarness(props: {
  mobile?: boolean;
  expansion?: RowExpansionState;
}) {
  const source = useFrontendData<Row>({
    data: PEOPLE,
    urlAdapter: adapter,
    columns,
  });
  const table = useDataTable<Row>({
    source,
    columns,
    rowKey: (r) => r.id,
  });
  const shared = {
    table,
    rows: source.rows,
    confirm: defaultConfirm,
    getRowId: (r: Row) => r.id,
    size: "medium" as const,
    expansion: props.expansion,
  };
  return props.mobile ? (
    <MobileCards {...shared} />
  ) : (
    <DesktopTable {...shared} />
  );
}

const detailFor = (r: Row) => <div>detail {r.name}</div>;
const expandButtons = () =>
  screen.getAllByRole("button", { name: "Expand row" });

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("row expansion (MUI)", () => {
  it("expands and collapses a desktop row detail panel with aria wiring", () => {
    renderTable({ renderRowDetail: detailFor });
    const expanders = expandButtons();
    expect(expanders).toHaveLength(2);
    expect(expanders[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("detail Alice")).toBeNull();

    fireEvent.click(expanders[0]!);
    const collapse = screen.getByRole("button", { name: "Collapse row" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    // The detail row spans the expand column plus both data columns.
    const detailCell = screen.getByText("detail Alice").closest("td")!;
    expect(detailCell).toHaveAttribute("colspan", "3");

    fireEvent.click(collapse);
    expect(screen.queryByText("detail Alice")).toBeNull();
  });

  it("spans the detail row across expand, selection, data, and action columns", () => {
    renderTable({
      renderRowDetail: detailFor,
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
    });
    // Header: expand + selection + 2 data + actions.
    const headCells = document.querySelectorAll("thead th");
    expect(headCells).toHaveLength(5);
    expect(
      within(headCells[1] as HTMLElement).getByLabelText("Select all")
    ).toBeInTheDocument();

    fireEvent.click(expandButtons()[0]!);
    const detailCell = screen.getByText("detail Alice").closest("td")!;
    expect(detailCell).toHaveAttribute("colspan", "5");
  });

  it("points the collapsed chevron at the reading end and down when open", () => {
    renderTable({ dir: "rtl", renderRowDetail: detailFor });
    const btn = expandButtons()[0]!;
    const chevron = btn.firstElementChild as HTMLElement;
    expect(getComputedStyle(chevron).transform).toBe("rotate(180deg)");
    fireEvent.click(btn);
    const open = screen.getByRole("button", { name: "Collapse row" });
    expect(
      getComputedStyle(open.firstElementChild as HTMLElement).transform
    ).toBe("rotate(90deg)");
  });

  it("renders the chevron and detail inside the mobile card", () => {
    renderTable({ forceMobile: true, renderRowDetail: detailFor });
    const card = screen.getAllByRole("listitem")[0]!;
    const btn = within(card).getByRole("button", { name: "Expand row" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    // Collapsed LTR chevron carries no rotation.
    expect(
      getComputedStyle(btn.firstElementChild as HTMLElement).transform
    ).toBe("none");

    fireEvent.click(btn);
    expect(within(card).getByText("detail Alice")).toBeInTheDocument();
    const collapse = within(card).getByRole("button", {
      name: "Collapse row",
    });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapse);
    expect(within(card).queryByText("detail Alice")).toBeNull();
  });

  it("edge-pins the expand and selection columns alongside a left data pin", () => {
    renderTable({
      renderRowDetail: detailFor,
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      maxHeight: 300,
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    const headCells = document.querySelectorAll("thead th");
    expect(getComputedStyle(headCells[0] as HTMLElement).position).toBe(
      "sticky"
    );
    expect(getComputedStyle(headCells[1] as HTMLElement).position).toBe(
      "sticky"
    );
    const expandBody = expandButtons()[0]!.closest("td")!;
    expect(getComputedStyle(expandBody).position).toBe("sticky");
    const selectBody = screen
      .getAllByLabelText("Select row")[0]!
      .closest("td")!;
    expect(getComputedStyle(selectBody).position).toBe("sticky");
  });

  it("renders no expansion affordance when expansion state arrives without a detail renderer (desktop)", () => {
    adapter = createMemoryAdapter("");
    const expansion: RowExpansionState = {
      expandedIds: new Set<string>(),
      isExpanded: () => true,
      toggle: () => undefined,
    };
    render(
      <ThemeProvider theme={theme}>
        <PartsHarness expansion={expansion} />
      </ThemeProvider>
    );
    expect(screen.queryByRole("button", { name: "Expand row" })).toBeNull();
    // No leading expand column either: the header has only the data columns.
    expect(document.querySelectorAll("thead th")).toHaveLength(columns.length);
  });

  it("renders no expansion affordance when expansion state arrives without a detail renderer (mobile)", () => {
    adapter = createMemoryAdapter("");
    const expansion: RowExpansionState = {
      expandedIds: new Set<string>(),
      isExpanded: () => true,
      toggle: () => undefined,
    };
    render(
      <ThemeProvider theme={theme}>
        <PartsHarness mobile expansion={expansion} />
      </ThemeProvider>
    );
    expect(screen.queryByRole("button", { name: "Expand row" })).toBeNull();
  });
});

describe("memoized desktop rows (MUI)", () => {
  it("skips unchanged rows: a search keystroke re-runs no accessors; one checkbox re-renders one row", () => {
    const nameAccessor = vi.fn((r: Row) => r.name);
    const cityAccessor = vi.fn((r: Row) => r.city);
    const tracked: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: nameAccessor },
      { key: "city", header: "City", accessor: cityAccessor },
    ];
    renderTable({
      columns: tracked,
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
    });
    expect(nameAccessor).toHaveBeenCalled();
    nameAccessor.mockClear();
    cityAccessor.mockClear();

    // One keystroke re-renders the chrome immediately, and the debounced
    // commit re-filters to the SAME row set — unchanged rows must bail out.
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "a" },
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(nameAccessor).not.toHaveBeenCalled();
    expect(cityAccessor).not.toHaveBeenCalled();

    // Selecting one row re-renders only its checkbox cell. The React Compiler
    // memoizes per cell (finer than the row-level memo), so the toggled row's
    // data-cell accessors never re-run, while "1 selected" still updates.
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(nameAccessor).not.toHaveBeenCalled();
    expect(cityAccessor).not.toHaveBeenCalled();
  });

  it("expanding one row leaves the other rows' accessors untouched", () => {
    const nameAccessor = vi.fn((r: Row) => r.name);
    const tracked: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: nameAccessor },
    ];
    renderTable({ columns: tracked, renderRowDetail: detailFor });
    nameAccessor.mockClear();

    fireEvent.click(expandButtons()[0]!);
    expect(screen.getByText("detail Alice")).toBeInTheDocument();
    // Cell-level memoization: expanding re-renders only the chevron cell and
    // adds the detail row — the data cell is memoized, so its accessor never
    // re-runs.
    expect(nameAccessor).not.toHaveBeenCalled();
  });

  it("useStableToggle keeps one identity and dispatches to the current target", () => {
    const first = { toggle: vi.fn() };
    const { result, rerender } = renderHook<
      (id: string) => void,
      { target: { toggle: (id: string) => void } | null }
    >(({ target }) => useStableToggle(target), {
      initialProps: { target: first },
    });
    const stable = result.current;
    stable("a");
    expect(first.toggle).toHaveBeenCalledWith("a");

    const second = { toggle: vi.fn() };
    rerender({ target: second });
    expect(result.current).toBe(stable);
    stable("b");
    expect(second.toggle).toHaveBeenCalledWith("b");
    expect(first.toggle).toHaveBeenCalledTimes(1);

    // A null target turns the dispatcher into a safe no-op.
    rerender({ target: null });
    expect(() => stable("c")).not.toThrow();
    expect(second.toggle).toHaveBeenCalledTimes(1);
  });
});
