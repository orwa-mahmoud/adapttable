import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { fireEvent } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `CommandPalette.search.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function commandPaletteSearchTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * Searching inside the palette, and what it says when nothing matches.
     *
     * The search box, the highlighted entry and the empty message are three kit
     * components core never draws. A kit that forgets to pass the typed value
     * through still opens a palette — it just never narrows.
     */

    interface Row {
      id: string;
      name: string;
    }

    const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
    const COLS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
    ];

    const part = (name: string) =>
      document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

    function openPalette(): HTMLElement {
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          commandPalette
          onPrint={vi.fn()}
        />
      );
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      const input = part("command-input");
      if (!input) throw new Error("the palette never opened");
      return input;
    }

    const entryLabels = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="command-item"]'
        ),
      ].map((item) => item.textContent ?? "");

    describe(`command palette search (${kit.name})`, () => {
      it("narrows the list to what was typed", () => {
        const input = openPalette();
        expect(entryLabels().length).toBeGreaterThan(1);

        fireEvent.change(input, { target: { value: "print" } });

        expect(entryLabels()).toEqual(["Print"]);
      });

      it("says so when nothing matches instead of showing an empty box", () => {
        const input = openPalette();
        fireEvent.change(input, { target: { value: "zzzz" } });

        expect(entryLabels()).toEqual([]);
        expect(part("command-empty")?.textContent ?? "").not.toBe("");
      });

      it("marks the entry Enter would run", () => {
        const input = openPalette();
        fireEvent.change(input, { target: { value: "print" } });

        const active = document.querySelector<HTMLElement>(
          '[data-adapttable-part="command-item"][aria-selected="true"]'
        );
        expect(active?.textContent).toBe("Print");
      });
    });
  });
}
