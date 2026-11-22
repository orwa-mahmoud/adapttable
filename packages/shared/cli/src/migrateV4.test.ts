import { describe, expect, it } from "vitest";

import { migrateV4Source } from "./migrateV4";

describe("migrateV4Source", () => {
  it("moves binding machinery off core's main entry and keeps table names", () => {
    const result = migrateV4Source(
      'import { createTableEngine, insertExtraRows, type BodyCell } from "@adapttable/core";\n'
    );
    expect(result.code).toBe(
      'import { createTableEngine } from "@adapttable/core";\n' +
        'import { insertExtraRows, type BodyCell } from "@adapttable/core/binding";\n'
    );
    expect(result.movedImports).toBe(2);
    expect(result.issues).toEqual([]);
  });

  it("sends a specialty name to its focused entry, not the binding one", () => {
    expect(
      migrateV4Source(
        'import { createCellEditSession, pivot } from "@adapttable/core";'
      ).code
    ).toBe(
      'import { createCellEditSession } from "@adapttable/core/editing";\nimport { pivot } from "@adapttable/core/pivot";'
    );
  });

  it("moves React kit machinery to the adapter entry", () => {
    const result = migrateV4Source(
      'import { DataTable, useTableChrome } from "@adapttable/react";'
    );
    expect(result.code).toBe(
      'import { DataTable } from "@adapttable/react";\nimport { useTableChrome } from "@adapttable/react/adapter";'
    );
  });

  it("splits the i18n root into the catalog, one language and the root", () => {
    const result = migrateV4Source(
      'import { getDirection, getLabels, ar, zhTW } from "@adapttable/i18n";\n' +
        'import { loadLabels } from "@adapttable/i18n/load";\n'
    );
    expect(result.code).toBe(
      'import { getDirection } from "@adapttable/i18n";\n' +
        'import { getLabels } from "@adapttable/i18n/catalog";\n' +
        'import { ar } from "@adapttable/i18n/locales/ar";\n' +
        'import { zhTW } from "@adapttable/i18n/locales/zh-TW";\n' +
        'import { loadLabels } from "@adapttable/i18n";\n'
    );
  });

  it("renames in place and keeps the name the file uses", () => {
    expect(
      migrateV4Source(
        'import { parseTableQuery, splitFilterValues } from "@adapttable/server";'
      ).code
    ).toBe(
      'import { parseTableQuery, splitListParam as splitFilterValues } from "@adapttable/server";'
    );
    expect(
      migrateV4Source(
        'import { splitFilterValues as split } from "@adapttable/server";'
      ).code
    ).toBe('import { splitListParam as split } from "@adapttable/server";');
    expect(
      migrateV4Source('import { sameRows } from "@adapttable/core/binding";')
        .code
    ).toBe('import { sameItems as sameRows } from "@adapttable/core/binding";');
  });

  it("redirects a Vue kit's CSV entry and moves Angular's export forwards", () => {
    expect(
      migrateV4Source(
        'import { exportCsv } from "@adapttable/vue-unstyled/export-csv";'
      ).code
    ).toBe('import { exportCsv } from "@adapttable/vue-unstyled/export";');
    expect(
      migrateV4Source(
        'import { exportPdf, selectionStats } from "@adapttable/angular/features";'
      ).code
    ).toBe(
      'import { selectionStats } from "@adapttable/angular/features";\nimport { exportPdf } from "@adapttable/angular/pdf";'
    );
    expect(
      migrateV4Source(
        'import { columnSelectionCheckbox } from "@adapttable/nuxt-ui/cell-navigation";'
      ).code
    ).toBe(
      'import { columnSelectionCheckbox } from "@adapttable/nuxt-ui/column-selection";'
    );
  });

  it("reports what changed meaning and writes nothing for it", () => {
    const source = [
      "<DataTable data={rows} mobileIdentityColumns={2} />;",
      "const key = groupRowSlotKey();",
      "const labels = { noticeReorderNested: 'x' };",
      "useExportHandler(run);",
    ].join("\n");
    const result = migrateV4Source(source);
    expect(result.changed).toBe(false);
    expect(result.code).toBe(source);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2, 3, 4]);
    expect(result.issues[0]?.message).toContain("hideOnMobile");
  });

  it("reports a table's server props and leaves a server source's options alone", () => {
    const source = [
      "const source = useServerData({ rows, total: 3, onQueryChange: fetch });",
      '<DataTable data={rows} total={total} onQueryChange={fetch} mode="server" />;',
      '<adapt-data-table [data]="rows()" [onQueryChange]="load" [supports]="caps" />',
      '<DataTable :data="rows" :total="total" @query-change="load" />',
      "type Props = DataTableProps<Row> & DataModeProps<Row>;",
    ].join("\n");
    const result = migrateV4Source(source);
    expect(result.changed).toBe(false);
    const reported = (line: number) =>
      result.issues
        .filter((issue) => issue.line === line)
        .map((issue) => issue.message.split(":")[0] ?? "")
        .sort((a, b) => a.localeCompare(b));
    // The server source's own options are not table props.
    expect(reported(1)).toEqual([]);
    expect(reported(2)).toEqual([
      "A table takes no mode",
      "A table's onQueryChange moved",
      "If this is a table prop",
    ]);
    expect(reported(3)).toEqual([
      "A table's onQueryChange moved",
      "If this is a table prop",
    ]);
    expect(reported(4)).toEqual([
      "A table's onQueryChange moved",
      "If this is a table prop",
    ]);
    expect(reported(5)).toEqual([
      "DataModeProps was removed; DataTableProps is DataTablePropsBase.",
    ]);
  });

  it("reports the chrome order constant and the history gate", () => {
    const result = migrateV4Source(
      [
        "const order = CHROME_EXTRA_SLOT_ORDER;",
        "<HistoryLiveGate shell={shell}>{render}</HistoryLiveGate>;",
      ].join("\n")
    );
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2, 2]);
    expect(result.issues[1]?.message).toContain("EDIT_HISTORY_STAGE");
  });

  it("reports the cell wrappers with their replacements", () => {
    const result = migrateV4Source(
      [
        "<OptionalEditableCell {...cell} />;",
        "<OptionalTreeToggle {...toggle} />;",
      ].join("\n")
    );
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining("CellContent"),
      expect.stringContaining("FeatureSlot"),
    ]);
  });

  it("reports the Vue shell's toolbar fields with their replacement", () => {
    const result = migrateV4Source(
      [
        "const props = shell.toolbarExtrasProps.value;",
        "if (shell.hasActionToolbar.value) draw();",
      ].join("\n")
    );
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2]);
    expect(result.issues[0]?.message).toContain("toolbarEntry");
  });

  it("reports the React toolbar's removed menu props and chrome type", () => {
    const result = migrateV4Source(
      [
        "type Props = ToolbarChromeProps<Row>;",
        "<>{props.savedViewsMenu}{props.columnMenu}</>;",
        "const features = [columnMenu()];",
      ].join("\n")
    );
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2, 2]);
  });

  it("reports the Angular view's toolbar fields", () => {
    const result = migrateV4Source(
      [
        '<ng-container [adaptSlotProps]="v.toolbarExtras()" />',
        "@if (v.savedViews; as savedViews) {}",
        '<x [p]="v.columnMenuProps()" />',
      ].join("\n")
    );
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2, 3]);
    expect(result.issues[0]?.message).toContain("toolbarEntry");
  });

  it("reports the chrome's filter chips and the scroll reset's chrome argument", () => {
    const result = migrateV4Source(
      [
        "const count = chrome.activeFilterCount;",
        "useChromeScrollReset(ref, chrome, props);",
      ].join("\n")
    );
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2]);
  });

  it("reports the chrome's editing and edit history", () => {
    const result = migrateV4Source(
      [
        "const editing = view.chrome.editing;",
        "const history = chrome.editHistory;",
        "const rows = chrome.editingRows;",
        "const detail = chrome.detail;",
        "const pins = chrome.rowPinning;",
        "const grouped = view.chrome.grouping;",
        "const panel = chrome.groupingPanel;",
      ].join("\n")
    );
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2, 4, 5, 6]);
  });

  it("leaves a file that uses nothing v4 moved untouched", () => {
    const source = 'import { DataTable } from "@adapttable/mui";\n';
    expect(migrateV4Source(source)).toEqual({
      code: source,
      changed: false,
      movedImports: 0,
      issues: [],
    });
  });
});
