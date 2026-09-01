/**
 * The optional toolbar controls, each drawn with Base UI's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  ExportAnnouncer,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

import type { BaseUiAccentColor } from "../types";
import { Button, Spinner } from "../ui";

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
        size="2"
        variant="soft"
        color="gray"
        data-adapttable-part="undo-button"
        disabled={canUndo !== true}
        onClick={onUndo}
      >
        {undoLabel}
      </Button>
      <Button
        size="2"
        variant="soft"
        color="gray"
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
  labels,
}: Readonly<ToolbarExtrasSlotProps>): ReactNode {
  // The kit's own accent union, narrowed the way this adapter's filter
  // overlays already narrow it off the same slot contract.
  const accent = accentColor as BaseUiAccentColor | undefined;
  if (!onExportCsv) return null;
  return (
    <>
      <Button
        size="2"
        variant="outline"
        color={accent}
        onClick={onExportCsv}
        disabled={exportBusy === true || exportDisabled}
        aria-busy={exportBusy}
        title={exportDisabled ? exportDisabledReason : undefined}
      >
        {/* This adapter's own Spinner — the same one the filter form uses
            while options load, so "working" looks the same everywhere in the
            kit. */}
        {exportBusy && <Spinner size="1" label={labels.loading} />}
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
      size="2"
      variant="soft"
      color="gray"
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
      size="2"
      variant="soft"
      color="gray"
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
      size="2"
      variant="soft"
      color="gray"
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
