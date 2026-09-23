import {
  type AdapterCommandPaletteTriggerProps,
  ExportAnnouncer,
  ExportProgressChrome,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/react/adapter";
import {
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
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
  if (!onExportCsv) return null;
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        data-adapttable-part="export-csv-button"
        onClick={onExportCsv}
        disabled={exportBusy === true || exportDisabled}
        aria-busy={exportBusy}
        title={exportDisabled ? exportDisabledReason : undefined}
        startIcon={
          exportBusy ? (
            <CircularProgress size={14} color="inherit" />
          ) : undefined
        }
      >
        {exportLabel}
      </Button>
      <ExportProgressChrome
        progress={exportProgressState}
        labels={labels}
        slots={{ Surface: ExportProgressSurface }}
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
  dismiss,
  download,
}: Readonly<ExportProgressSurfaceSlotProps>): ReactNode {
  return (
    <Paper
      role="region"
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      elevation={8}
      sx={{
        position: "fixed",
        zIndex: 1400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        p: 2,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="subtitle2">{heading}</Typography>
          {dismiss ? (
            <Button
              size="small"
              onClick={dismiss.onAction}
              data-adapttable-part="export-progress-dismiss"
            >
              {dismiss.label}
            </Button>
          ) : null}
        </Stack>
        {status === "busy" ? (
          <LinearProgress
            variant={progress === undefined ? "indeterminate" : "determinate"}
            value={progress}
            aria-label={progressLabel}
            data-adapttable-part="export-progress-bar"
          />
        ) : null}
        {message ? (
          <Typography
            variant="body2"
            data-adapttable-part="export-progress-message"
          >
            {message}
          </Typography>
        ) : null}
        {error ? (
          <Typography
            variant="body2"
            color="error"
            data-adapttable-part="export-progress-message"
          >
            {error}
          </Typography>
        ) : null}
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "flex-end" }}
          data-adapttable-part="export-progress-actions"
        >
          {cancel ? (
            <Button
              size="small"
              onClick={cancel.onAction}
              data-adapttable-part="export-progress-cancel"
            >
              {cancel.label}
            </Button>
          ) : null}
          {retry ? (
            <Button
              size="small"
              variant="contained"
              onClick={retry.onAction}
              data-adapttable-part="export-progress-retry"
            >
              {retry.label}
            </Button>
          ) : null}
          {download ? (
            <Button
              size="small"
              variant="contained"
              href={download.url}
              download
              data-adapttable-part="export-progress-download"
            >
              {download.label}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
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

export function CommandPaletteButton({
  labels,
  onOpenPalette,
  paletteOpen,
}: Readonly<AdapterCommandPaletteTriggerProps>): ReactNode {
  return (
    <Button
      variant="outlined"
      size="small"
      data-adapttable-part="command-palette-button"
      aria-haspopup="dialog"
      aria-expanded={paletteOpen}
      onClick={onOpenPalette}
    >
      {labels.commandPalette}
    </Button>
  );
}
