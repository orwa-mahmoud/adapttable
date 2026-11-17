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

import { contextMenuPinCutTests } from "../../react/test/kit/suites/contextMenuPinCut";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderBaseUi as renderKit } from "./test-utils";

for (const test of contextMenuPinCutTests(kit)) it(test.name, test.run);

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
  ])("opens from %s with focus on its first entry", async (_, open) => {
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
    const items = screen.getAllByRole("menuitem");
    await waitFor(() => {
      expect(document.activeElement).toBe(items[0]);
    });
    expect(items[0]).toHaveTextContent("Copy");
    const entry = screen.getByRole("menuitem", { name: "Pin to top" });
    // A native button: Enter and Space activate it as a click, which jsdom
    // does not synthesize from the key.
    expect(entry.tagName).toBe("BUTTON");
    fireEvent.click(entry);

    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith({
      top: ["2"],
      bottom: [],
    });
    expect(
      document.querySelector('[data-adapttable-part="pinned-top"]')
    ).toHaveTextContent("Ada");
  });
});
