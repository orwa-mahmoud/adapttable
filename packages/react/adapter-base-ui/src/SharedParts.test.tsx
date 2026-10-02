/** The shared shell hooks are asserted on rendered elements, not source literals. */
import { createMemoryAdapter, defaultLabels } from "@adapttable/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Chips } from "./components/ActiveFilterChips";
import { ErrorState } from "./components/ErrorState";
import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";
import { renderBaseUi as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];
type Override = Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;

function mount(props: Override = {}) {
  return renderKit(
    <DataTable
      data={ROWS}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      urlSync={false}
      forceMobile={false}
      {...props}
    />
  );
}

function part(name: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    `[data-adapttable-part="${name}"]`
  );
  if (!node) throw new Error(`Missing shared part: ${name}`);
  return node;
}

describe("shared shell styling parts (base-ui)", () => {
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
  it.each([0, 240])(
    "makes the named %ipx card scroller focusable while preserving its list",
    (maxHeight) => {
      renderKit(
        <DataTable
          data={ROWS}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          urlSync={false}
          forceMobile
          tableLabel="People"
          maxHeight={maxHeight}
          dir="rtl"
        />
      );
      const region = screen.getByRole("region", { name: "People" });
      const list = within(region).getByRole("list", { name: "People" });
      expect(region).toHaveAttribute("tabindex", "0");
      expect(region).toHaveStyle({
        maxHeight: `${maxHeight}px`,
        overflowY: "auto",
      });
      expect(region).toHaveAttribute("data-adapttable-part", "scroll-box");
      expect(region.closest("[dir]")).toHaveAttribute("dir", "rtl");
      expect(list).toBe(part("cards"));
      expect(list.parentElement).toBe(region);
      expect(list).not.toHaveAttribute("tabindex");
      expect(list.style.maxHeight).toBe("");
      expect(list.style.overflowY).toBe("");
      expect(within(list).getAllByRole("listitem")).toHaveLength(ROWS.length);
      expect(part("card")?.parentElement).toBe(list);
      region.focus();
      expect(region).toHaveFocus();
      list.focus();
      expect(region).toHaveFocus();
    }
  );

  it("keeps unbounded cards named without adding a tab stop or scroll box", () => {
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile
      />
    );
    const region = screen.getByRole("region", { name: defaultLabels.table });
    const list = within(region).getByRole("list", {
      name: defaultLabels.table,
    });
    expect(list).toBe(part("cards"));
    expect(region).not.toHaveAttribute("tabindex");
    expect(list).not.toHaveAttribute("tabindex");
    expect(region.style.maxHeight).toBe("");
    expect(region.style.overflowY).toBe("");
    region.focus();
    expect(region).not.toHaveFocus();
  });

  it("removes the live height limit and tab stop without remounting cards", () => {
    const onAction = vi.fn();
    function ChangingHeight() {
      const [maxHeight, setMaxHeight] = useState<number | undefined>(240);
      return (
        <>
          <button type="button" onClick={() => setMaxHeight(undefined)}>
            Remove height limit
          </button>
          <DataTable
            data={ROWS}
            columns={COLUMNS}
            rowKey={(row) => row.id}
            urlSync={false}
            forceMobile
            tableLabel="People"
            maxHeight={maxHeight}
            rowActions={[
              { key: "inspect", label: "Inspect", onClick: onAction },
            ]}
          />
        </>
      );
    }
    renderKit(<ChangingHeight />);
    const region = screen.getByRole("region", { name: "People" });
    const list = within(region).getByRole("list", { name: "People" });
    const card = part("card");
    const action = within(card).getByRole("button", { name: "Inspect" });
    action.focus();
    expect(action).toHaveFocus();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove height limit" })
    );
    expect(screen.getByRole("region", { name: "People" })).toBe(region);
    expect(within(region).getByRole("list", { name: "People" })).toBe(list);
    expect(part("card")).toBe(card);
    expect(region).not.toHaveAttribute("tabindex");
    expect(region.style.maxHeight).toBe("");
    expect(region.style.overflowY).toBe("");
    expect(list).not.toHaveAttribute("tabindex");
    expect(action).toHaveFocus();
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledWith(ROWS[0]);
  });

  it("names the actual headers, cells, detail and footer without changing actions", () => {
    const onAction = vi.fn();
    const onRowClick = vi.fn();
    mount({
      features: [rowReorder<Row>(vi.fn())],
      bulkActions: [{ key: "archive", label: "Archive", onClick: vi.fn() }],
      rowActions: [{ key: "inspect", label: "Inspect", onClick: onAction }],
      renderRowDetail: (row) => <span>Detail {row.name}</span>,
      defaultExpandedRowIds: ["a"],
      summaryRow: () => ({ name: "Two people" }),
      onRowClick,
      classNames: { footer: "host-footer" },
    });

    const header = part("thead").querySelector("tr")!;
    expect(header.firstElementChild).toBe(part("expand-header"));
    expect(header.lastElementChild).toBe(part("actions-header"));
    expect(part("expand-header").tagName).toBe("TH");
    expect(part("actions-header").tagName).toBe("TH");
    expect(part("expand-cell").tagName).toBe("TD");
    expect(part("actions-cell").tagName).toBe("TD");
    const expand = screen.getByRole("button", { name: "Collapse row" });
    expect(expand.closest("td")).toBe(part("expand-cell"));
    expect(part("detail-row").tagName).toBe("TR");
    expect(part("detail-cell").tagName).toBe("TD");
    expect(part("detail-cell").parentElement).toBe(part("detail-row"));
    expect(part("detail-cell")).toHaveAttribute("colspan", "5");
    expect(part("detail-cell")).toHaveTextContent("Detail Alice");

    expect(part("summary").tagName).toBe("TFOOT");
    expect(part("summary-row").parentElement).toBe(part("summary"));
    const summaryCells = part("summary-row").querySelectorAll("td");
    expect(summaryCells).toHaveLength(5);
    for (const cell of summaryCells) {
      expect(cell).toHaveAttribute("data-adapttable-part", "summary-cell");
    }
    expect(summaryCells[3]).toHaveTextContent("Two people");
    expect(part("footer")).toHaveClass("host-footer");
    expect(
      within(part("footer")).getByRole("button", {
        name: defaultLabels.nextPage,
      })
    ).toBeInTheDocument();

    fireEvent.click(
      within(part("actions-cell")).getByRole("button", {
        name: "Inspect",
      })
    );
    expect(onAction).toHaveBeenCalledWith(ROWS[0]);
    expect(onRowClick).not.toHaveBeenCalled();
    fireEvent.click(expand);
    expect(
      document.querySelector('[data-adapttable-part="detail-row"]')
    ).toBeNull();
  });

  it("names the focusable resize control and preserves keyboard resizing", () => {
    const onLayoutChange = vi.fn();
    mount({ resizableColumns: true, onColumnLayoutChange: onLayoutChange });
    const resize = part("resize-handle");
    expect(resize).toHaveAttribute("role", "button");
    expect(resize).toHaveAttribute("tabindex", "0");
    expect(resize).toHaveAccessibleName(`${defaultLabels.resizeColumn}: Name`);
    const header = resize.closest("th")!;
    expect(header).toBe(part("header-cell"));
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 120, 32)
    );
    fireEvent.keyDown(resize, { key: "ArrowRight" });
    expect(onLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({
        widths: { name: 136 },
      })
    );
  });

  it("names the input, its own field wrapper and icon while search still works", async () => {
    mount();
    const input = screen.getByRole("searchbox");
    expect(part("search")).toBe(input);
    expect(part("search").tagName).toBe("INPUT");
    expect(part("search-field")).toContainElement(input);
    expect(part("search-field")).toContainElement(part("search-icon"));
    expect(part("search-icon").querySelector("svg")).not.toBeNull();
    fireEvent.change(input, { target: { value: "Alice" } });
    await waitFor(() =>
      expect(
        document.querySelectorAll('[data-adapttable-part="row"]')
      ).toHaveLength(1)
    );
    expect(part("cell")).toHaveTextContent("Alice");
  });

  it("names card fields, summary fields and the live action group", () => {
    const onAction = vi.fn();
    mount({
      forceMobile: true,
      rowActions: [{ key: "inspect", label: "Inspect", onClick: onAction }],
      summaryRow: () => ({ name: "Two people" }),
    });
    const card = part("card");
    const field = card.querySelector('[data-adapttable-part="card-row"]')!;
    expect(
      field.querySelector('[data-adapttable-part="card-label"]')
    ).toHaveTextContent("Name");
    expect(
      field.querySelector('[data-adapttable-part="card-value"]')
    ).toHaveTextContent("Alice");
    const actions = card.querySelector<HTMLElement>(
      '[data-adapttable-part="card-actions"]'
    )!;
    fireEvent.click(within(actions).getByRole("button", { name: "Inspect" }));
    expect(onAction).toHaveBeenCalledWith(ROWS[0]);
    const summary = part("summary-card");
    expect(
      summary.querySelector('[data-adapttable-part="card-row"]')
    ).toHaveTextContent("Two people");
    expect(
      summary.querySelector('[data-adapttable-part="card-label"]')
    ).toHaveTextContent("Name");
  });

  it("names chip list items and their actual removal controls", () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    renderKit(
      <Chips
        chips={[{ key: "active", label: "Status: Active", onRemove }]}
        onClearAll={onClearAll}
        labels={defaultLabels}
      />
    );
    expect(part("chips").tagName).toBe("UL");
    const items = part("chips").querySelectorAll("li");
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item).toHaveAttribute("data-adapttable-part", "chip");
      const remove = item.querySelector<HTMLElement>(
        '[data-adapttable-part="chip-remove"]'
      )!;
      expect(remove.tagName).toBe("BUTTON");
      expect(remove.tabIndex).toBe(0);
      fireEvent.click(remove);
    }
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("names both empty states and keeps the no-results reset usable", async () => {
    const empty = mount({ data: [] });
    expect(part("empty")).toHaveTextContent(defaultLabels.noData);
    empty.unmount();
    const adapter = createMemoryAdapter("f_name=unmatched");
    mount({
      urlSync: true,
      urlAdapter: adapter,
      filters: [{ key: "name", label: "Name", type: "text" }],
    });
    await screen.findByText(defaultLabels.noResults);
    expect(part("empty")).toHaveTextContent(defaultLabels.noResults);
    fireEvent.click(
      within(part("empty")).getByRole("button", {
        name: defaultLabels.clearAll,
      })
    );
    await waitFor(() =>
      expect(
        document.querySelectorAll('[data-adapttable-part="row"]')
      ).toHaveLength(2)
    );
    expect(adapter.getSearch()).not.toContain("f_name");
  });

  it("names the live error alert and preserves its retry callback", () => {
    const onRetry = vi.fn();
    renderKit(
      <ErrorState
        error={new Error("Unavailable")}
        labels={defaultLabels}
        onRetry={onRetry}
      />
    );
    expect(part("error")).toBe(screen.getByRole("alert"));
    expect(part("error")).toHaveTextContent("Unavailable");
    fireEvent.click(
      within(part("error")).getByRole("button", {
        name: defaultLabels.retry,
      })
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
