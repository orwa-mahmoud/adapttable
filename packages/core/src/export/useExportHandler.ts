/**
 * The Export button's click handler, what it is doing, and what it just did.
 *
 * The built-in browser export is synchronous: it builds a string and hands it
 * to the browser, and the button is never busy for long. A host-handled export
 * (`exportCsv.request` / `exportCsv.onExportAll`) is not — it may be a round
 * trip or a queued job — so a second click could start the same export again.
 *
 * This wraps either kind. The returned handler refuses a click while a promise
 * is still settling, `busy` is what adapters render as their kit's loading
 * affordance, and the announcement is what a screen reader hears when the
 * export finishes or fails — which is otherwise nothing at all: a download is
 * silent, and a failed one is silent in exactly the same way. Every adapter
 * goes through this, so none of it can differ between kits.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { capabilityReason } from "../source/capabilities";
import type { TableLabels } from "../types";
import { devWarn } from "../utils/devWarn";
import { exportButtonLabel } from "./exportLabel";
import type { ExportAllControls, ExportAllResult } from "./tableCsv";

/**
 * Where an export is in its life.
 *
 * @public
 */
export type ExportStatus = "idle" | "busy" | "done" | "failed" | "cancelled";

/**
 * The server-built export surface's current model.
 *
 * @public
 */
export interface ExportProgressState {
  /** Busy, done, failed, or cancelled. */
  readonly status: Exclude<ExportStatus, "idle">;
  /** Reported completion; absent means indeterminate. */
  readonly value: number | undefined;
  /** Host-owned status copy, when one was reported. */
  readonly message: string;
  /** Rejection detail shown below the localized failure heading. */
  readonly error: string;
  /** Download offered after a `{ url }` settlement. */
  readonly downloadUrl: string | undefined;
  /** Abort the active host job. Present only while busy. */
  readonly onCancel: (() => void) | undefined;
  /** Start a fresh run. Present only after failure. */
  readonly onRetry: (() => void) | undefined;
}

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
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState<number>();
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string>();
  // Which run the current status belongs to. Exporting the same table twice
  // produces the same phrase, and a live region whose text has not changed is
  // announced once — so the run number rides along and breaks the tie.
  const [run, setRun] = useState(0);
  // A ref as well as state: the state renders the button, the ref is what the
  // click reads, so a second click cannot slip through before React re-renders.
  const inFlight = useRef(false);
  const activeRun = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const cancelExport = useCallback(() => {
    const current = controller.current;
    if (!current || current.signal.aborted || !inFlight.current) return;
    activeRun.current += 1;
    current.abort();
    controller.current = null;
    inFlight.current = false;
    setProgress(undefined);
    setMessage("");
    setErrorMessage("");
    setDownloadUrl(undefined);
    setExportStatus("cancelled");
  }, []);

  const onExportCsv = useCallback(() => {
    // A disabled control still takes a programmatic click, and the fallback
    // export must not slip through behind one.
    if (pageOnly) return;
    if (!handler || inFlight.current) return;
    const runId = activeRun.current + 1;
    activeRun.current = runId;
    inFlight.current = true;
    setExportStatus("busy");
    setRun((n) => n + 1);
    setProgress(undefined);
    setMessage("");
    setErrorMessage("");
    setDownloadUrl(undefined);

    const nextController = serverBuilt ? new AbortController() : null;
    controller.current = nextController;
    const controls: ExportAllControls | undefined = nextController
      ? {
          signal: nextController.signal,
          setProgress: (next) => {
            if (activeRun.current !== runId || nextController.signal.aborted) {
              return;
            }
            setProgress(clampProgress(next));
          },
          setMessage: (next) => {
            if (activeRun.current !== runId || nextController.signal.aborted) {
              return;
            }
            setMessage(next);
          },
        }
      : undefined;

    let result: ExportAllResult | Promise<ExportAllResult>;
    try {
      result = handler(controls);
    } catch (error) {
      inFlight.current = false;
      controller.current = null;
      setErrorMessage(errorText(error));
      setExportStatus("failed");
      warnAboutFailure(error, serverBuilt);
      if (!serverBuilt) throw error;
      return;
    }
    if (!isPromiseLike(result)) {
      // The browser already has the file: synchronous work is finished the
      // moment it returns.
      inFlight.current = false;
      controller.current = null;
      setMessage("");
      setDownloadUrl(result?.url);
      setExportStatus("done");
      return;
    }
    // Both outcomes release the button — a rejected export must not leave it
    // disabled for the rest of the session.
    //
    // The rejection is handled here rather than left to float, because an
    // unhandled rejection would surface in the host's error reporting as
    // something the table did. It is still the host's error, so development
    // says so out loud instead of swallowing it.
    void Promise.resolve(result).then(
      (settled) => {
        if (activeRun.current !== runId || nextController?.signal.aborted) {
          return;
        }
        inFlight.current = false;
        controller.current = null;
        setMessage("");
        setDownloadUrl(settled?.url);
        setExportStatus("done");
      },
      (error: unknown) => {
        if (activeRun.current !== runId || nextController?.signal.aborted) {
          return;
        }
        inFlight.current = false;
        controller.current = null;
        setErrorMessage(errorText(error));
        setExportStatus("failed");
        warnAboutFailure(error, serverBuilt);
      }
    );
  }, [handler, pageOnly, serverBuilt]);

  useEffect(
    () => () => {
      activeRun.current += 1;
      controller.current?.abort();
      controller.current = null;
      inFlight.current = false;
    },
    []
  );

  const progressState =
    serverBuilt && exportStatus !== "idle"
      ? {
          status: exportStatus,
          value: progress,
          message,
          error: errorMessage,
          downloadUrl,
          onCancel: exportStatus === "busy" ? cancelExport : undefined,
          onRetry: exportStatus === "failed" ? onExportCsv : undefined,
        }
      : null;

  // The button stays rendered while busy — disabled, not gone.
  return {
    onExportCsv: handler ? onExportCsv : undefined,
    exportBusy: exportStatus === "busy",
    exportStatus,
    exportAnnouncement: announcementFor(
      exportStatus,
      run,
      labels,
      progress,
      serverBuilt
    ),
    exportProgressState: progressState,
    exportLabel: exportButtonLabel(labels, format),
    exportDisabled: pageOnly,
    exportDisabledReason: pageOnly
      ? (labels?.noticeExportAllPage ?? capabilityReason("exportScope"))
      : "",
  };
}

/** Keep host progress inside the contract even when a backend overshoots. */
function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

function isPromiseLike(
  value: ExportAllResult | Promise<ExportAllResult>
): value is Promise<ExportAllResult> {
  return (
    typeof value === "object" &&
    "then" in value &&
    typeof value.then === "function"
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function warnAboutFailure(error: unknown, serverBuilt: boolean): void {
  const callback = serverBuilt ? "onExportAll" : "request";
  devWarn(
    `exportCsv.${callback} rejected, so no export happened. The table exposed ` +
      `the failure and a retry when available. Reason: ${String(error)}`
  );
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
  labels?: TableLabels,
  progress?: number,
  serverBuilt = false
): string {
  const text = outcomeText(status, labels, progress, serverBuilt);
  if (text === "") return "";
  return run % 2 === 0 ? text : `${text}\u2063`;
}

/** The localized phrase for the current export state. */
function outcomeText(
  status: ExportStatus,
  labels?: TableLabels,
  progress?: number,
  serverBuilt = false
): string {
  if (status === "busy" && serverBuilt && progress !== undefined) {
    return (
      labels?.exportProgress?.(progress) ??
      `Export ${String(progress)}% complete`
    );
  }
  if (status === "busy" && serverBuilt) {
    return labels?.exportStarted ?? "Preparing export";
  }
  if (status === "done") return labels?.exportDone ?? "Export complete";
  if (status === "failed") return labels?.exportFailed ?? "Export failed";
  if (status === "cancelled") {
    return labels?.exportCancelled ?? "Export cancelled";
  }
  return "";
}
