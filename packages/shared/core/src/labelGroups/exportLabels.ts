/**
 * The strings an export draws while it runs.
 */
import type { TableLabels } from "../types";

/**
 * The strings an export draws while it runs.
 *
 * @public
 */
export const EXPORT_LABELS: Pick<
  Required<TableLabels>,
  | "exportFile"
  | "exportStarted"
  | "exportProgress"
  | "exportDone"
  | "exportFailed"
  | "exportCancelled"
  | "exportDownload"
  | "exportDismiss"
> = {
  exportFile: (format) => `Export ${format.toUpperCase()}`,
  exportStarted: "Preparing export",
  exportProgress: (progress) => `Export ${String(progress)}% complete`,
  exportDone: "Export complete",
  exportFailed: "Export failed",
  exportCancelled: "Export cancelled",
  exportDownload: "Download export",
  exportDismiss: "Dismiss",
};
