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
import { renderBaseUi as renderKit } from "./test-utils";

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

describe("context menu pin and cut (base-ui)", () => {
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
