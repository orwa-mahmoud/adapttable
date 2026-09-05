import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "@adapttable/core";
import type { ExportProgressState, ExportStatus } from "./useExportHandler";

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
 * Props for an adapter-owned server-export progress surface.
 *
 * @public
 */
export interface ExportProgressSurfaceSlotProps {
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
 * Required adapter components for {@link ExportProgressChrome}.
 *
 * @public
 */
export interface ExportProgressSlots {
  /** Renders the kit-native surface, progress indicator, and actions. */
  readonly Surface: (props: ExportProgressSurfaceSlotProps) => ReactNode;
}

/**
 * Props for {@link ExportProgressChrome}.
 *
 * @public
 */
export interface ExportProgressChromeProps {
  /** Shared export lifecycle state, or null for browser-built exports. */
  readonly progress: ExportProgressState | null;
  /** Resolved table labels. */
  readonly labels: TableLabels;
  /** Adapter-owned visible components. */
  readonly slots: ExportProgressSlots;
}

/**
 * Convert shared export lifecycle state into one kit-owned visible surface.
 *
 * Core owns when the surface exists, which actions are legal, and every
 * localized string. The adapter owns all visible controls and styling.
 *
 * @public
 */
export function ExportProgressChrome({
  progress,
  labels,
  slots,
}: Readonly<ExportProgressChromeProps>): ReactElement | null {
  if (!progress) return null;
  const Surface = slots.Surface;
  return (
    <Surface
      status={progress.status}
      heading={headingFor(progress.status, labels)}
      message={progress.message}
      error={progress.error}
      progress={progress.status === "busy" ? progress.value : undefined}
      progressLabel={
        progress.value === undefined
          ? (labels.exportStarted ?? "Preparing export")
          : (labels.exportProgress?.(progress.value) ??
            `Export ${String(progress.value)}% complete`)
      }
      cancel={
        progress.onCancel
          ? {
              label: labels.cancel ?? "Cancel",
              onAction: progress.onCancel,
            }
          : undefined
      }
      retry={
        progress.onRetry
          ? {
              label: labels.retry ?? "Retry",
              onAction: progress.onRetry,
            }
          : undefined
      }
      dismiss={
        progress.onDismiss
          ? {
              label: labels.exportDismiss ?? "Dismiss",
              onAction: () => {
                progress.onDismiss?.();
                focusExportTrigger();
              },
            }
          : undefined
      }
      download={
        progress.downloadUrl
          ? {
              url: progress.downloadUrl,
              label: labels.exportDownload ?? "Download export",
            }
          : undefined
      }
    />
  );
}

const EXPORT_CSV_BUTTON_PART = "export-csv-button";

function focusExportTrigger(): void {
  const named = document.querySelector<HTMLElement>(
    `[data-adapttable-part=${JSON.stringify(EXPORT_CSV_BUTTON_PART)}]`
  );
  if (!named) return;
  // Kits sometimes put the part on a wrapper; the control that started the
  // export is the nearest button, which is also what a keyboard user returns to.
  const trigger =
    named.closest("button") ?? named.querySelector("button") ?? named;
  trigger.focus();
}

function headingFor(
  status: Exclude<ExportStatus, "idle">,
  labels: TableLabels
) {
  if (status === "busy") return labels.exportStarted ?? "Preparing export";
  if (status === "done") return labels.exportDone ?? "Export complete";
  if (status === "failed") return labels.exportFailed ?? "Export failed";
  return labels.exportCancelled ?? "Export cancelled";
}
