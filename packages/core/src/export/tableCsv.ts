import { ACTIONS_COLUMN_KEY } from "../columns/columnMenuModel";
import type { TableSource } from "../source/TableSource";
import type { ColumnDef } from "../types";
import { devWarn } from "../utils/devWarn";
import { downloadCsv, rowsToCsv } from "./csv";

/** Opt-in CSV export config for the shared DataTable surface. */
export interface ExportCsvOptions {
  /** Download filename. Defaults to `"export.csv"`. */
  filename?: string;
  /**
   * `"page"` (default) — current page / loaded slice.
   * `"all"` — full filtered+sorted set when the source exposes
   * {@link TableSource.allFilteredRows}; otherwise falls back to the
   * page with a dev-only warning.
   */
  scope?: "page" | "all";
  /**
   * Neutralise spreadsheet formula injection (see
   * {@link RowsToCsvOptions.escapeFormulas}). Disable ONLY for
   * machine-consumed output that is never opened in a spreadsheet.
   * @defaultValue true
   */
  escapeFormulas?: boolean;
}

/** Resolve a boolean-or-options prop into a concrete config, or `null` when off. */
export function resolveExportCsv(
  value: boolean | ExportCsvOptions | undefined
): ExportCsvOptions | null {
  if (!value) return null;
  if (value === true) return {};
  return value;
}

/** Columns that belong in a CSV (drop the synthetic actions column). */
export function exportableColumns<TRow>(
  columns: readonly ColumnDef<TRow>[]
): ColumnDef<TRow>[] {
  return columns.filter((column) => column.key !== ACTIONS_COLUMN_KEY);
}

/**
 * Build CSV text from the table's visible columns and the chosen row scope.
 *
 * @typeParam TRow - The row type.
 */
export function buildTableCsv<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnDef<TRow>[];
  scope?: "page" | "all";
  escapeFormulas?: boolean;
}): string {
  const scope = options.scope ?? "page";
  if (scope === "all" && !options.source.allFilteredRows) {
    devWarn(
      'exportCsv scope "all" is only supported on the frontend data tier (in-memory rows with allFilteredRows). Server-paginated sources cannot rebuild the full set; exporting the current page instead.'
    );
  }
  const rows =
    scope === "all"
      ? (options.source.allFilteredRows ?? options.source.rows)
      : options.source.rows;
  return rowsToCsv(rows, exportableColumns(options.columns), {
    escapeFormulas: options.escapeFormulas,
  });
}

/**
 * Build + download a CSV for the current table view.
 *
 * @typeParam TRow - The row type.
 */
export function downloadTableCsv<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnDef<TRow>[];
  filename?: string;
  scope?: "page" | "all";
  escapeFormulas?: boolean;
}): void {
  const csv = buildTableCsv(options);
  downloadCsv(options.filename ?? "export.csv", csv);
}

/**
 * Resolve the `exportCsv` prop into a click handler, or `undefined` when off.
 * Adapters bind this to the toolbar Export button.
 *
 * @typeParam TRow - The row type.
 */
export function makeExportCsvHandler<TRow>(
  exportCsv: boolean | ExportCsvOptions | undefined,
  source: TableSource<TRow>,
  columns: readonly ColumnDef<TRow>[]
): (() => void) | undefined {
  const options = resolveExportCsv(exportCsv);
  if (!options) return undefined;
  return () =>
    downloadTableCsv({
      source,
      columns,
      filename: options.filename,
      scope: options.scope,
      escapeFormulas: options.escapeFormulas,
    });
}
