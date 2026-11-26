/**
 * The export progress surface and the print button, through the toolbar slot.
 */
import {
  ADAPTTABLE_FEATURE_STATE,
  type AdaptTableFeature,
  type ColumnDef,
  createFeatureState,
  EXPORT_TOOLBAR_STATE,
  type ExportCsvOptions,
  type ExportToolbar,
  PRINT_TOOLBAR_STATE,
  type PrintToolbar,
} from "@adapttable/angular";
import {
  type ExportProgressState,
  type ExportTable,
} from "@adapttable/angular/adapter";
import { bulkActions } from "@adapttable/spartan/bulk-actions";
import { exportCsv } from "@adapttable/spartan/export";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { exportPrintTests } from "../../angular/test/kit/suites/exportPrint";
import { kit } from "../testing/kit";
import {
  AdaptExportButton,
  AdaptPrintButton,
} from "./components/toolbarExtras";
import { AdaptDataTable } from "./dataTable";

for (const test of exportPrintTests(kit)) it(test.name, test.run);

const part = (name: string) =>
  document.querySelector<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
  );

const labels = {} as ExportToolbar["labels"];

function exportState(progress: ExportProgressState | null): ExportToolbar {
  return {
    labels,
    onExportCsv: () => undefined,
    exportBusy: false,
    exportStatus: "idle",
    exportAnnouncement: "",
    exportProgressState: progress,
    exportLabel: "Export CSV",
    exportDisabled: false,
    exportDisabledReason: "",
  };
}

/** The state the toolbar controls read, as their features publish it. */
const toolbarState = createFeatureState();
const exporting = signal(exportState(null));
const printing = signal<PrintToolbar>({});
toolbarState.set(EXPORT_TOOLBAR_STATE, exporting);
toolbarState.set(PRINT_TOOLBAR_STATE, printing);

const BUSY: ExportProgressState = {
  status: "busy",
  value: undefined,
  message: "Working",
  error: "",
  downloadUrl: undefined,
  onCancel: () => undefined,
  onRetry: undefined,
  onDismiss: undefined,
};

const FAILED: ExportProgressState = {
  status: "failed",
  value: 10,
  message: "",
  error: "Nope",
  downloadUrl: "blob:file",
  onCancel: undefined,
  onRetry: () => undefined,
  onDismiss: () => undefined,
};

@Component({
  imports: [AdaptExportButton],
  providers: [{ provide: ADAPTTABLE_FEATURE_STATE, useValue: toolbarState }],
  template: `<adapt-export-button [props]="{ labels }" />`,
})
class ExportHost {
  protected readonly labels = labels;
}

@Component({
  imports: [AdaptPrintButton],
  providers: [{ provide: ADAPTTABLE_FEATURE_STATE, useValue: toolbarState }],
  template: `<adapt-print-button [props]="{ labels }" />`,
})
class PrintHost {
  protected readonly labels = labels;
}

describe("export progress", () => {
  it("shows the bar while busy and the recovery actions after failure", () => {
    const cancel = vi.fn();
    const retry = vi.fn();
    const dismiss = vi.fn();
    const fixture = TestBed.createComponent(ExportHost);
    exporting.set(exportState({ ...BUSY, onCancel: cancel }));
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    expect(part("export-progress-bar")?.getAttribute("value")).toBeNull();
    expect(part("export-progress-message")?.textContent).toContain("Working");
    expect(part("export-progress-cancel")).not.toBeNull();
    expect(part("export-progress-dismiss")).toBeNull();
    part("export-progress-cancel")!.click();
    expect(cancel).toHaveBeenCalledOnce();

    exporting.set(exportState({ ...BUSY, value: 40, message: "" }));
    fixture.detectChanges();
    expect(part("export-progress-bar")?.getAttribute("value")).toBe("40");
    expect(part("export-progress-message")).toBeNull();

    exporting.set(
      exportState({ ...FAILED, onRetry: retry, onDismiss: dismiss })
    );
    fixture.detectChanges();
    expect(part("export-progress-bar")).toBeNull();
    expect(part("export-progress-message")?.textContent).toContain("Nope");
    expect(part("export-progress-download")?.getAttribute("href")).toBe(
      "blob:file"
    );
    part("export-progress-retry")!.click();
    part("export-progress-dismiss")!.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });
});

describe("AdaptPrintButton", () => {
  it("renders only when printing is a toolbar action", () => {
    const hidden = TestBed.createComponent(PrintHost);
    printing.set({});
    document.body.append(hidden.nativeElement);
    hidden.detectChanges();
    expect(part("print-button")).toBeNull();
    hidden.destroy();

    const shown = TestBed.createComponent(PrintHost);
    printing.set({ onPrint: () => undefined, printLabel: "Print" });
    document.body.append(shown.nativeElement);
    shown.detectChanges();
    expect(part("print-button")?.textContent?.trim()).toBe("Print");
  });
});

interface ExportCity {
  id: string;
  name: string;
  country: string;
  parentId?: string;
}
const EXPORT_CITIES: ExportCity[] = [
  { id: "1", name: "Dubai", country: "UAE" },
  { id: "2", name: "Amman", country: "Jordan" },
  { id: "3", name: "Cairo", country: "Egypt" },
  { id: "4", name: "Doha", country: "Qatar" },
];
const EXPORT_COLUMNS: ColumnDef<ExportCity>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "country", header: "Country", accessor: (row) => row.country },
];

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows()"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features()"
    [defaults]="{ limit: 2, page: page() }"
    [defaultColumnLayout]="{ hidden: hidden() }"
    [summaryRow]="summary()"
    [urlSync]="false"
    [forceMobile]="false"
  />`,
})
class ExportTableHost {
  readonly rows = input<readonly ExportCity[]>(EXPORT_CITIES);
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly hidden = input<readonly string[]>([]);
  readonly page = input(1);
  readonly summary = input<
    | ((
        rows: readonly ExportCity[]
      ) => Partial<Record<string, string | number>>)
    | undefined
  >();
  readonly columns = EXPORT_COLUMNS;
  readonly rowKey = (row: ExportCity) => row.id;
}

async function mountExport(
  options: ExportCsvOptions<ExportCity>,
  extra: readonly AdaptTableFeature[] = [],
  inputs: {
    rows?: readonly ExportCity[];
    hidden?: readonly string[];
    page?: number;
    summary?: (
      rows: readonly ExportCity[]
    ) => Partial<Record<string, string | number>>;
  } = {}
) {
  const tables: ExportTable[] = [];
  const fixture = TestBed.createComponent(ExportTableHost);
  fixture.componentRef.setInput("features", [
    ...extra,
    exportCsv<ExportCity>({
      ...options,
      writer: {
        extension: "csv",
        build: ({ table }) => {
          tables.push(table);
          return { text: "export", parts: ["export"], mimeType: "text/plain" };
        },
      },
    }),
  ]);
  for (const [key, value] of Object.entries(inputs))
    fixture.componentRef.setInput(key, value);
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:export",
    revokeObjectURL: () => undefined,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined
  );
  document.body.append(fixture.nativeElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const one = <T extends HTMLElement>(name: string): T => {
    const found = element.querySelector<T>(
      `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
    );
    expect(found, name).not.toBeNull();
    return found!;
  };
  return {
    fixture,
    element,
    tables,
    one,
    settle: () => fixture.whenStable(),
    download: async () => {
      one<HTMLButtonElement>("export-csv-button").click();
      await fixture.whenStable();
      await vi.waitFor(() => expect(tables).toHaveLength(1));
      return tables[0]!;
    },
  };
}

describe("the table export context", () => {
  it("exports only the checked row from the actual table", async () => {
    const mounted = await mountExport({ scope: "selected" }, [
      bulkActions([
        { key: "inspect", label: "Inspect", onClick: () => undefined },
      ]),
    ]);
    const box = mounted.element.querySelector<HTMLInputElement>(
      '[data-row-id="2"] [data-spartan-part="checkbox"]'
    );
    expect(box).not.toBeNull();
    box!.click();
    await mounted.settle();
    const table = await mounted.download();
    expect(table.rows).toEqual([["Amman", "Jordan"]]);
  });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
