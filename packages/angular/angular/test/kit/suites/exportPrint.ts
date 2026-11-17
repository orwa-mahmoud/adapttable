import {
  type AdaptTableFeature,
  type ColumnDef,
  type ExportCsvOptions,
} from "@adapttable/angular";
import { type ExportTable } from "@adapttable/angular/adapter";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import { type AngularKitUnderTest, isChecked } from "../kit";

/**
 * The shared `exportPrint.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function exportPrintTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const {
    bulkActions,
    cellNavigation,
    columnMenu,
    exportCsv,
    exportPdf,
    exportXlsx,
    grouping,
    tree,
  } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    /**
     * The export progress surface and the print button, through the toolbar slot.
     */

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
              return {
                text: "export",
                parts: ["export"],
                mimeType: "text/plain",
              };
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
        const found = element.querySelector<T>(kitSelector(name));
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
      it("includes hidden columns in an explicitly all-column file", async () => {
        const mounted = await mountExport({ columns: "all" }, [columnMenu()], {
          hidden: ["country"],
        });
        expect(
          [...mounted.element.querySelectorAll(kitSelector("header-cell"))].map(
            (node) => node.getAttribute("data-column-key")
          )
        ).toEqual(["name"]);
        const table = await mounted.download();
        expect(table.headers).toEqual(["Name", "Country"]);
        expect(table.rows).toEqual([
          ["Dubai", "UAE"],
          ["Amman", "Jordan"],
        ]);
      });

      it("exports a keyboard range from a nonzero page", async () => {
        const mounted = await mountExport(
          { scope: "range" },
          [cellNavigation()],
          {
            page: 2,
          }
        );
        const first = mounted.one<HTMLElement>("cell");
        first.focus();
        await mounted.settle();
        first.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowDown",
            shiftKey: true,
            bubbles: true,
          })
        );
        await mounted.settle();
        const table = await mounted.download();
        expect(table.headers).toEqual(["Name"]);
        expect(table.rows).toEqual([["Cairo"], ["Doha"]]);
      });

      it("carries group rows and the scoped summary into the writer", async () => {
        const mounted = await mountExport({}, [grouping("country")], {
          rows: EXPORT_CITIES.slice(0, 2).map((row) => ({
            ...row,
            country: "UAE",
          })),
          summary: (rows) => ({ name: "Total", country: rows.length }),
        });
        const table = await mounted.download();
        expect(table.rows).toEqual([
          ["", "UAE"],
          ["Dubai", "UAE"],
          ["Amman", "UAE"],
          ["Total", 2],
        ]);
        expect(table.rowMeta?.map((row) => row.role)).toEqual([
          "group",
          "data",
          "data",
          "aggregate",
        ]);
      });

      it("exports collapsed descendants and hierarchy levels for the full tree", async () => {
        const mounted = await mountExport(
          { scope: "all" },
          [
            tree<ExportCity>({
              getParentId: (row) => row.parentId,
              expandedIds: [],
            }),
          ],
          {
            rows: [EXPORT_CITIES[0]!, { ...EXPORT_CITIES[1]!, parentId: "1" }],
          }
        );
        expect(
          mounted.element.querySelectorAll(kitSelector("row"))
        ).toHaveLength(1);
        const table = await mounted.download();
        expect(table.rows).toEqual([
          ["Dubai", "UAE"],
          ["Amman", "Jordan"],
        ]);
        expect(table.rowMeta?.map((row) => row.level)).toEqual([0, 1]);
      });
    });

    /** Read the actual download; jsdom's Blob does not provide arrayBuffer(). */
    function readDownload(blob: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () =>
          reject(
            reader.error ?? new Error("Could not read the export download")
          );
        reader.readAsArrayBuffer(blob);
      });
    }

    async function downloadBinary(
      format: "xlsx" | "pdf",
      columns: "visible" | "all"
    ): Promise<Uint8Array> {
      const blobs: Blob[] = [];
      const downloads: { filename: string; href: string }[] = [];
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: (blob: Blob) => {
          blobs.push(blob);
          return "blob:export";
        },
        revokeObjectURL: () => undefined,
      });
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        function (this: HTMLAnchorElement) {
          downloads.push({ filename: this.download, href: this.href });
        }
      );
      const exportFeature =
        format === "xlsx" ? exportXlsx<ExportCity> : exportPdf<ExportCity>;
      const filename = `selected-cities.${format}`;
      const fixture = TestBed.createComponent(ExportTableHost);
      fixture.componentRef.setInput("hidden", ["country"]);
      fixture.componentRef.setInput("features", [
        columnMenu(),
        bulkActions([
          { key: "inspect", label: "Inspect", onClick: () => undefined },
        ]),
        exportFeature({ scope: "selected", columns, filename }),
      ]);
      document.body.append(fixture.nativeElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(
        [...element.querySelectorAll(kitSelector("header-cell"))].map((node) =>
          node.getAttribute("data-column-key")
        )
      ).toEqual(["name"]);
      const box = element.querySelector<HTMLElement>(
        `[data-row-id="2"] ${kitSelector("checkbox")}`
      );
      expect(box).not.toBeNull();
      expect(isChecked(box!)).toBe(false);
      box!.click();
      await fixture.whenStable();
      expect(isChecked(box!)).toBe(true);
      const button = element.querySelector<HTMLButtonElement>(
        kitSelector("export-csv-button")
      );
      expect(button).not.toBeNull();
      expect(button!.textContent?.trim()).toBe(
        `Export ${format.toUpperCase()}`
      );
      expect(downloads).toEqual([]);
      button!.click();
      await fixture.whenStable();
      await vi.waitFor(() =>
        expect(downloads).toEqual([{ filename, href: "blob:export" }])
      );
      expect(blobs).toHaveLength(1);
      const blob = blobs[0]!;
      expect(blob.type).toBe(
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf"
      );
      await vi.waitFor(() =>
        expect(
          element.querySelector(kitSelector("export-announcer"))?.textContent
        ).toBe("Export complete\u2063")
      );
      return new Uint8Array(await readDownload(blob));
    }

    function workbookRows(bytes: Uint8Array): (string | null)[][] {
      expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
      const text = new TextDecoder().decode(bytes);
      expect(text).toContain("[Content_Types].xml");
      expect(text).toContain("xl/workbook.xml");
      expect(text).toContain("xl/worksheets/sheet1.xml");
      // Core stores worksheet entries uncompressed, so their XML is readable.
      const sheet = /<worksheet\b[\s\S]*?<\/worksheet>/.exec(text);
      expect(sheet).not.toBeNull();
      const document = new DOMParser().parseFromString(sheet![0], "text/xml");
      expect(document.querySelector("parsererror")).toBeNull();
      return [...document.querySelectorAll("sheetData > row")].map((row) =>
        [...row.querySelectorAll("c")].map((cell) => cell.textContent)
      );
    }

    function pdfCells(bytes: Uint8Array): string[] {
      const text = new TextDecoder("latin1").decode(bytes);
      expect(text.startsWith("%PDF-1.4")).toBe(true);
      expect(text).toContain("/Type /Catalog");
      expect(text).toContain("/Title (selected-cities)");
      const trailer = /startxref\n(\d+)\n%%EOF\n$/.exec(text);
      expect(trailer).not.toBeNull();
      const xref = Number(trailer![1]);
      expect(text.slice(xref, xref + 4)).toBe("xref");
      // ActualText marks table cells, excluding the document title and page footer.
      return [
        ...text.matchAll(/\/ActualText <[^>]+> >> BDC\n\(([^)]*)\) Tj/g),
      ].map((match) => match[1]!);
    }

    describe.each(["xlsx", "pdf"] as const)("%s downloads", (format) => {
      it.each(["visible", "all"] as const)(
        "downloads checked rows with %s columns",
        async (columns) => {
          const bytes = await downloadBinary(format, columns);
          const expected =
            columns === "all"
              ? [
                  ["Name", "Country"],
                  ["Amman", "Jordan"],
                ]
              : [["Name"], ["Amman"]];
          if (format === "xlsx") expect(workbookRows(bytes)).toEqual(expected);
          else expect(pdfCells(bytes)).toEqual(expected.flat());
        }
      );
    });

    afterEach(() => {
      document.body.replaceChildren();
      vi.unstubAllGlobals();
    });
  });
}
