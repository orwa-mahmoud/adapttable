/**
 * The Export button's click handler, what it is doing, and what it just did.
 *
 * The built-in browser export is synchronous: it builds a string and hands it
 * to the browser, and the button is never busy for long. A host-handled export
 * (`exportCsv.request`) is not — it may be a round trip or a queued job — so a
 * second click could start the same export again.
 *
 * This wraps either kind. The returned handler refuses a click while a promise
 * is still settling, `busy` is what adapters render as their kit's loading
 * affordance, and the announcement is what a screen reader hears when the
 * export finishes or fails — which is otherwise nothing at all: a download is
 * silent, and a failed one is silent in exactly the same way. Every adapter
 * goes through this, so none of it can differ between kits.
 */
import { useCallback, useRef, useState } from "react";

import type { TableLabels } from "../types";
import { devWarn } from "../utils/devWarn";
import { exportButtonLabel } from "./exportLabel";

/**
 * Where an export is in its life.
 *
 * @public
 */
export type ExportStatus = "idle" | "busy" | "done" | "failed";

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
  /**
   * The button's caption, naming the format it actually produces — "Export CSV"
   * by default, "Export XLSX" with the spreadsheet writer, and localized either
   * way. A button that names a file the user is not getting is a lie no adapter
   * should have to correct.
   */
  exportLabel: string;
}

/**
 * Make an export handler single-flight, and report what it is doing.
 *
 * @param handler - The handler from `makeExportCsvHandler`, or `undefined`
 *   when the `exportCsv` prop is off.
 * @param labels - Resolved table labels, for the caption and the announcements.
 * @param format - The writer's extension. Defaults to `"csv"`, the built-in.
 * @param pageOnly - The handler writes the current page even though the
 *   host asked for `"all"`. The button says so instead of "Export CSV".
 *
 * @public
 */
export function useExportHandler(
  handler: (() => void | Promise<void>) | undefined,
  labels?: TableLabels,
  format = "csv",
  pageOnly = false
): ExportHandlerState {
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  // Which run the current status belongs to. Exporting the same table twice
  // produces the same phrase, and a live region whose text has not changed is
  // announced once — so the run number rides along and breaks the tie.
  const [run, setRun] = useState(0);
  // A ref as well as state: the state renders the button, the ref is what the
  // click reads, so a second click cannot slip through before React re-renders.
  const inFlight = useRef(false);

  const onExportCsv = useCallback(() => {
    if (!handler || inFlight.current) return;
    setExportStatus("busy");
    setRun((n) => n + 1);
    let result: void | Promise<void>;
    try {
      result = handler();
    } catch (error) {
      // The host's error, and still the host's to handle — but the user is
      // told, rather than left looking at a button that did nothing.
      setExportStatus("failed");
      throw error;
    }
    if (!(result instanceof Promise)) {
      // The browser already has the file: synchronous work is finished the
      // moment it returns.
      setExportStatus("done");
      return;
    }
    inFlight.current = true;
    // Both outcomes release the button — a rejected export must not leave it
    // disabled for the rest of the session.
    //
    // The rejection is handled here rather than left to float, because an
    // unhandled rejection would surface in the host's error reporting as
    // something the table did. It is still the host's error, so development
    // says so out loud instead of swallowing it.
    void result.then(
      () => {
        inFlight.current = false;
        setExportStatus("done");
      },
      (error: unknown) => {
        inFlight.current = false;
        setExportStatus("failed");
        devWarn(
          `exportCsv.request rejected, so no export happened. Handle the failure ` +
            `inside your request function — this warning is all the table can do ` +
            `with it. Reason: ${String(error)}`
        );
      }
    );
  }, [handler]);

  // The button stays rendered while busy — disabled, not gone.
  return {
    onExportCsv: handler ? onExportCsv : undefined,
    exportBusy: exportStatus === "busy",
    exportStatus,
    exportAnnouncement: announcementFor(exportStatus, run, labels),
    exportLabel: pageOnly
      ? (labels?.exportThisPage ?? "Export this page")
      : exportButtonLabel(labels, format),
  };
}

/**
 * The phrase for an outcome; busy and idle say nothing.
 *
 * Every other run carries a trailing invisible separator (U+2063). It is not
 * drawn and not spoken, and it is what makes two identical outcomes in a row
 * read as two changes rather than one — the alternative is a second export
 * that announces nothing.
 */
function announcementFor(
  status: ExportStatus,
  run: number,
  labels?: TableLabels
): string {
  const text = outcomeText(status, labels);
  if (text === "") return "";
  return run % 2 === 0 ? text : `${text}\u2063`;
}

/** The label for a finished export; nothing while it is idle or running. */
function outcomeText(status: ExportStatus, labels?: TableLabels): string {
  if (status === "done") return labels?.exportDone ?? "Export complete";
  if (status === "failed") return labels?.exportFailed ?? "Export failed";
  return "";
}
