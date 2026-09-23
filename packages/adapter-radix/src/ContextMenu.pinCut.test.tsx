/**
 * Pin and Cut in the context menu.
 *
 * Pin to top / Pin to bottom / Unpin appear on a row's menu when
 * `rowPinning()` is composed; Cut appears on a cell when cell navigation and
 * `onCellCut` are both wired, and asks the host only after the clipboard took
 * the text.
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderRadix as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Zoe" },
  { id: "2", name: "Ada" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const cellOf = (text: string) => screen.getByText(text).closest("td")!;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("context menu pin and cut (radix)", () => {
  it("pins a row to the top from its menu", () => {
    const onPinnedRowIdsChange = vi.fn();
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        contextMenu
        onPinnedRowIdsChange={onPinnedRowIdsChange}
      />
    );

    fireEvent.contextMenu(cellOf("Ada"), { clientX: 5, clientY: 5 });
    expect(screen.getByText("Pin to bottom")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pin to top"));

    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: ["2"] })
    );
  });

  it("pins a row to the bottom from its menu", () => {
    const onPinnedRowIdsChange = vi.fn();
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        contextMenu
        onPinnedRowIdsChange={onPinnedRowIdsChange}
      />
    );

    fireEvent.contextMenu(cellOf("Zoe"), { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByText("Pin to bottom"));

    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith({
      top: [],
      bottom: ["1"],
    });
    expect(
      document.querySelector('[data-adapttable-part="pinned-bottom"]')
    ).toHaveTextContent("Zoe");
    expect(
      document.querySelector('[data-adapttable-part="context-menu"]')
    ).toBeNull();
  });

  it.each([
    ["the menu key", { key: "ContextMenu" }],
    ["Shift+F10", { key: "F10", shiftKey: true }],
  ])("opens from %s and walks to an entry by keyboard", async (_, open) => {
    const onPinnedRowIdsChange = vi.fn();
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        contextMenu
        onPinnedRowIdsChange={onPinnedRowIdsChange}
      />
    );

    fireEvent.keyDown(cellOf("Ada"), open);
    const menu = document.querySelector<HTMLElement>(
      '[data-adapttable-part="context-menu"]'
    )!;
    // Radix focuses the menu itself on open; ArrowDown enters its items.
    expect(document.activeElement).toBe(menu);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    const first = document.activeElement as HTMLElement;
    expect(first).toHaveTextContent("Copy");
    fireEvent.keyDown(first, { key: "ArrowDown" });
    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent("Pin to top");
    });
    const entry = document.activeElement as HTMLElement;
    expect(entry).toHaveAttribute("role", "menuitem");
    fireEvent.keyDown(entry, { key: "Enter" });

    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith({
      top: ["2"],
      bottom: [],
    });
    expect(
      document.querySelector('[data-adapttable-part="pinned-top"]')
    ).toHaveTextContent("Ada");
  });

  it("offers no pin entries without row pinning", () => {
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        contextMenu
      />
    );

    fireEvent.contextMenu(cellOf("Ada"), { clientX: 5, clientY: 5 });
    expect(screen.queryByText("Pin to top")).toBeNull();
  });

  it("cuts the right-clicked cell, then asks the host to clear it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const onCellCut = vi.fn();
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        contextMenu
        cellNavigation
        onCellCut={onCellCut}
      />
    );

    fireEvent.contextMenu(cellOf("Ada"), { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByText("Cut"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledExactlyOnceWith("Ada");
    });
    await waitFor(() => {
      expect(onCellCut).toHaveBeenCalledTimes(1);
    });
  });

  it("offers no Cut without onCellCut", () => {
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        contextMenu
        cellNavigation
      />
    );

    fireEvent.contextMenu(cellOf("Ada"), { clientX: 5, clientY: 5 });
    expect(screen.queryByText("Cut")).toBeNull();
  });
});
