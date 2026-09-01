import {
  ExportAnnouncer,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import { Button, CircularProgress } from "@mui/material";
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
        variant="outlined"
        size="small"
        data-adapttable-part="undo-button"
        disabled={canUndo !== true}
        onClick={onUndo}
      >
        {undoLabel}
      </Button>
      <Button
        variant="outlined"
        size="small"
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
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  if (!onExportCsv) return null;
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={onExportCsv}
        disabled={exportBusy}
        aria-busy={exportBusy}
        startIcon={
          exportBusy ? (
            <CircularProgress size={14} color="inherit" />
          ) : undefined
        }
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
      variant="outlined"
      size="small"
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
  if (!onDensityChange) return null;
  return (
    <Button
      variant="outlined"
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
      variant="outlined"
      size="small"
      aria-label={
        isFullscreen === true ? labels.exitFullscreen : labels.enterFullscreen
      }
      data-adapttable-part="fullscreen-toggle"
      onClick={onToggleFullscreen}
    >
      {isFullscreen === true ? "\u2715" : "\u26f6"}
    </Button>
  );
}
