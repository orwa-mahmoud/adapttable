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
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

import type { DataTableClassNames } from "../types";

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
    exportLabel,
    exportDisabled = false,
    exportDisabledReason = "",
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
      <ExportAnnouncer announcement={exportAnnouncement} />
    </>
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
  if (!onDensityChange) return null;
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
