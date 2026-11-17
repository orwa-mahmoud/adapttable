import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { fireEvent } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `CommandPalette.trigger.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function commandPaletteTriggerTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * Opening the command palette from a control.
     *
     * `button: true` draws the kit's own toolbar button; `open` and
     * `onOpenChange` hand the state to the host.
     */

    interface Row {
      id: string;
      name: string;
    }

    const ROWS: Row[] = [{ id: "1", name: "Ada" }];
    const COLS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
    ];

    const part = (name: string) =>
      document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

    describe(`command palette trigger (${kit.name})`, () => {
      it("draws a toolbar control that opens the palette", () => {
        render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            commandPalette={{ button: true }}
          />
        );

        const button = part("command-palette-button")!;
        expect(button).toHaveTextContent("Command palette");
        expect(button).toHaveAttribute("aria-expanded", "false");
        expect(part("command-palette")).toBeNull();

        fireEvent.click(button);

        expect(part("command-palette")).not.toBeNull();
        expect(part("command-palette-button")).toHaveAttribute(
          "aria-expanded",
          "true"
        );
      });

      it("draws no control without button: true", () => {
        render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            commandPalette
          />
        );

        expect(part("command-palette-button")).toBeNull();
      });

      it("hands a controlled palette's state to the host", () => {
        const onOpenChange = vi.fn();
        const view = render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            commandPalette={{ button: true, open: false, onOpenChange }}
          />
        );

        fireEvent.click(part("command-palette-button")!);
        expect(onOpenChange).toHaveBeenCalledWith(true);
        expect(part("command-palette")).toBeNull();

        view.unmount();
        render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            commandPalette={{ open: true, onOpenChange }}
          />
        );
        expect(part("command-palette")).not.toBeNull();
      });
    });
  });
}
