/**
 * The Export button's click handler, what it is doing, and what it just did —
 * the React binding.
 *
 * Core's export controller owns the run: it refuses a click while a promise is
 * still settling, hands a server-built export its abort signal and progress
 * controls, and records the outcome. This hook subscribes to it, abandons the
 * run in flight on unmount, and derives the caption, the announcement and the
 * progress surface every adapter renders — so none of it can differ between
 * kits.
 */
import {
  type ExportAllControls,
  type ExportAllResult,
  type TableLabels,
} from "@adapttable/core";
import {
  createExportController,
  exportButtonLabel,
  type ExportHandlerState,
  resolveExportAnnouncement,
  resolveExportDisabledReason,
  resolveExportProgressState,
} from "@adapttable/core/binding";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
export type { ExportProgressState, ExportStatus } from "@adapttable/core";
export type { ExportHandlerState } from "@adapttable/core/binding";

/**
 * Make an export handler single-flight, and report what it is doing.
 *
 * @param handler - The handler from `makeExportCsvHandler`, or `undefined`
 *   when the export feature is absent.
 * @param labels - Resolved table labels, for the caption and the announcements.
 * @param format - The writer's extension. Defaults to `"csv"`, the built-in.
 * @param pageOnly - The source holds one page and the host asked for `"all"`.
 *   The button is disabled and says why, because the file it would write is
 *   not the file it offered.
 * @param serverBuilt - This handler is `onExportAll`, so it receives progress
 *   controls and exposes the progress surface.
 *
 * @public
 */
export function useExportHandler(
  handler:
    | ((
        controls?: ExportAllControls
      ) => ExportAllResult | Promise<ExportAllResult>)
    | undefined,
  labels: Required<TableLabels>,
  format = "csv",
  pageOnly = false,
  serverBuilt = false
): ExportHandlerState {
  const options = { handler, pageOnly, serverBuilt };
  const [controller] = useState(() => createExportController(options));
  controller.configure(options);
  const { status, progress, message, error, downloadUrl, run } =
    useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
      controller.getSnapshot
    );

  useEffect(() => controller.connect(), [controller]);

  const exportProgressState = useMemo(
    () =>
      resolveExportProgressState({
        serverBuilt,
        status,
        progress,
        message,
        error,
        downloadUrl,
        cancel: controller.cancel,
        retry: controller.start,
        dismiss: controller.dismiss,
      }),
    [controller, serverBuilt, status, progress, message, error, downloadUrl]
  );

  const exportAnnouncement = useMemo(
    () =>
      resolveExportAnnouncement({ status, run, labels, progress, serverBuilt }),
    [status, run, labels, progress, serverBuilt]
  );

  const enabled = handler !== undefined;

  // The button stays rendered while busy — disabled, not gone.
  return useMemo(
    () => ({
      onExportCsv: enabled ? controller.start : undefined,
      exportBusy: status === "busy",
      exportStatus: status,
      exportAnnouncement,
      exportProgressState,
      exportLabel: exportButtonLabel(labels, format),
      exportDisabled: pageOnly,
      exportDisabledReason: resolveExportDisabledReason(labels, pageOnly),
    }),
    [
      controller,
      enabled,
      status,
      exportAnnouncement,
      exportProgressState,
      labels,
      format,
      pageOnly,
    ]
  );
}
