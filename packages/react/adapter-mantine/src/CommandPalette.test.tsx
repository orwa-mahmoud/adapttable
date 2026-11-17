import { xlsxWriter } from "@adapttable/react/xlsx";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
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
describe("command palette (mantine)", () => {
  const onPrint = vi.fn();
  const table = (extra?: Record<string, unknown>) =>
    render(
      <MantineProvider>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          commandPalette
          onPrint={onPrint}
          {...extra}
        />
      </MantineProvider>
    );

  const palette = () =>
    document.querySelector('[data-adapttable-part="command-palette"]');
  // Scoped by part: a table renders its own comboboxes, so the role alone
  // is ambiguous.

  it("names the export entry after the writer", () => {
    table({ exportCsv: { writer: xlsxWriter() } });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(
      screen.getByRole("option", { name: "Export XLSX" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Export CSV" })).toBeNull();
  });

  it("binds nothing when the prop is absent", () => {
    table({ commandPalette: undefined });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(palette()).toBeNull();
  });
});
