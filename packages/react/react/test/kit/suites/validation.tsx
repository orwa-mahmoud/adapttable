import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { act, fireEvent, screen } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `validation.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function validationTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it }) => {
    interface Task {
      id: string;
      title: string;
      start: number;
      end: number;
    }

    const TASKS: Task[] = [{ id: "1", title: "Ship", start: 3, end: 9 }];

    const COLS: ColumnDef<Task>[] = [
      {
        key: "title",
        header: "Title",
        accessor: (r) => r.title,
        editable: true,
        validate: (value) =>
          String(value).trim() === "" ? "A title is required" : undefined,
      },
      {
        key: "end",
        header: "End",
        accessor: (r) => r.end,
        editable: true,
        editor: "number",
      },
    ];

    const part = (name: string) =>
      document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
    const editor = () => part("edit-cell-editor")!;

    /**
     * Validation through the table.
     *
     * The promise is narrow and worth testing exactly: a rejected value never
     * reaches `onCellEdit`, the editor stays open holding what the reader typed, and
     * the message is announced rather than only painted.
     */
    describe(`edit validation (${kit.name})`, () => {
      const table = (extra?: Record<string, unknown>) => {
        const onCellEdit = vi.fn();
        render(
          <DataTable
            data={TASKS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            onCellEdit={onCellEdit}
            {...extra}
          />
        );
        return { onCellEdit };
      };
      const openFirstEditor = () => {
        fireEvent.doubleClick(part("edit-cell-activate")!);
      };
      /** Press Enter and let the validators settle — a validated column awaits. */
      const commit = async () => {
        await act(async () => {
          fireEvent.keyDown(editor(), { key: "Enter" });
          await Promise.resolve();
        });
      };

      it("commits a value that passes, exactly as before", async () => {
        const { onCellEdit } = table();
        openFirstEditor();
        fireEvent.change(editor(), { target: { value: "Ship it" } });
        await commit();
        expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
          TASKS[0],
          "title",
          "Ship it"
        );
        expect(part("edit-cell-error")).toBeNull();
      });

      it("marks the cell busy while an async check runs", async () => {
        let settle: ((message?: string) => void) | undefined;
        const { onCellEdit } = table({
          columns: [
            {
              key: "title",
              header: "Title",
              accessor: (r: Task) => r.title,
              editable: true,
              validate: () =>
                new Promise<string | undefined>((resolve) => {
                  settle = resolve;
                }),
            },
          ],
        });
        openFirstEditor();
        fireEvent.change(editor(), { target: { value: "Taken" } });
        fireEvent.keyDown(editor(), { key: "Enter" });
        expect(editor()).toHaveAttribute("aria-busy", "true");
        expect(onCellEdit).not.toHaveBeenCalled();

        await act(async () => {
          settle?.(undefined);
          await Promise.resolve();
        });
        expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
          TASKS[0],
          "title",
          "Taken"
        );
      });

      it("gates on a rule no single cell can answer", async () => {
        const { onCellEdit } = table({
          validateRow: (row: Task) =>
            row.end <= row.start
              ? "The end must come after the start"
              : undefined,
        });
        // Edit the END column: a row rule fires on whichever cell was edited.
        const activates = document.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="edit-cell-activate"]'
        );
        fireEvent.doubleClick(activates[1]!);
        fireEvent.change(editor(), { target: { value: "1" } });
        await act(async () => {
          fireEvent.keyDown(editor(), { key: "Enter" });
          await Promise.resolve();
        });
        expect(onCellEdit).not.toHaveBeenCalled();
        expect(
          screen.getByText("The end must come after the start")
        ).toBeVisible();
      });
    });
  });
}
