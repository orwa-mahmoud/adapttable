/**
 * The optional toolbar controls, each drawn with Chakra's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  ExportAnnouncer,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import { Button } from "@chakra-ui/react";
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
        size="sm"
        variant="outline"
        data-adapttable-part="undo-button"
        disabled={canUndo !== true}
        onClick={onUndo}
      >
        {undoLabel}
      </Button>
      <Button
        size="sm"
        variant="outline"
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
  accentColor,
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  if (!onExportCsv) return null;
  return (
    <>
      {/* Chakra's own loading Button: its Spinner replaces the label and the
          control blocks itself, which is the kit's own vocabulary for work in
          progress. */}
      <Button
        size="sm"
        variant="outline"
        colorPalette={accentColor}
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
    <Button
      size="sm"
      variant="outline"
      data-adapttable-part="print-button"
      onClick={onPrint}
    >
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
      size="sm"
      variant="outline"
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
      size="sm"
      variant="outline"
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
