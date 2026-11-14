import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { commandPaletteTests } from "../../react/test/kit/suites/commandPalette";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of commandPaletteTests(kit)) it(test.name, test.run);

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * The palette, opened the way a user opens it.
 *
 * A palette whose shortcut was never bound simply never appears — nothing
 * on screen is missing, and no error is thrown. Only pressing the chord
 * against a real table says whether it is wired.
 */
describe("command palette (antd)", () => {
  const onPrint = vi.fn();
  const table = (extra?: Record<string, unknown>) =>
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          commandPalette
          onPrint={onPrint}
          {...extra}
        />
      </>
    );

  const palette = () =>
    document.querySelector('[data-adapttable-part="command-palette"]');
  // Scoped by part: a table renders its own comboboxes, so the role alone
  // is ambiguous.

  it("binds nothing when the prop is absent", () => {
    table({ commandPalette: undefined });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(palette()).toBeNull();
  });
});
