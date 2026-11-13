import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import {
  type ColumnDef,
  type DirtyEdits,
  type EditHistoryHandle,
} from "@adapttable/react";
import { type CellRange } from "@adapttable/react/adapter";
import { act, fireEvent } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `hostCallbacks.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function hostCallbacksTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { Table: DataTable, render } = kit;
  const { cellNavigation, dirtyIndicators, editHistory, editing } =
    kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The host callbacks on the owning features, fired by a real table: the edit
     * history handle, the unsaved-edit count and the selected cell range.
     */

    interface Row {
      id: string;
      name: string;
    }

    const ROWS: Row[] = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Grace" },
    ];
    const COLS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
      { key: "id", header: "Id", accessor: (r) => r.id },
    ];

    const gridCell = (row: number, col: number) =>
      document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;

    /** Open the first editable cell, type, and commit with Enter. */
    function editFirstCell(value: string) {
      fireEvent.doubleClick(
        document.querySelector<HTMLElement>(
          '[data-adapttable-part="edit-cell-activate"]'
        )!
      );
      const editor = document.querySelector<HTMLElement>(
        '[data-adapttable-part="edit-cell-editor"]'
      )!;
      fireEvent.change(editor, { target: { value } });
      fireEvent.keyDown(editor, { key: "Enter" });
    }

    /** An edit commits through the async save path; let it settle. */
    const settle = () => act(() => Promise.resolve());

    /**
     * Every callback composed on one table, as a host wires them: each test reads
     * the one it is about.
     */
    function table(
      commit: (row: Row, key: string, next: unknown) => unknown,
      markers = true
    ) {
      const history: EditHistoryHandle[] = [];
      const dirty: DirtyEdits[] = [];
      const onRangeChange = vi.fn<(range: CellRange | null) => void>();
      render(
        <DataTable<Row>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile={false}
          features={[
            editing<Row>(commit, {
              onDirtyChange: (next: DirtyEdits) => dirty.push(next),
            }),
            ...(markers ? [dirtyIndicators()] : []),
            editHistory({ onChange: (next) => history.push(next) }),
            cellNavigation({ onRangeChange }),
          ]}
        />
      );
      return { history, dirty, onRangeChange };
    }

    describe(`host callbacks (${kit.name})`, () => {
      it("hands the host an edit history whose undo restores the value", async () => {
        const commit = vi.fn();
        const { history } = table(commit);
        expect(history.at(-1)?.canUndo).toBe(false);

        editFirstCell("Augusta");
        await settle();
        expect(commit).toHaveBeenLastCalledWith(ROWS[0], "name", "Augusta");
        expect(history.at(-1)?.canUndo).toBe(true);

        act(() => {
          history.at(-1)?.undo();
        });
        await settle();
        expect(commit).toHaveBeenLastCalledWith(ROWS[0], "name", "Ada");
        expect(history.at(-1)?.canRedo).toBe(true);
      });

      it("reports the unsaved-edit count, and confirmAll clears it", async () => {
        const { dirty } = table(() => new Promise<void>(() => undefined));
        expect(dirty.at(-1)?.count).toBe(0);

        editFirstCell("Augusta");
        await settle();
        expect(dirty.at(-1)?.count).toBe(1);
        expect(
          document.querySelector('[data-adapttable-part="row"][data-dirty]')
        ).not.toBeNull();

        act(() => {
          dirty.at(-1)?.confirmAll();
        });
        expect(dirty.at(-1)?.count).toBe(0);
        expect(document.querySelector("[data-dirty]")).toBeNull();
      });

      it("tracks the unsaved-edit count without dirtyIndicators(), drawing no marks", async () => {
        const { dirty } = table(
          () => new Promise<void>(() => undefined),
          false
        );
        expect(dirty.at(-1)?.count).toBe(0);

        editFirstCell("Augusta");
        await settle();
        expect(dirty.at(-1)?.count).toBe(1);
        expect(document.querySelector("[data-dirty]")).toBeNull();

        act(() => {
          dirty.at(-1)?.confirmAll();
        });
        expect(dirty.at(-1)?.count).toBe(0);
      });

      it("reports the range Shift+Arrow selects from a focused cell", () => {
        const { onRangeChange } = table(vi.fn());
        expect(onRangeChange).toHaveBeenLastCalledWith(null);

        act(() => gridCell(0, 0).focus());
        fireEvent.keyDown(gridCell(0, 0), { key: "ArrowDown", shiftKey: true });
        expect(onRangeChange).toHaveBeenLastCalledWith({
          anchor: { row: 0, col: 0 },
          head: { row: 1, col: 0 },
        });

        fireEvent.keyDown(gridCell(1, 0), {
          key: "ArrowRight",
          shiftKey: true,
        });
        expect(onRangeChange).toHaveBeenLastCalledWith({
          anchor: { row: 0, col: 0 },
          head: { row: 1, col: 1 },
        });
      });
    });
  });
}
