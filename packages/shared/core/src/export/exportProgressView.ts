/**
 * The server-built export's progress surface, as a kit renders it: the
 * heading for each status, the progress indicator's accessible text, which
 * actions are offered with their localized labels, and where focus goes once
 * the surface is dismissed.
 *
 * The export controller decides when the surface exists and which actions
 * are legal; this turns that state into the words and actions every binding
 * hands to its kit's surface.
 */
import { BASE_LABELS } from "../labelGroups/baseLabels";
import { EXPORT_LABELS } from "../labelGroups/exportLabels";
import type { TableLabels } from "../types";
import type { ExportProgressState, ExportStatus } from "./exportController";

/**
 * One action rendered by the adapter-owned export progress surface.
 *
 * @public
 */
export interface ExportProgressAction {
  /** Localized control label. */
  readonly label: string;
  /** Runs the lifecycle action. */
  readonly onAction: () => void;
}

/**
 * A download offered after a server-built export resolves `{ url }`.
 *
 * @public
 */
export interface ExportProgressDownload {
  /** Host-provided file URL. */
  readonly url: string;
  /** Localized link label. */
  readonly label: string;
}

/**
 * Everything a kit's export progress surface renders.
 *
 * @public
 */
export interface ExportProgressView {
  /** Busy, done, failed, or cancelled. */
  readonly status: Exclude<ExportStatus, "idle">;
  /** Localized surface heading. */
  readonly heading: string;
  /** Host-provided progress detail. */
  readonly message: string;
  /** Rejection detail, present only after failure. */
  readonly error: string;
  /** Completion from 0 through 100; absent means indeterminate while busy. */
  readonly progress: number | undefined;
  /** Accessible text for the progress indicator. */
  readonly progressLabel: string;
  /** Cancel action while busy. */
  readonly cancel: ExportProgressAction | undefined;
  /** Retry action after failure. */
  readonly retry: ExportProgressAction | undefined;
  /** Dismiss action after done, failed, or cancelled. */
  readonly dismiss: ExportProgressAction | undefined;
  /** Download link after a URL settlement. */
  readonly download: ExportProgressDownload | undefined;
}

/**
 * The export surface's heading for a status.
 *
 * @param status - The export's status.
 * @param labels - The table's labels.
 * @returns The localized heading.
 *
 * @public
 */
export function exportProgressHeading(
  status: Exclude<ExportStatus, "idle">,
  labels: TableLabels
): string {
  if (status === "busy")
    return labels.exportStarted ?? EXPORT_LABELS.exportStarted;
  if (status === "done") return labels.exportDone ?? EXPORT_LABELS.exportDone;
  if (status === "failed")
    return labels.exportFailed ?? EXPORT_LABELS.exportFailed;
  return labels.exportCancelled ?? EXPORT_LABELS.exportCancelled;
}

/** The part the export button carries, which dismissing returns focus to. */
const EXPORT_CSV_BUTTON_PART = "export-csv-button";

/**
 * Put focus back on the control that started the export. Kits sometimes put
 * the part on a wrapper; the control is the nearest button, which is also
 * what a keyboard user returns to.
 *
 * @param root - Where to look. Defaults to the document; nothing happens
 *   where there is none.
 * @returns Whether a control was focused.
 *
 * @public
 */
export function focusExportTrigger(
  root: Pick<ParentNode, "querySelector"> | undefined = globalThis.document
): boolean {
  const named = root?.querySelector<HTMLElement>(
    `[data-adapttable-part=${JSON.stringify(EXPORT_CSV_BUTTON_PART)}]`
  );
  if (!named) return false;
  const trigger =
    named.closest("button") ?? named.querySelector("button") ?? named;
  trigger.focus();
  return true;
}

/**
 * Turn the export's progress state into the surface a kit renders.
 *
 * @param progress - The export's progress state.
 * @param labels - The table's labels.
 * @returns The view. Dismissing also returns focus to the export button.
 *
 * @public
 */
export function exportProgressView(
  progress: ExportProgressState,
  labels: TableLabels
): ExportProgressView {
  const { onCancel, onRetry, onDismiss } = progress;
  return {
    status: progress.status,
    heading: exportProgressHeading(progress.status, labels),
    message: progress.message,
    error: progress.error,
    progress: progress.status === "busy" ? progress.value : undefined,
    progressLabel:
      progress.value === undefined
        ? (labels.exportStarted ?? EXPORT_LABELS.exportStarted)
        : (labels.exportProgress ?? EXPORT_LABELS.exportProgress)(
            progress.value
          ),
    cancel: onCancel
      ? { label: labels.cancel ?? BASE_LABELS.cancel, onAction: onCancel }
      : undefined,
    retry: onRetry
      ? { label: labels.retry ?? BASE_LABELS.retry, onAction: onRetry }
      : undefined,
    dismiss: onDismiss
      ? {
          label: labels.exportDismiss ?? EXPORT_LABELS.exportDismiss,
          onAction: () => {
            onDismiss();
            focusExportTrigger();
          },
        }
      : undefined,
    download: progress.downloadUrl
      ? {
          url: progress.downloadUrl,
          label: labels.exportDownload ?? EXPORT_LABELS.exportDownload,
        }
      : undefined,
  };
}
