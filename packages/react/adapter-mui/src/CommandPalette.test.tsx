import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { commandPaletteTests } from "../../react/test/kit/suites/commandPalette";
import { commandPalette } from "./command-palette";
import { DataTable, kit } from "./data-table.test-utils";
import { DataTable as BareDataTable } from "./DataTable";
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
describe("command palette (mui)", () => {
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
          features={[commandPalette()]}
          onPrint={onPrint}
          {...extra}
        />
      </>
    );

  /**
   * No features composed. This one renders the shipped component rather than
   * the harness above, which exists to compose features from props — the very
   * thing an absence test must not do.
   */
  const bare = (extra?: Record<string, unknown>) =>
    render(
      <BareDataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        {...extra}
      />
    );

  const palette = () =>
    document.querySelector('[data-adapttable-part="command-palette"]');
  // Scoped by part: a table renders its own comboboxes, so the role alone
  // is ambiguous.

  it("names the dialog, not MUI's presentation wrapper", () => {
    table();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    // MUI spreads unrecognised props onto its Modal root and marks that root
    // `role="presentation"`, which discards a name left there. The paper is
    // the node carrying `role="dialog"`.
    expect(
      screen.getByRole("dialog", { name: "Command palette" })
    ).toBeVisible();
  });

  it("binds nothing when the feature is not composed", () => {
    bare({ commandPalette: true });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(palette()).toBeNull();
  });
});
