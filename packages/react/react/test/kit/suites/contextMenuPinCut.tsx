import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `ContextMenu.pinCut.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function contextMenuPinCutTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    /**
     * Pin and Cut in the context menu.
     *
     * Pin to top / Pin to bottom / Unpin appear on a row's menu when
     * `rowPinning()` is composed; Cut appears on a cell when cell navigation and
     * `onCellCut` are both wired, and asks the host only after the clipboard took
     * the text.
     */

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

    describe(`context menu pin and cut (${kit.name})`, () => {
      it("pins a row to the top from its menu", () => {
        const onPinnedRowIdsChange = vi.fn();
        render(
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
        render(
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
        render(
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
        render(
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
  });
}
