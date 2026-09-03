import {
  type TableSourceCapabilities,
  useFrontendData,
} from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
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
const CLAIMS_ALL: TableSourceCapabilities = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: true,
  exportScope: "all",
  totalCount: "exact",
};
const EXPORT_REASON = "All rows need a retrieval route.";

function ClaimedAllWithoutRows() {
  const frontend = useFrontendData({ data: ROWS, columns: COLS });
  const source = {
    ...frontend,
    allFilteredRows: undefined,
    capabilities: CLAIMS_ALL,
  };
  return (
    <MantineProvider>
      <BareDataTable
        source={source}
        columns={COLS}
        rowKey={(row) => row.id}
        urlSync={false}
        labels={{ noticeExportAllPage: EXPORT_REASON }}
        features={[exportCsv<Row>({ scope: "all" })]}
      />
    </MantineProvider>
  );
}

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
describe("toolbar extras (mantine)", () => {
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
      <MantineProvider>
        <BareDataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          onDensityChange={vi.fn()}
          features={features as never}
        />
      </MantineProvider>
    );

  it("draws no optional control until one is composed", () => {
    table();

    expect(document.querySelector("table")).not.toBeNull();
    expect(part("print-button")).toBeNull();
    expect(part("density-toggle")).toBeNull();
    expect(part("fullscreen-toggle")).toBeNull();
    expect(part("undo-button")).toBeNull();
    expect(part("redo-button")).toBeNull();
    expect(part("export-csv-button")).toBeNull();
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
    expect(part("export-csv-button")).not.toBeNull();
  });

  it("disables export with the localized reason when no route exists", () => {
    render(<ClaimedAllWithoutRows />);
    const button = screen.getByRole("button", { name: /export/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", EXPORT_REASON);
  });
});
