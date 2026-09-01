/**
 * The optional toolbar controls, each drawn with antd's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  ExportAnnouncer,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import { Button } from "antd";
import type { ReactNode } from "react";

export function UndoRedoButtons({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  if (!onUndo || !onRedo) return null;
  return (
    <>
      <Button
        data-adapttable-part="undo-button"
        disabled={canUndo !== true}
        onClick={onUndo}
      >
        {undoLabel}
      </Button>
      <Button
        data-adapttable-part="redo-button"
        disabled={canRedo !== true}
        onClick={onRedo}
      >
        {redoLabel}
      </Button>
    </>
  );
}

export function ExportCsvButton({
  onExportCsv,
  exportBusy,
  exportAnnouncement = "",
  exportLabel,
  exportDisabled = false,
  exportDisabledReason = "",
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  if (!onExportCsv) return null;
  return (
    <>
      {/* antd's own loading Button: the spinner replaces its icon slot and the
          button disables itself, which is the kit's language for "working"
          rather than a bare greyed-out control. */}
      <Button
        onClick={onExportCsv}
        loading={exportBusy}
        aria-busy={exportBusy}
        disabled={exportDisabled}
        title={exportDisabled ? exportDisabledReason : undefined}
      >
        {exportLabel}
      </Button>
      <ExportAnnouncer announcement={exportAnnouncement} />
    </>
  );
}

export function PrintButton({
  onPrint,
  printLabel,
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  if (!onPrint) return null;
  return (
    <Button size="small" data-adapttable-part="print-button" onClick={onPrint}>
      {printLabel}
    </Button>
  );
}

export function DensityButton({
  density,
  onDensityChange,
  labels,
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  return (
    <Button
      size="small"
      aria-label={labels.density}
      data-adapttable-part="density-toggle"
      onClick={() => {
        onDensityChange(density === "compact" ? "comfortable" : "compact");
      }}
    >
      {density === "compact"
        ? labels.densityCompact
        : labels.densityComfortable}
    </Button>
  );
}

export function FullscreenButton({
  onToggleFullscreen,
  isFullscreen,
  labels,
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  if (!onToggleFullscreen) return null;
  return (
    <Button
      size="small"
      aria-label={
        isFullscreen === true ? labels.exitFullscreen : labels.enterFullscreen
      }
      data-adapttable-part="fullscreen-toggle"
      onClick={onToggleFullscreen}
    >
      {isFullscreen === true ? "✕" : "⛶"}
    </Button>
  );
}
