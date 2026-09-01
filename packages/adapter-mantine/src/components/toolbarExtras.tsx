/**
 * The optional toolbar controls, each drawn with Mantine's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  ExportAnnouncer,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import { Button } from "@mantine/core";
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
    <Button.Group>
      <Button
        variant="default"
        size="sm"
        data-adapttable-part="undo-button"
        disabled={canUndo !== true}
        onClick={onUndo}
      >
        {undoLabel}
      </Button>
      <Button
        variant="default"
        size="sm"
        data-adapttable-part="redo-button"
        disabled={canRedo !== true}
        onClick={onRedo}
      >
        {redoLabel}
      </Button>
    </Button.Group>
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
      {/* Mantine's own loading Button: it swaps in the kit's Loader and
          blocks interaction itself, which reads as "working" rather than as a
          control that has been switched off. */}
      <Button
        variant="default"
        size="sm"
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
      variant="default"
      size="sm"
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
      variant="default"
      size="sm"
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
      variant="default"
      size="sm"
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
