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
  createExportController,
  type ExportAllControls,
  type ExportAllResult,
  exportButtonLabel,
  type ExportProgressState,
  type ExportStatus,
  resolveExportAnnouncement,
  resolveExportDisabledReason,
  resolveExportProgressState,
  type TableLabels,
} from "@adapttable/core";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type { ExportProgressState, ExportStatus } from "@adapttable/core";

/**
 * What {@link useExportHandler} returns.
 *
 * @public
 */
export interface ExportHandlerState {
  /** Bind to the Export button, or `undefined` when export is off. */
  onExportCsv: (() => void) | undefined;
  /** True while a host-handled export is still running. */
  exportBusy: boolean;
  /**
   * Idle, busy, done or failed — for a kit that shows more than a spinner, and
   * for tests that assert the outcome rather than the visuals.
   */
  exportStatus: ExportStatus;
  /**
   * Live-region text for the last outcome, empty until there is one. Adapters
   * render it in a polite region beside the button.
   */
  exportAnnouncement: string;
  /** Server-built progress UI, absent for browser-built exports. */
  exportProgressState: ExportProgressState | null;
  /**
   * The button's caption, naming the format it actually produces — "Export CSV"
   * by default, "Export XLSX" with the spreadsheet writer, and localized either
   * way. A button that names a file the user is not getting is a lie no adapter
   * should have to correct.
   */
  exportLabel: string;
  /**
   * The export the host asked for is beyond what the source can do. Adapters
   * render the button disabled — the reader is told, rather than handed a
   * narrower file than the one the button offered.
   */
  exportDisabled: boolean;
  /**
   * Why the button is disabled, localized, empty while it is not. Adapters
   * attach it to the control so the reason travels with the thing it explains.
   */
  exportDisabledReason: string;
}

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
  labels?: TableLabels,
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
