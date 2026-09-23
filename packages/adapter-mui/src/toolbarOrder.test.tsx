/**
 * Where MUI's undo and redo sit among the toolbar extras.
 *
 * MUI's `editHistory()` draws the controls itself; every kit puts them after
 * Print, and so does this one.
 */
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import { densityChooser } from "./density";
import { editHistory, editing } from "./editing";
import { exportCsv } from "./export";
import type { ColumnDef } from "./index";
import { print } from "./print";
import { renderMui } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", editable: true },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`)!;

const follows = (later: HTMLElement, earlier: HTMLElement) =>
  Boolean(
    earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING
  );

describe("MUI toolbar order", () => {
  it("draws undo and redo after export and print", () => {
    renderMui(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        features={[
          editHistory(),
          densityChooser(),
          exportCsv(),
          print(vi.fn(), true),
          editing(vi.fn()),
        ]}
      />
    );

    expect(follows(part("undo-button"), part("export-csv-button"))).toBe(true);
    expect(follows(part("undo-button"), part("print-button"))).toBe(true);
    expect(follows(part("redo-button"), part("undo-button"))).toBe(true);
  });
});
