/**
 * The optional toolbar controls, as semantic HTML with class hooks.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button. There is no kit to borrow components
 * from here — native elements ARE this kit — so each control keeps its
 * `data-adapttable-part` name and its `classNames` key.
 */
import {
  ExportAnnouncer,
  ExportProgressChrome,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

import type { DataTableClassNames } from "../types";
import { useClassNames } from "./classNamesContext";

/** The class map the unstyled kit styles its controls through. */
const classesOf = (props: Readonly<ToolbarExtrasSlotProps>) =>
  (props.classNames ?? {}) as DataTableClassNames;

export function UndoRedoButtons(
  props: Readonly<ToolbarExtrasSlotProps>
): ReactNode {
  const { onUndo, onRedo, canUndo, canRedo, undoLabel, redoLabel } = props;
  const classNames = classesOf(props);
  if (!onUndo || !onRedo) return null;
  return (
    <>
      <button
        type="button"
        data-adapttable-part="undo-button"
        className={classNames.undoButton}
        disabled={canUndo !== true}
        onClick={onUndo}
      >
        {undoLabel}
      </button>
      <button
        type="button"
        data-adapttable-part="redo-button"
        className={classNames.redoButton}
        disabled={canRedo !== true}
        onClick={onRedo}
      >
        {redoLabel}
      </button>
    </>
  );
}

export function ExportCsvButton(
  props: Readonly<ToolbarExtrasSlotProps>
): ReactNode {
  const {
    onExportCsv,
    exportBusy,
    exportAnnouncement = "",
    exportProgressState = null,
    exportLabel,
    exportDisabled = false,
    exportDisabledReason = "",
    labels,
  } = props;
  const classNames = classesOf(props);
  if (!onExportCsv) return null;
  return (
    <>
      <button
        type="button"
        data-adapttable-part="export-csv-button"
        className={classNames.exportCsvButton}
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
        onClick={onExportCsv}
        disabled={exportBusy === true || exportDisabled}
        aria-busy={exportBusy}
        title={exportDisabled ? exportDisabledReason : undefined}
      >
        {/* No kit to borrow a loading button from, so the affordance is an
            element the host can style — `aria-hidden` because the announcement
            below is what a screen reader should hear, not a decoration. */}
        {exportBusy && (
          <span
            aria-hidden="true"
            data-adapttable-part="export-spinner"
            className={classNames.exportSpinner}
          />
        )}
        {exportLabel}
      </button>
      <ExportProgressChrome
        progress={exportProgressState}
        labels={labels}
        slots={{
          Surface: ExportProgressSurface,
        }}
      />
      <ExportAnnouncer announcement={exportAnnouncement} />
    </>
  );
}

function ExportProgressSurface({
  status,
  heading,
  message,
  error,
  progress,
  progressLabel,
  cancel,
  retry,
  download,
}: Readonly<ExportProgressSurfaceSlotProps>): ReactNode {
  const classNames = useClassNames();
  return (
    <section
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      className={classNames.exportProgressSurface}
      style={{
        position: "fixed",
        zIndex: 1400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        padding: 16,
        border: "1px solid currentColor",
        borderRadius: 8,
        background: "Canvas",
        color: "CanvasText",
        boxShadow: "0 8px 28px rgb(0 0 0 / 18%)",
      }}
    >
      <strong>{heading}</strong>
      {status === "busy" ? (
        <progress
          value={progress}
          max={100}
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
          className={classNames.exportProgressBar}
          style={{ display: "block", width: "100%", marginBlock: 12 }}
        />
      ) : null}
      {message ? (
        <p
          data-adapttable-part="export-progress-message"
          className={classNames.exportProgressMessage}
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          data-adapttable-part="export-progress-message"
          className={classNames.exportProgressMessage}
        >
          {error}
        </p>
      ) : null}
      <div
        data-adapttable-part="export-progress-actions"
        className={classNames.exportProgressActions}
        style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
      >
        {cancel ? (
          <button
            type="button"
            className={classNames.exportProgressCancel}
            onClick={cancel.onAction}
            data-adapttable-part="export-progress-cancel"
          >
            {cancel.label}
          </button>
        ) : null}
        {retry ? (
          <button
            type="button"
            className={classNames.exportProgressRetry}
            onClick={retry.onAction}
            data-adapttable-part="export-progress-retry"
          >
            {retry.label}
          </button>
        ) : null}
        {download ? (
          <a
            href={download.url}
            download
            className={classNames.exportProgressDownload}
            data-adapttable-part="export-progress-download"
          >
            {download.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function PrintButton(
  props: Readonly<ToolbarExtrasSlotProps>
): ReactNode {
  const { onPrint, printLabel } = props;
  const classNames = classesOf(props);
  if (!onPrint) return null;
  return (
    <button
      type="button"
      data-adapttable-part="print-button"
      className={classNames.printButton}
      onClick={onPrint}
    >
      {printLabel}
    </button>
  );
}

export function DensityButton(
  props: Readonly<ToolbarExtrasSlotProps>
): ReactNode {
  const { density, onDensityChange, labels } = props;
  const classNames = classesOf(props);
  return (
    <button
      type="button"
      aria-label={labels.density}
      data-adapttable-part="density-toggle"
      className={classNames.densityToggle}
      onClick={() => {
        onDensityChange(density === "compact" ? "comfortable" : "compact");
      }}
    >
      {density === "compact"
        ? labels.densityCompact
        : labels.densityComfortable}
    </button>
  );
}

export function FullscreenButton(
  props: Readonly<ToolbarExtrasSlotProps>
): ReactNode {
  const { onToggleFullscreen, isFullscreen, labels } = props;
  const classNames = classesOf(props);
  if (!onToggleFullscreen) return null;
  return (
    <button
      type="button"
      aria-label={
        isFullscreen === true ? labels.exitFullscreen : labels.enterFullscreen
      }
      data-adapttable-part="fullscreen-toggle"
      className={classNames.fullscreenToggle}
      onClick={onToggleFullscreen}
    >
      {isFullscreen === true ? "✕" : "⛶"}
    </button>
  );
}
