/**
 * The Export button's run model — single flight, progress, cancellation and
 * the outcome, shared by every binding.
 *
 * The built-in browser export is synchronous: it builds a string and hands it
 * to the browser, and the button is never busy for long. A host-handled export
 * (`exportCsv.request` / `exportCsv.onExportAll`) is not — it may be a round
 * trip or a queued job — so a second click could start the same export again.
 *
 * The controller wraps either kind. {@link ExportController.start} refuses a
 * click while a run is still settling, the snapshot's status is what a binding
 * renders as its kit's loading affordance, and
 * {@link resolveExportAnnouncement} is what a screen reader hears when the
 * export finishes or fails — which is otherwise nothing at all: a download is
 * silent, and a failed one is silent in exactly the same way. Every binding
 * goes through this, so none of it can differ between kits or frameworks.
 */
import { capabilityReason } from "../source/capabilities";
import type { TableLabels } from "../types";
import { devWarn } from "../utils/devWarn";
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
  /**
   * Clear a finished surface. Present for done, failed, and cancelled — never
   * while busy, where Cancel is the only way out.
   */
  readonly onDismiss: (() => void) | undefined;
}

/**
 * The export a button runs — what `makeExportCsvHandler` returns. A
 * server-built export receives progress controls; every other kind ignores
 * them.
 *
 * @public
 */
export type ExportRunHandler = (
  controls?: ExportAllControls
) => ExportAllResult | Promise<ExportAllResult>;

/**
 * What an export controller is configured with.
 *
 * @public
 */
export interface ExportControllerOptions {
  /** The export to run, or `undefined` when the export feature is absent. */
  readonly handler: ExportRunHandler | undefined;
  /**
   * The source holds one page and the host asked for `"all"`. Every start is
   * refused, because the file it would write is not the file the button
   * offered.
   */
  readonly pageOnly?: boolean;
  /**
   * The handler is `onExportAll`: each run receives an abort signal and
   * progress controls, and can be cancelled.
   */
  readonly serverBuilt?: boolean;
}

/**
 * The export's state at one moment.
 *
 * @public
 */
export interface ExportSnapshot {
  /** Idle, busy, done, failed or cancelled. */
  readonly status: ExportStatus;
  /** Completion the host reported, 0 through 100; `undefined` is indeterminate. */
  readonly progress: number | undefined;
  /** Host-owned status copy, empty when none was reported. */
  readonly message: string;
  /** The last failure's detail, empty unless the run failed. */
  readonly error: string;
  /** Download the host offered with a `{ url }` settlement. */
  readonly downloadUrl: string | undefined;
  /**
   * Runs started so far. Two identical outcomes in a row differ only in this,
   * which is what lets the second one be announced at all.
   */
  readonly run: number;
}

/**
 * The single-flight export behind one table's Export button.
 *
 * @public
 */
export interface ExportController {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => ExportSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * Replace the configuration — a binding calls this on every render. It
   * never notifies; a start reads whatever was configured last.
   */
  readonly configure: (options: ExportControllerOptions) => void;
  /**
   * Bind the controller to a mounted button. Returns the teardown a binding
   * runs on unmount, which abandons the run in flight: its signal aborts and
   * its settlement is ignored. The controller stays usable after it.
   */
  readonly connect: () => () => void;
  /**
   * Run the export — the button's click. Refused while a run is in flight,
   * while the export is page-only, and without a handler. A browser-built
   * export that throws is marked failed and the error is rethrown; a
   * server-built one is marked failed and offered a retry.
   */
  readonly start: () => void;
  /** Abort the server-built run in flight. Does nothing otherwise. */
  readonly cancel: () => void;
  /** Clear a done, failed or cancelled outcome back to idle. */
  readonly dismiss: () => void;
}

const IDLE: ExportSnapshot = {
  status: "idle",
  progress: undefined,
  message: "",
  error: "",
  downloadUrl: undefined,
  run: 0,
};

const SNAPSHOT_KEYS = Object.keys(IDLE) as readonly (keyof ExportSnapshot)[];

/** What a fresh run, a cancel and a dismiss all clear. */
const CLEARED = {
  progress: undefined,
  message: "",
  error: "",
  downloadUrl: undefined,
} as const satisfies Partial<ExportSnapshot>;

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

function isTerminal(status: ExportStatus): boolean {
  return status === "done" || status === "failed" || status === "cancelled";
}

/**
 * Create the export controller for one Export button.
 *
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createExportController(
  initial: ExportControllerOptions
): ExportController {
  let options = initial;
  let snapshot = IDLE;
  // Which run may still write. Every start, cancel and teardown moves it on,
  // so a settlement that arrives after any of them finds itself stale.
  let activeRun = 0;
  // Set only while a run is in flight: a server-built run's abort controller,
  // or `"browser"` for a run that cannot be cancelled. It is checked on the
  // click itself, so a second click cannot slip through before a binding
  // re-renders the button disabled.
  let inFlight: AbortController | "browser" | null = null;
  let batchDepth = 0;
  let changed = false;
  const listeners = new Set<() => void>();

  const flush = (): void => {
    if (batchDepth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };

  const write = (patch: Partial<ExportSnapshot>): void => {
    const next = { ...snapshot, ...patch };
    if (SNAPSHOT_KEYS.every((key) => next[key] === snapshot[key])) return;
    snapshot = next;
    changed = true;
    flush();
  };

  /** Run several writes as one change, so listeners hear the end state. */
  const batch = (run: () => void): void => {
    batchDepth += 1;
    try {
      run();
    } finally {
      batchDepth -= 1;
      flush();
    }
  };

  const succeed = (result: ExportAllResult): void => {
    inFlight = null;
    write({ message: "", downloadUrl: result?.url, status: "done" });
  };

  const fail = (error: unknown, serverBuilt: boolean): void => {
    inFlight = null;
    write({ error: errorText(error), status: "failed" });
    warnAboutFailure(error, serverBuilt);
  };

  /** The controls a server-built run reports through, bound to that run. */
  const controlsFor = (
    runId: number,
    abort: AbortController
  ): ExportAllControls => ({
    signal: abort.signal,
    setProgress: (next) => {
      if (activeRun === runId) write({ progress: clampProgress(next) });
    },
    setMessage: (next) => {
      if (activeRun === runId) write({ message: next });
    },
  });

  const launch = (handler: ExportRunHandler, serverBuilt: boolean): void => {
    activeRun += 1;
    const runId = activeRun;
    const abort = serverBuilt ? new AbortController() : null;
    inFlight = abort ?? "browser";
    write({ ...CLEARED, status: "busy", run: snapshot.run + 1 });

    let result: ExportAllResult | Promise<ExportAllResult>;
    try {
      result = handler(abort ? controlsFor(runId, abort) : undefined);
    } catch (error) {
      fail(error, serverBuilt);
      if (!serverBuilt) throw error;
      return;
    }
    // The browser already has the file: synchronous work is finished the
    // moment it returns.
    if (!isPromiseLike(result)) {
      succeed(result);
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
        if (activeRun === runId) succeed(settled);
      },
      (error: unknown) => {
        if (activeRun === runId) fail(error, serverBuilt);
      }
    );
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    connect() {
      return () => {
        activeRun += 1;
        const abandoned = inFlight;
        inFlight = null;
        if (abandoned instanceof AbortController) abandoned.abort();
      };
    },
    start() {
      const { handler, pageOnly = false, serverBuilt = false } = options;
      // A disabled control still takes a programmatic click, and the one-page
      // export must not slip through behind one.
      if (pageOnly || !handler || inFlight) return;
      batch(() => {
        launch(handler, serverBuilt);
      });
    },
    cancel() {
      const abandoned = inFlight;
      if (!(abandoned instanceof AbortController)) return;
      batch(() => {
        activeRun += 1;
        inFlight = null;
        abandoned.abort();
        write({ ...CLEARED, status: "cancelled" });
      });
    },
    dismiss() {
      if (!isTerminal(snapshot.status)) return;
      write({ ...CLEARED, status: "idle" });
    },
  };
}

/* ── Derivations ───────────────────────────────────────────────────── */

/** The localized phrase for the current export state. */
function outcomeText(
  status: ExportStatus,
  labels: TableLabels | undefined,
  progress: number | undefined,
  serverBuilt: boolean
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

/**
 * Live-region text for an export's state; idle, and a browser-built busy, say
 * nothing.
 *
 * Every other run carries a trailing invisible separator (U+2063). It is not
 * drawn and not spoken, and it is what makes two identical outcomes in a row
 * read as two changes rather than one — the alternative is a second export
 * that announces nothing.
 *
 * @param input - The snapshot's status, run and progress, the table's labels,
 *   and whether the export is server-built.
 * @returns The phrase, or `""` when there is nothing to say.
 *
 * @public
 */
export function resolveExportAnnouncement(input: {
  readonly status: ExportStatus;
  readonly run: number;
  readonly labels: TableLabels | undefined;
  readonly progress: number | undefined;
  readonly serverBuilt: boolean;
}): string {
  const { status, run, labels, progress, serverBuilt } = input;
  const text = outcomeText(status, labels, progress, serverBuilt);
  if (text === "") return "";
  return run % 2 === 0 ? text : `${text}⁣`;
}

/**
 * The server-built export surface's model, or `null` for a browser-built
 * export and for an idle one.
 *
 * @param input - Whether the export is server-built, the snapshot's fields,
 *   and the controller's actions the surface offers.
 * @returns The surface's model.
 *
 * @public
 */
export function resolveExportProgressState(input: {
  readonly serverBuilt: boolean;
  readonly status: ExportStatus;
  readonly progress: number | undefined;
  readonly message: string;
  readonly error: string;
  readonly downloadUrl: string | undefined;
  readonly cancel: () => void;
  readonly retry: () => void;
  readonly dismiss: () => void;
}): ExportProgressState | null {
  const { serverBuilt, status } = input;
  if (!serverBuilt || status === "idle") return null;
  return {
    status,
    value: input.progress,
    message: input.message,
    error: input.error,
    downloadUrl: input.downloadUrl,
    onCancel: status === "busy" ? input.cancel : undefined,
    onRetry: status === "failed" ? input.retry : undefined,
    onDismiss: status === "busy" ? undefined : input.dismiss,
  };
}

/**
 * Why the Export button is disabled, localized — empty while it is not.
 *
 * @param labels - Resolved table labels.
 * @param pageOnly - The source holds one page and the host asked for `"all"`.
 * @returns The reason a binding attaches to the disabled control.
 *
 * @public
 */
export function resolveExportDisabledReason(
  labels: TableLabels | undefined,
  pageOnly: boolean
): string {
  if (!pageOnly) return "";
  return labels?.noticeExportAllPage ?? capabilityReason("exportScope");
}
