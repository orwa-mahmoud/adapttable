import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ConfigProvider, Table } from "antd";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Chips } from "./components/ActiveFilterChips";
import { ErrorState } from "./components/ErrorState";
import { DataTable } from "./data-table.test-utils";
import { type ColumnDef, defaultLabels } from "./index";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Alan" },
];
const COLUMNS: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];
const part = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
];

/** Parts belong to the rendered kit elements, not to newly inserted wrappers. */
describe("shared styling parts (antd)", () => {
  it.each(["", "   "])(
    "keeps the scroll region named when the host label is blank (%s)",
    (tableLabel) => {
      renderAntd(
        <DataTable
          data={ROWS}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          urlSync={false}
          forceMobile
          maxHeight={180}
          tableLabel={tableLabel}
          labels={{ table: "Personnes" }}
        />
      );
      const region = screen.getByRole("region", { name: "Personnes" });
      expect(region).toHaveAttribute("tabindex", "0");
      expect(region).toContainElement(part("cards"));
      expect(within(region).getByRole("list")).toBe(part("cards"));
    }
  );
  it.each([0, 240])(
    "makes the named %ipx card scroller focusable while preserving its list",
    (maxHeight) => {
      renderAntd(
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
      expect(region).not.toHaveAttribute("data-adapttable-part");
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
    renderAntd(
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
    renderAntd(<ChangingHeight />);
    const region = screen.getByRole("region", { name: "People" });
    const list = within(region).getByRole("list", { name: "People" });
    const card = part("card")!;
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

  it("names native summary cells, row controls and the classified footer", async () => {
    const action = vi.fn();
    renderAntd(
      <ConfigProvider prefixCls="kit">
        <DataTable
          data={ROWS}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          urlSync={false}
          forceMobile={false}
          classNames={{ footer: "host-footer" }}
          summaryRow={() => ({ name: "2 people" })}
          rowActions={[{ key: "open", label: "Open", onClick: action }]}
          renderRowDetail={(row) => <p>Details for {row.name}</p>}
          defaultExpandedRowIds={["a"]}
        />
      </ConfigProvider>
    );
    const footer = part("footer");
    expect(footer).toHaveClass("host-footer");
    expect(
      within(footer!).getAllByLabelText(defaultLabels.rowsPerPage).length
    ).toBeGreaterThan(0);
    const summary = part("summary");
    expect(summary?.tagName).toBe("TFOOT");
    expect(summary).toHaveClass("kit-table-summary");
    expect(part("summary-row", summary!)?.tagName).toBe("TR");
    const summaryCells = parts("summary-cell", summary!);
    expect(summaryCells).toHaveLength(3);
    expect(summaryCells.map((cell) => cell.tagName)).toEqual([
      "TD",
      "TD",
      "TD",
    ]);
    expect(summaryCells[1]).toHaveTextContent("2 people");
    expect(part("actions-header")?.tagName).toBe("TH");
    expect(part("actions-header")).toHaveTextContent("Actions");
    expect(parts("actions-cell")).toHaveLength(2);
    expect(part("actions-cell")?.tagName).toBe("TD");
    fireEvent.click(
      within(part("actions-cell")!).getByRole("button", { name: "Open" })
    );
    expect(action).toHaveBeenCalledWith(ROWS[0]);
    expect(part("expand-header")?.tagName).toBe("TH");
    expect(parts("expand-cell")).toHaveLength(2);
    expect(part("expand-cell")?.tagName).toBe("TD");
    await waitFor(() => expect(part("detail-row")?.tagName).toBe("TR"));
    expect(part("detail-cell")?.tagName).toBe("TD");
    expect(part("detail-row")).toContainElement(part("detail-cell"));
    expect(part("detail-cell")).toHaveTextContent("Details for Ada");
  });

  it.each(["ant", "nested"])(
    "excludes a nested table with the %s prefix after expansion",
    async (prefixCls) => {
      renderAntd(
        <DataTable
          data={[ROWS[0]!]}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          urlSync={false}
          forceMobile={false}
          renderRowDetail={() => (
            <ConfigProvider prefixCls={prefixCls}>
              <table aria-label="Plain nested table">
                <thead>
                  <tr>
                    <th scope="col">Plain nested value</th>
                  </tr>
                </thead>
                <tfoot>
                  <tr>
                    <td>Plain nested total</td>
                  </tr>
                </tfoot>
              </table>
              <Table
                dataSource={[{ key: "nested", name: "Nested" }]}
                columns={[
                  { key: "name", dataIndex: "name", title: "Nested name" },
                ]}
                pagination={false}
                expandable={{
                  defaultExpandedRowKeys: ["nested"],
                  expandedRowRender: () => "Nested detail",
                }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      Nested total
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </ConfigProvider>
          )}
        />
      );
      expect(part("detail-row")).toBeNull();
      const expand = within(part("expand-cell")!).getByRole("button", {
        name: defaultLabels.expandRow,
      });
      fireEvent.click(expand);
      await waitFor(() =>
        expect(part("detail-cell")).toHaveTextContent("Nested total")
      );
      expect(expand).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText("Nested total").closest("tfoot")
      ).not.toHaveAttribute("data-adapttable-part");
      expect(
        screen
          .getByRole("table", { name: "Plain nested table" })
          .querySelector("[data-adapttable-part]")
      ).toBeNull();
      expect(
        screen.getByText("Nested detail").closest("tr")
      ).not.toHaveAttribute("data-adapttable-part");
      fireEvent.click(expand);
      expect(expand).toHaveAttribute("aria-expanded", "false");
    }
  );

  it("keeps the resize hook on the named keyboard control", () => {
    const onLayout = vi.fn();
    renderAntd(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile={false}
        resizableColumns
        onColumnLayoutChange={onLayout}
      />
    );
    const handle = screen.getByRole("button", { name: "Resize column: Name" });
    expect(part("resize-handle")).toBe(handle);
    expect(handle).toHaveAttribute("tabindex", "0");
    const header = handle.closest("th")!;
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 120, 32)
    );
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onLayout).toHaveBeenLastCalledWith(
      expect.objectContaining({ widths: { name: 136 } })
    );
  });

  it("names the actual search input, affix wrapper and icon holder", async () => {
    renderAntd(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile={false}
      />
    );
    const input = screen.getByRole("searchbox", { name: defaultLabels.search });
    expect(part("search")).toBe(input);
    expect(part("search-field")).toHaveClass("ant-input-affix-wrapper");
    expect(part("search-field")).toContainElement(input);
    expect(part("search-icon")).toHaveClass("ant-input-prefix");
    expect(part("search-icon")?.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    fireEvent.change(input, { target: { value: "Alan" } });
    await waitFor(() => expect(parts("row")).toHaveLength(1));
    expect(part("row")).toHaveTextContent("Alan");
  });

  it("names the chip list, list items and live removal controls", () => {
    const onRemove = vi.fn();
    const onClear = vi.fn();
    renderAntd(
      <Chips
        chips={[{ key: "status", label: "Active", onRemove }]}
        onClearAll={onClear}
        labels={defaultLabels}
      />
    );
    expect(part("chips")?.tagName).toBe("UL");
    expect(parts("chip").map((chip) => chip.tagName)).toEqual(["LI", "LI"]);
    const remove = screen.getByRole("button", {
      name: defaultLabels.removeFilter("Active"),
    });
    const clear = screen.getByRole("button", { name: defaultLabels.clearAll });
    expect(parts("chip-remove")).toEqual([remove, clear]);
    expect(remove).toHaveAttribute("tabindex", "0");
    expect(part("chip")).toContainElement(remove);
    fireEvent.keyDown(remove, { key: "Enter" });
    expect(onRemove).toHaveBeenCalledTimes(1);
    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("names the card's native field rows, labels and action strip, including summaries", () => {
    const action = vi.fn();
    renderAntd(
      <DataTable
        data={[ROWS[0]!]}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile
        summaryRow={() => ({ name: "1 person" })}
        rowActions={[{ key: "open", label: "Open", onClick: action }]}
      />
    );
    const card = part("card")!;
    const summary = part("summary-card")!;
    for (const root of [card, summary]) {
      expect(part("card-row", root)?.tagName).toBe("TR");
      expect(part("card-row", root)).toHaveClass("ant-descriptions-row");
      expect(part("card-label", root)).toHaveClass(
        "ant-descriptions-item-label"
      );
      expect(part("card-label", root)).toHaveTextContent("Name");
    }
    expect(part("card-row", summary)).toHaveTextContent("1 person");
    expect(part("card-actions", card)).toHaveClass("ant-space");
    fireEvent.click(
      within(part("card-actions", card)!).getByRole("button", { name: "Open" })
    );
    expect(action).toHaveBeenCalledWith(ROWS[0]);
  });

  it("names the native empty and error surfaces while retaining retry", () => {
    const empty = renderAntd(
      <DataTable
        data={[]}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile={false}
      />
    );
    expect(part("empty")).toHaveClass("ant-empty");
    expect(part("empty")).toHaveTextContent(defaultLabels.noData);
    empty.unmount();
    const retry = vi.fn();
    renderAntd(
      <ErrorState
        error={new Error("Failed to load")}
        labels={defaultLabels}
        onRetry={retry}
      />
    );
    expect(part("error")).toHaveClass("ant-alert");
    expect(part("error")).toHaveTextContent("Failed to load");
    fireEvent.click(
      within(part("error")!).getByRole("button", { name: defaultLabels.retry })
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
