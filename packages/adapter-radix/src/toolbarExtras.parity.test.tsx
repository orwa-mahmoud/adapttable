import { Theme } from "@radix-ui/themes";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable as BareDataTable } from "./DataTable";
import { densityChooser } from "./density";
import { editHistory, undoRedoButtons } from "./editing";
import { exportCsv } from "./export";
import { fullscreen } from "./fullscreen";
import type { ColumnDef } from "./index";
import { print } from "./print";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * The optional toolbar controls are absent until their feature is imported.
 *
 * The shipped `DataTable`, not the test harness: the harness converts v2 props
 * into features, which is exactly what must not decide this. Each control comes
 * from its own entry through `TOOLBAR_EXTRAS`, so a table that imports none of
 * them draws none of them — which is what makes the entry, and not a prop, the
 * thing you pay for. v3 removed the props that used to arm these, so there is
 * no second way in to test.
 */
describe("toolbar extras (radix)", () => {
  beforeEach(() => {
    // jsdom reports fullscreen as unavailable, and a toggle for something the
    // browser refuses is correctly not drawn — so the capability is stubbed
    // rather than the assertion softened.
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
    });
  });

  const part = (name: string) =>
    document.querySelector(`[data-adapttable-part="${name}"]`);

  const table = (features?: unknown[]) =>
    render(
      <Theme>
        <BareDataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          onDensityChange={vi.fn()}
          features={features as never}
        />
      </Theme>
    );

  it("draws no optional control until one is composed", () => {
    table();

    expect(document.querySelector("table")).not.toBeNull();
    expect(part("print-button")).toBeNull();
    expect(part("density-toggle")).toBeNull();
    expect(part("fullscreen-toggle")).toBeNull();
    expect(part("undo-button")).toBeNull();
    expect(part("redo-button")).toBeNull();
    // The themed kits render a kit Button here and deliberately do not name
    // it a part (`export-csv-button` is unstyled's native control), so the
    // caption is what identifies it in every kit.
    expect(screen.queryByRole("button", { name: /export/i })).toBeNull();
  });

  it("draws each one once its own feature is composed", () => {
    table([
      exportCsv<Row>(),
      print(vi.fn(), true),
      densityChooser(),
      fullscreen(),
      editHistory(),
      undoRedoButtons(),
    ]);

    expect(part("print-button")).not.toBeNull();
    expect(part("density-toggle")).not.toBeNull();
    expect(part("fullscreen-toggle")).not.toBeNull();
    expect(part("undo-button")).not.toBeNull();
    expect(part("redo-button")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeNull();
  });
});
