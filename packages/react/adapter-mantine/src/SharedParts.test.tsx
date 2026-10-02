import { defaultLabels } from "@adapttable/react/adapter";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ActiveFilterChips } from "./components/ActiveFilterChips";
import { ErrorState } from "./components/ErrorState";
import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";
import { renderMantine as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Grace", team: "Web" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

type Overrides = Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;

function mount(overrides: Overrides = {}) {
  return renderKit(
    <DataTable
      data={ROWS}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      urlSync={false}
      {...overrides}
    />
  );
}

function part(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-adapttable-part="${name}"]`
  );
  expect(element).not.toBeNull();
  return element!;
}

describe("shared styling parts (mantine)", () => {
  it.each(["", "   "])(
    "keeps the scroll region named when the host label is blank (%s)",
    (tableLabel) => {
      mount({
        forceMobile: true,
        maxHeight: 180,
        tableLabel,
        labels: { table: "Personnes" },
      });
      const region = screen.getByRole("region", { name: "Personnes" });
      expect(region).toHaveAttribute("tabindex", "0");
      expect(region).toContainElement(part("cards"));
      expect(within(region).getByRole("list")).toBe(part("cards"));
    }
  );
  it.each([180, 0])(
    "makes a bounded mobile scroll region focusable at maxHeight %s",
    (maxHeight) => {
      mount({
        forceMobile: true,
        tableLabel: "People",
        maxHeight,
        dir: "rtl",
        classNames: { card: "host-card" },
      });
      const region = screen.getByRole("region", { name: "People" });
      const list = within(region).getByRole("list", { name: "People" });
      expect(region.tagName).toBe("DIV");
      expect(region).toHaveAttribute("tabindex", "0");
      expect(region.style.maxHeight).toBe(`${maxHeight}px`);
      expect(region.style.overflowY).toBe("auto");
      expect(region).toHaveAttribute("data-adapttable-part", "scroll-box");
      expect(list).toBe(part("cards"));
      expect(list.parentElement).toBe(region);
      expect(list).not.toHaveAttribute("tabindex");
      expect(list.style.maxHeight).toBe("");
      expect(list.style.overflowY).toBe("");
      expect(within(list).getAllByRole("listitem")).toHaveLength(ROWS.length);
      expect(list).toContainElement(part("card"));
      expect(part("card")).toContainElement(part("card-row"));
      expect(part("card-row")).toContainElement(part("card-label"));
      expect(part("card-row")).toContainElement(part("card-value"));
      expect(part("cards")).toHaveClass("host-card");
      expect(region.closest('[dir="rtl"]')).not.toBeNull();
      region.focus();
      expect(region).toHaveFocus();
    }
  );

  it("keeps an unbounded mobile list out of the tab order", () => {
    mount({ forceMobile: true });
    const region = screen.getByRole("region", { name: defaultLabels.table });
    const list = within(region).getByRole("list", {
      name: defaultLabels.table,
    });
    expect(region).not.toHaveAttribute("tabindex");
    expect(region.style.maxHeight).toBe("");
    expect(region.style.overflowY).toBe("");
    expect(list).toBe(part("cards"));
    expect(list).not.toHaveAttribute("tabindex");
    region.focus();
    expect(region).not.toHaveFocus();
  });

  it("removes and restores the live height bound without replacing the region or list", () => {
    function Harness() {
      const [maxHeight, setMaxHeight] = useState<number | undefined>(180);
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setMaxHeight((height) => (height === undefined ? 180 : undefined))
            }
          >
            Toggle height
          </button>
          <DataTable
            data={ROWS}
            columns={COLUMNS}
            rowKey={(row) => row.id}
            urlSync={false}
            forceMobile
            tableLabel="People"
            maxHeight={maxHeight}
          />
        </>
      );
    }
    renderKit(<Harness />);
    const region = screen.getByRole("region", { name: "People" });
    const list = within(region).getByRole("list", { name: "People" });
    const card = part("card");
    region.focus();
    expect(region).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Toggle height" }));
    expect(screen.getByRole("region", { name: "People" })).toBe(region);
    expect(part("cards")).toBe(list);
    expect(part("card")).toBe(card);
    expect(region).not.toHaveAttribute("tabindex");
    expect(region.style.maxHeight).toBe("");
    expect(region.style.overflowY).toBe("");
    expect(list).not.toHaveAttribute("tabindex");

    fireEvent.click(screen.getByRole("button", { name: "Toggle height" }));
    expect(screen.getByRole("region", { name: "People" })).toBe(region);
    expect(part("cards")).toBe(list);
    expect(part("card")).toBe(card);
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.style.maxHeight).toBe("180px");
    expect(region.style.overflowY).toBe("auto");
    expect(list.style.maxHeight).toBe("");
    expect(list.style.overflowY).toBe("");
    region.focus();
    expect(region).toHaveFocus();
  });

  it("names the footer, summary cells and row extras on their real elements", () => {
    const onAction = vi.fn();
    mount({
      classNames: { footer: "footer-hook" },
      features: [rowReorder<Row>(vi.fn())],
      bulkActions: [{ key: "archive", label: "Archive", onClick: vi.fn() }],
      rowActions: [{ key: "inspect", label: "Inspect", onClick: onAction }],
      renderRowDetail: (row) => <p>Details for {row.name}</p>,
      defaultExpandedRowIds: ["a"],
      summaryRow: () => ({ name: "Two people" }),
    });

    expect(part("footer")).toHaveClass("footer-hook");
    expect(within(part("footer")).getByRole("combobox")).toBeInTheDocument();
    expect(part("summary").tagName).toBe("TFOOT");
    expect(part("summary-row").tagName).toBe("TR");
    expect(part("summary-row").parentElement).toBe(part("summary"));
    const summaryCells = [...part("summary-row").querySelectorAll("td")];
    // Expand, reorder, selection, two data columns, actions: every cell counts.
    expect(summaryCells).toHaveLength(6);
    for (const cell of summaryCells) {
      expect(cell).toHaveAttribute("data-adapttable-part", "summary-cell");
    }
    expect(summaryCells[3]).toHaveTextContent("Two people");
    expect(summaryCells[4]).toBeEmptyDOMElement();

    for (const name of ["expand-header", "actions-header"]) {
      expect(part(name).tagName).toBe("TH");
      expect(part(name).closest("thead")).toBe(part("thead"));
    }
    for (const name of ["expand-cell", "actions-cell"]) {
      expect(part(name).tagName).toBe("TD");
      expect(part(name).parentElement).toHaveAttribute(
        "data-adapttable-part",
        "row"
      );
    }
    expect(part("detail-row").tagName).toBe("TR");
    expect(part("detail-row").parentElement).toBe(part("tbody"));
    expect(part("detail-cell").tagName).toBe("TD");
    expect(part("detail-cell").parentElement).toBe(part("detail-row"));
    expect(part("detail-cell")).toHaveAttribute("colspan", "6");
    expect(part("detail-cell")).toHaveTextContent("Details for Ada");

    fireEvent.click(
      within(part("actions-cell")).getByRole("button", { name: "Inspect" })
    );
    expect(onAction).toHaveBeenCalledWith(ROWS[0]);
    fireEvent.click(
      within(part("expand-cell")).getByRole("button", {
        name: defaultLabels.collapseRow,
      })
    );
    expect(
      document.querySelector('[data-adapttable-part="detail-row"]')
    ).toBeNull();
    fireEvent.click(
      within(part("expand-cell")).getByRole("button", {
        name: defaultLabels.expandRow,
      })
    );
    expect(part("detail-cell")).toHaveTextContent("Details for Ada");
  });

  it("keeps the shared resize hook on the named keyboard control", () => {
    const onColumnLayoutChange = vi.fn();
    mount({ resizableColumns: true, onColumnLayoutChange });
    const handle = screen.getByRole("button", {
      name: `${defaultLabels.resizeColumn}: Name`,
    });
    expect(handle).toBe(part("resize-handle"));
    expect(handle).toHaveAttribute("tabindex", "0");
    const header = handle.closest("th")!;
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 120, 32)
    );
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onColumnLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({
        widths: expect.objectContaining({ name: 136 }),
      })
    );
  });

  it("names the real search input, its wrapper and kit-owned icon holder", async () => {
    const onClearFilters = vi.fn();
    mount({ onClearFilters });
    const search = screen.getByRole("searchbox", {
      name: defaultLabels.search,
    });
    expect(part("search")).toBe(search);
    expect(part("search").tagName).toBe("INPUT");
    expect(part("search-field")).toContainElement(search);
    expect(part("search-field")).toContainElement(part("search-icon"));
    expect(part("search-icon").querySelector("svg")).not.toBeNull();
    fireEvent.change(search, { target: { value: "Nobody" } });
    expect(search).toHaveValue("Nobody");
    await waitFor(() =>
      expect(part("empty")).toHaveTextContent(defaultLabels.noResults)
    );
    expect(part("empty")).toHaveAttribute("role", "status");
    fireEvent.click(
      within(part("empty")).getByRole("button", {
        name: defaultLabels.clearAll,
      })
    );
    expect(onClearFilters).toHaveBeenCalledTimes(1);
    // Clearing filter extras intentionally preserves the independent search.
    expect(search).toHaveValue("Nobody");
    fireEvent.change(search, { target: { value: "" } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
  });

  it("names ordinary and summary card fields and encloses working actions", () => {
    const onAction = vi.fn();
    mount({
      forceMobile: true,
      rowActions: [{ key: "inspect", label: "Inspect", onClick: onAction }],
      summaryRow: () => ({ name: "Two people" }),
    });
    const cards = document.querySelectorAll('[data-adapttable-part="card"]');
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const fields = card.querySelectorAll('[data-adapttable-part="card-row"]');
      expect(fields).toHaveLength(2);
      for (const field of fields) {
        expect(
          field.querySelector('[data-adapttable-part="card-label"]')
        ).not.toBeNull();
        expect(
          field.querySelector('[data-adapttable-part="card-value"]')
        ).not.toBeNull();
      }
      expect(
        card.querySelector('[data-adapttable-part="card-actions"]')
      ).not.toBeNull();
    }
    const summaryField = part("summary-card").querySelector(
      '[data-adapttable-part="card-row"]'
    );
    expect(summaryField).toHaveTextContent("Two people");
    expect(
      summaryField?.querySelector('[data-adapttable-part="card-label"]')
    ).toHaveTextContent("Name");
    fireEvent.click(
      within(part("card-actions")).getByRole("button", { name: "Inspect" })
    );
    expect(onAction).toHaveBeenCalledWith(ROWS[0]);
  });

  it("names list items and their keyboard-reachable remove buttons, including clear all", () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    renderKit(
      <ActiveFilterChips
        chips={[{ key: "team", label: "Team: Core", onRemove }]}
        onClearAll={onClearAll}
        label={defaultLabels.filters}
        clearAllLabel={defaultLabels.clearAll}
      />
    );
    const chips = part("chips");
    expect(chips.tagName).toBe("UL");
    expect(chips).toHaveAccessibleName(defaultLabels.filters);
    const items = within(chips).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.tagName).toBe("LI");
      expect(item).toHaveAttribute("data-adapttable-part", "chip");
      const remove = within(item).getByRole("button");
      expect(remove.tagName).toBe("BUTTON");
      expect(remove).toHaveAttribute("data-adapttable-part", "chip-remove");
      expect(remove.tabIndex).toBe(0);
    }
    const remove = screen.getByRole("button", {
      name: defaultLabels.removeFilter("Team: Core"),
    });
    remove.focus();
    expect(remove).toHaveFocus();
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.clearAll })
    );
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it("names the no-data status", () => {
    mount({ data: [] });
    expect(part("empty")).toHaveAttribute("role", "status");
    expect(part("empty")).toHaveTextContent(defaultLabels.noData);
  });

  it("names the error alert without losing its retry callback", () => {
    const onRetry = vi.fn();
    renderKit(
      <ErrorState
        error={new Error("Request failed")}
        title={defaultLabels.errorTitle}
        message={defaultLabels.errorMessage}
        retryLabel={defaultLabels.retry}
        onRetry={onRetry}
      />
    );
    expect(part("error")).toBe(screen.getByRole("alert"));
    expect(part("error")).toHaveTextContent("Request failed");
    fireEvent.click(
      within(part("error")).getByRole("button", { name: defaultLabels.retry })
    );
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
