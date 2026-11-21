/**
 * The export page, written once for React, Vue and Angular: a grouped sheet
 * that exports as a PDF or through a host-run server job, prints through the
 * browser dialog, and embeds an Arabic face when the page reads right to left.
 * A framework adds only its controls and renderers.
 */
import {
  type ColumnMetadata,
  type ExportAllControls,
  type ExportAllResult,
  type ExportCsvOptions,
  viewFromGroupedEntries,
} from "@adapttable/core";
import { buildGroupedFlatModel } from "@adapttable/core/grouping";
import { pdfWriter, printTable } from "@adapttable/core/pdf";

import { rosterFor } from "../casts";
import {
  budget,
  type Locale,
  type Person,
  personName,
  personRole,
  personStatus,
  STATUS_LABELS,
  strings,
} from "../people";

/**
 * How the page exports: a PDF of the grouped sheet in the browser, a job the
 * host runs, or a CSV of the flat view by scope.
 */
export type ExportMode = "pdf" | "server" | "csv";

/** The export modes, in the order the page offers them. */
export const EXPORT_MODES: { value: ExportMode; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "server", label: "Server job" },
  { value: "csv", label: "CSV" },
];

/** Which rows or cells a CSV export takes. */
export type ExportScope = "page" | "selected" | "range";

/**
 * The CSV scope the page's URL asks for (`?scope=page|selected|range`),
 * which also opens the page in CSV mode.
 *
 * @returns The requested scope, or undefined when the URL names none.
 */
export function requestedExportScope(): ExportScope | undefined {
  if (typeof window === "undefined") return undefined;
  const scope = new URLSearchParams(window.location.search).get("scope");
  return scope === "page" || scope === "selected" || scope === "range"
    ? scope
    : undefined;
}

/**
 * The mode the page opens in: CSV when the URL names a scope, else PDF.
 *
 * @returns The opening mode.
 */
export function initialExportMode(): ExportMode {
  return requestedExportScope() === undefined ? "pdf" : "csv";
}

/** The grouped sheet is what a PDF or server job exports; a CSV takes the flat view. */
export const exportGroups = (mode: ExportMode): boolean => mode !== "csv";

/** A selected-rows CSV needs row selection. */
export const exportSelects = (mode: ExportMode, scope: ExportScope): boolean =>
  mode === "csv" && scope === "selected";

/** A cell-range CSV needs cell navigation to draw the range. */
export const exportNavigatesCells = (
  mode: ExportMode,
  scope: ExportScope
): boolean => mode === "csv" && scope === "range";

/** The keys the page groups by, outermost first. */
export const EXPORT_GROUP_BY: readonly string[] = ["team", "status"];

/**
 * The font the Arabic download embeds.
 *
 * Amiri, under the SIL Open Font License, sits in `public/fonts` beside its
 * licence. It is fetched only when the page switches language: a table of
 * Latin rows embeds nothing, which is the point of the option being one.
 */
export const ARABIC_FONT_URL = "/fonts/Amiri-Regular.ttf";

let arabicFont: Promise<ArrayBuffer> | undefined;

/**
 * The Arabic face's bytes, fetched once, the first time they are asked for.
 * The writer takes bytes, so the host decides when they arrive; until they
 * do, the export still works with the built-in face.
 *
 * @returns The font file's bytes.
 */
export function loadArabicFont(): Promise<ArrayBuffer> {
  arabicFont ??= fetch(ARABIC_FONT_URL).then((response) => {
    if (!response.ok) {
      throw new Error(
        `The demo font ${ARABIC_FONT_URL} did not load: ${String(response.status)}`
      );
    }
    return response.arrayBuffer();
  });
  return arabicFont;
}

/**
 * Print columns are primitives with stated widths, so the print dialog shows
 * the same groups and proportions the PDF paginates.
 *
 * @param locale - The page's language.
 * @returns The columns the sheet prints.
 */
export function exportPrintColumns(locale: Locale): ColumnMetadata<Person>[] {
  const s = strings(locale);
  return [
    {
      key: "person",
      header: s.person,
      accessor: (row) => personName(row, locale),
      width: 200,
    },
    { key: "team", header: s.team, accessor: (row) => row.team, width: 110 },
    {
      key: "status",
      header: s.status,
      accessor: (row) => STATUS_LABELS[locale][personStatus(row)],
      width: 100,
    },
    {
      key: "role",
      header: s.role,
      accessor: (row) => personRole(row, locale),
      width: 160,
    },
    {
      key: "budget",
      header: s.budget,
      accessor: (row) => budget(row),
      exportValue: (row) => budget(row),
      width: 110,
    },
  ];
}

/**
 * Open the browser's print dialog on the grouped sheet.
 *
 * @param locale - The page's language.
 * @param font - The Arabic face, once it has loaded.
 */
export function printGroupedPeople(
  locale: Locale,
  font: ArrayBuffer | undefined
): void {
  const columns = exportPrintColumns(locale);
  const rows = rosterFor("export");
  printTable({
    rows,
    columns,
    view: viewFromGroupedEntries(
      buildGroupedFlatModel({
        rows,
        columns,
        groupBy: [...EXPORT_GROUP_BY],
        getRowId: (row) => row.id,
        collapsedGroupIds: new Set<string>(),
        footers: false,
      }),
      undefined,
      true
    ),
    title: locale === "ar" ? "الفرق" : "Squads",
    direction: locale === "ar" ? "rtl" : "ltr",
    font,
    pageSize: "a4-landscape",
    pageBreak: "group",
  });
}

/**
 * A host-run export job: it reports progress, honours cancel, and hands
 * back the finished file.
 *
 * @param locale - The page's language.
 * @param controls - The table's progress and cancel controls.
 * @returns The finished file's address.
 */
export function simulateServerExport(
  locale: Locale,
  controls: ExportAllControls
): Promise<ExportAllResult> {
  return new Promise((resolve, reject) => {
    let progress = 10;
    controls.setProgress?.(progress);
    controls.setMessage?.(
      locale === "ar"
        ? "جارٍ إنشاء الملف على الخادم"
        : "Building the file on the server"
    );
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + 5);
      controls.setProgress?.(progress);
      if (progress < 100) return;
      window.clearInterval(timer);
      controls.signal.removeEventListener("abort", abort);
      resolve({
        url: "data:text/csv;charset=utf-8,Name%0AAda%20Lovelace",
      });
    }, 500);
    const abort = () => {
      window.clearInterval(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    controls.signal.addEventListener("abort", abort, { once: true });
  });
}

/**
 * The export options for the chosen mode. A CSV takes the requested scope
 * of the flat view; for the grouped sheet, `scope: "all"` takes every
 * filtered row, so collapsed groups and later pages still leave the file;
 * the PDF writer paginates on group boundaries and embeds `font` subset to
 * the glyphs the sheet uses.
 *
 * @param mode - PDF, server job or CSV.
 * @param locale - The page's language.
 * @param font - The Arabic face, once it has loaded.
 * @param scope - What a CSV takes.
 * @returns The export feature's options.
 */
export function exportScenarioOptions(
  mode: ExportMode,
  locale: Locale,
  font: ArrayBuffer | undefined,
  scope: ExportScope = "page"
): ExportCsvOptions<Person> {
  if (mode === "csv") return { scope };
  if (mode === "server") {
    return {
      scope: "all",
      filename: "people.csv",
      onExportAll: (_query, controls) => simulateServerExport(locale, controls),
    };
  }
  return {
    scope: "all",
    writer: pdfWriter({
      title: locale === "ar" ? "الموظفون" : "People",
      direction: locale === "ar" ? "rtl" : "ltr",
      font: locale === "ar" ? font : undefined,
      pageSize: "a4-landscape",
      pageBreak: "group",
    }),
    filename: locale === "ar" ? "الموظفون.pdf" : "people.pdf",
  };
}
