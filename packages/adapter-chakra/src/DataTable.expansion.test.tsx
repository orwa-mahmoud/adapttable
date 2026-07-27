/**
 * Row expansion (`renderRowDetail`): the leading chevron column on desktop,
 * the per-card chevron + inline detail on mobile, the detail row's colSpan,
 * RTL chevron flipping, and the interplay with row activation and pinning.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

const renderRowDetail = (row: Row) => <div>detail-{row.name}</div>;

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  opts: { isMobile?: boolean } = {}
) {
  const adapter = createMemoryAdapter("");
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      adapter,
      columns,
      paginationMode: "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        isMobile={opts.isMobile}
        renderRowDetail={renderRowDetail}
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

describe("<DataTable> (Chakra) row expansion — desktop", () => {
  it("renders a leading chevron column and expands/collapses a row", () => {
    mount();
    // One extra (narrow, labelled) header cell leads the data columns.
    const headerCells = screen.getAllByRole("columnheader");
    expect(headerCells).toHaveLength(columns.length + 1);
    expect(headerCells[0]).toHaveAttribute("aria-label", "Expand row");

    const toggles = screen.getAllByRole("button", { name: "Expand row" });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("detail-Alice")).toBeNull();

    fireEvent.click(toggles[0]!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(screen.queryByText("detail-Bob")).toBeNull();
    const collapse = screen.getByRole("button", { name: "Collapse row" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    // The detail cell spans the chevron column plus every data column.
    expect(screen.getByText("detail-Alice").closest("td")).toHaveAttribute(
      "colspan",
      String(columns.length + 1)
    );

    fireEvent.click(collapse);
    expect(screen.queryByText("detail-Alice")).toBeNull();
  });

  it("keeps several rows open at once", () => {
    mount();
    const toggles = screen.getAllByRole("button", { name: "Expand row" });
    fireEvent.click(toggles[0]!);
    fireEvent.click(toggles[1]!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(screen.getByText("detail-Bob")).toBeInTheDocument();
  });

  it("spans selection + data + actions + expansion columns in the detail row", () => {
    mount({
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    // 2 data columns + chevron + selection + actions = 5.
    expect(screen.getByText("detail-Alice").closest("td")).toHaveAttribute(
      "colspan",
      "5"
    );
  });

  it("rotates the chevron when open and flips it for RTL", () => {
    const { unmount } = mount();
    const svgOf = (button: HTMLElement) => button.querySelector("svg")!;
    const ltrToggle = screen.getAllByRole("button", {
      name: "Expand row",
    })[0]!;
    // Closed LTR: the chevron points into the row untransformed.
    expect(getComputedStyle(svgOf(ltrToggle)).transform).toBe("none");
    fireEvent.click(ltrToggle);
    const openToggle = screen.getByRole("button", { name: "Collapse row" });
    expect(getComputedStyle(svgOf(openToggle)).transform).toBe("rotate(90deg)");
    unmount();

    mount({ dir: "rtl" });
    const rtlToggle = screen.getAllByRole("button", {
      name: "Expand row",
    })[0]!;
    expect(getComputedStyle(svgOf(rtlToggle)).transform).toBe("rotate(180deg)");
  });

  it("does not activate onRowClick from the chevron", () => {
    const onRowClick = vi.fn();
    mount({ onRowClick });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    expect(onRowClick).not.toHaveBeenCalled();
    // The row itself still activates.
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("pins the chevron flush and shifts the selection edge past it", () => {
    mount({
      bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      columnLayout: {
        hidden: [],
        order: [],
        pinned: { name: "start" },
        widths: {},
      },
    });
    // With a left-pinned data column, the chevron header pins flush to the
    // edge and the selection header pins just past it (the chevron width),
    // so the pinned column never slides beneath either while scrolling.
    const chevronTh = screen.getByRole("columnheader", {
      name: "Expand row",
    });
    expect(chevronTh.style.position).toBe("sticky");
    expect(chevronTh.style.insetInlineStart).toBe("0px");
    const selectTh = screen.getByLabelText("Select all").closest("th")!;
    expect(selectTh.style.position).toBe("sticky");
    expect(selectTh.style.insetInlineStart).toBe("32px");
    const selectTd = screen.getAllByLabelText("Select row")[0]!.closest("td")!;
    expect(selectTd.style.insetInlineStart).toBe("32px");
  });
});

describe("<DataTable> (Chakra) row expansion — mobile cards", () => {
  it("expands and collapses a card's inline detail", () => {
    mount({}, { isMobile: true });
    const cards = screen.getAllByRole("listitem");
    const toggle = within(cards[0]!).getByRole("button", {
      name: "Expand row",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    // The detail renders INSIDE the measured card, after the fields.
    expect(within(cards[0]!).getByText("detail-Alice")).toBeInTheDocument();
    expect(within(cards[1]!).queryByText("detail-Bob")).toBeNull();
    const collapse = within(cards[0]!).getByRole("button", {
      name: "Collapse row",
    });
    expect(collapse).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapse);
    expect(within(cards[0]!).queryByText("detail-Alice")).toBeNull();
  });

  it("does not activate onRowClick from a card's chevron", () => {
    const onRowClick = vi.fn();
    mount({ onRowClick }, { isMobile: true });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
