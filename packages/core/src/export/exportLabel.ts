/**
 * What the export button says.
 *
 * The button downloads whatever format its writer produces, so a fixed "Export
 * CSV" is wrong the moment a spreadsheet writer is passed — it names a file the
 * user is not getting. CSV keeps its own label, because seventeen translations
 * of it already exist and a host may have overridden the string; every other
 * format asks `TableLabels.exportFile` for a caption instead.
 */
import type { TableLabels } from "../types";

/**
 * The caption for an export button producing `format`.
 *
 * @param labels - Resolved table labels.
 * @param format - The writer's extension, e.g. `"csv"` or `"xlsx"`.
 * @returns The button's text.
 */
export function exportButtonLabel(
  labels: TableLabels | undefined,
  format: string
): string {
  if (format === "csv") return labels?.exportCsv ?? "Export CSV";
  const named = labels?.exportFile?.(format);
  return named ?? `Export ${format.toUpperCase()}`;
}
