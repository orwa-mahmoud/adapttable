/**
 * CSV export facade.
 *
 * Row and column selection lives in `exportRows.ts`. CSV bytes live in
 * `csvWriter.ts`. This module composes them and keeps the existing names.
 * XLSX and PDF stay their own entries.
 */

import type { ColumnMetadata } from "../contracts/columns";
import type { FeatureHostState } from "../features/currentHost";
import type { TableSource } from "../source/TableSource";
import { devWarn } from "../utils/devWarn";
import { csvWriter } from "./csvWriter";
import {
  exportableColumns,
  exportAllFallsBackToPage,
  exportAllQueryOf,
  exportQueryOf,
  exportTableOptions,
  fetchAllExportRows,
  resolveExport,
  resolveExportColumns,
  resolveExportCsv,
  sourceProvidesAllExportRows,
} from "./exportRows";
import {
  buildExportTable,
  defaultExportFilename,
  downloadExportFile,
  type ExportWriter,
} from "./exportWriter";
import type {
  ExportAllControls,
  ExportAllResult,
  ExportColumnScope,
  ExportContext,
  ExportCsvOptions,
  ExportRowScope,
} from "./tableExportContract";

/**
 * Build CSV text for the chosen row and column scopes.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function buildTableCsv<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnMetadata<TRow>[];
  scope?: ExportRowScope;
  columnScope?: ExportColumnScope;
  escapeFormulas?: boolean;
  context?: ExportContext<TRow>;
}): string {
  const resolved = resolveExport(options);
  const { rows, columns } = resolved;
  return csvWriter.build({
    table: buildExportTable(
      rows,
      columns,
      exportTableOptions(resolved, options.scope, options.context)
    ),
    filename: "export.csv",
    escapeFormulas: options.escapeFormulas,
  }).text;
}

/**
 * Build + download a file for the current table view. CSV unless a `writer`
 * says otherwise.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function downloadTableCsv<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnMetadata<TRow>[];
  filename?: string;
  scope?: ExportRowScope;
  columnScope?: ExportColumnScope;
  escapeFormulas?: boolean;
  context?: ExportContext<TRow>;
  writer?: ExportWriter;
  onBeforeExport?: NonNullable<ExportCsvOptions<TRow>["onBeforeExport"]>;
  onAfterExport?: NonNullable<ExportCsvOptions<TRow>["onAfterExport"]>;
}): void {
  const resolved = resolveExport(options);
  const { rows, columns } = resolved;
  const writer = options.writer ?? csvWriter;

  let filename = options.filename ?? defaultExportFilename(writer);
  const decision = options.onBeforeExport?.({ rows, columns, filename });
  if (decision === false) return;
  if (decision && decision !== true && decision.filename) {
    filename = decision.filename;
  }

  // Built after the hook, so a filename the hook chose reaches a writer that
  // embeds it — and so a cancelled export builds nothing at all.
  const file = writer.build({
    table: buildExportTable(
      rows,
      columns,
      exportTableOptions(resolved, options.scope, options.context)
    ),
    filename,
    escapeFormulas: options.escapeFormulas,
  });
  downloadExportFile(filename, file);
  options.onAfterExport?.({ rows, columns, filename, csv: file.text, file });
}

/**
 * Resolve composed export configuration into a click handler, or `undefined`
 * when off.
 * Adapters bind this to the toolbar Export button.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function makeExportCsvHandler<TRow>(
  exportCsv: boolean | ExportCsvOptions<TRow> | undefined,
  source: TableSource<TRow>,
  columns: readonly ColumnMetadata<TRow>[],
  context?: ExportContext<TRow>,
  host?: FeatureHostState
):
  | ((
      controls?: ExportAllControls
    ) => ExportAllResult | Promise<ExportAllResult>)
  | undefined {
  const options = resolveExportCsv(exportCsv, host);
  if (!options) return undefined;

  const writer = options.writer ?? csvWriter;
  if (options.scope === "all" && options.onExportAll) {
    const query = exportAllQueryOf(source, columns, options, context, writer);
    const onExportAll = options.onExportAll;
    return (controls) =>
      onExportAll(query, controls ?? { signal: new AbortController().signal });
  }

  // Handing the export to a backend replaces building it here entirely —
  // the browser neither assembles a file nor downloads one.
  const { request } = options;
  if (request) {
    return () => {
      const resolved = resolveExport({
        source,
        columns,
        scope: options.scope,
        columnScope: options.columns,
        context,
      });
      return request({
        rows: resolved.rows,
        columns: resolved.columns,
        filename: options.filename ?? defaultExportFilename(writer),
        scope: options.scope ?? "page",
        format: writer.extension,
        query: exportQueryOf(source, options.scope ?? "page"),
      });
    };
  }

  // "All" over a server source: the browser holds one page, so it has to be
  // answered by fetching, not by pretending. A page-only declaration also
  // constrains rows that happen to be present; `fetchAll` remains an
  // independent host-owned route in either case.
  const serverAll =
    options.scope === "all" &&
    !sourceProvidesAllExportRows(source) &&
    options.fetchAll;
  if (serverAll) {
    return async () => {
      const rows = await fetchAllExportRows(source, serverAll);
      downloadTableCsv({
        source: { ...source, allFilteredRows: rows },
        columns,
        filename: options.filename,
        scope: "all",
        columnScope: options.columns,
        escapeFormulas: options.escapeFormulas,
        context,
        writer,
        onBeforeExport: options.onBeforeExport,
        onAfterExport: options.onAfterExport,
      });
    };
  }

  // Keep a handler so adapters can render the disabled control, but never
  // turn an unavailable all-rows request into a current-page download.
  if (exportAllFallsBackToPage(options, source)) {
    return () => {
      devWarn(
        'exportCsv scope "all" needs an executable full-export route. ' +
          "Provide source.allFilteredRows, exportCsv.onExportAll, " +
          "exportCsv.request, or exportCsv.fetchAll. No export was started."
      );
    };
  }

  return () =>
    downloadTableCsv({
      source,
      columns,
      filename: options.filename,
      scope: options.scope,
      columnScope: options.columns,
      escapeFormulas: options.escapeFormulas,
      context,
      writer,
      onBeforeExport: options.onBeforeExport,
      onAfterExport: options.onAfterExport,
    });
}

export type {
  ExportAllControls,
  ExportAllQuery,
  ExportAllResult,
  ExportColumnScope,
  ExportContext,
  ExportCsvOptions,
  ExportCsvProp,
  ExportInfo,
  ExportQuery,
  ExportRequest,
  ExportRowScope,
  FetchAllExport,
} from "./tableExportContract";
export { EXPORT_FETCH_ALL_MAX_ROWS } from "./tableExportContract";
export {
  exportableColumns,
  exportAllFallsBackToPage,
  fetchAllExportRows,
  resolveExportColumns,
  resolveExportCsv,
};
