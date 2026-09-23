/**
 * The optional toolbar controls, each drawn with Chakra's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  type AdapterCommandPaletteTriggerProps,
  ExportAnnouncer,
  ExportProgressChrome,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/react/adapter";
import { Box, Button, Progress, Spinner, Stack, Text } from "@chakra-ui/react";
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
    accentColor,
    labels,
  } = props;
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
        data-adapttable-part="export-csv-button"
        onClick={onExportCsv}
        loading={exportBusy}
        aria-busy={exportBusy}
        disabled={exportDisabled}
        title={exportDisabled ? exportDisabledReason : undefined}
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
  let progressIndicator: ReactNode = null;
  if (status === "busy") {
    progressIndicator =
      progress === undefined ? (
        <Spinner
          size="sm"
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
        />
      ) : (
        <Progress.Root
          value={progress}
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
        >
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      );
  }
  return (
    <Box
      role="region"
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      position="fixed"
      zIndex={1400}
      insetInlineEnd="4"
      bottom="4"
      width="320px"
      maxWidth="calc(100vw - 32px)"
      padding="4"
      borderWidth="1px"
      borderRadius="md"
      bg="bg.panel"
      boxShadow="lg"
    >
      <Stack gap="3">
        <Stack direction="row" justify="space-between" align="center">
          <Text fontWeight="semibold" fontSize="sm">
            {heading}
          </Text>
          {dismiss ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={dismiss.onAction}
              data-adapttable-part="export-progress-dismiss"
            >
              {dismiss.label}
            </Button>
          ) : null}
        </Stack>
        {progressIndicator}
        {message ? (
          <Text fontSize="sm" data-adapttable-part="export-progress-message">
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text
            fontSize="sm"
            color="fg.error"
            data-adapttable-part="export-progress-message"
          >
            {error}
          </Text>
        ) : null}
        <Stack
          direction="row"
          justify="flex-end"
          data-adapttable-part="export-progress-actions"
        >
          {cancel ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={cancel.onAction}
              data-adapttable-part="export-progress-cancel"
            >
              {cancel.label}
            </Button>
          ) : null}
          {retry ? (
            <Button
              size="xs"
              onClick={retry.onAction}
              data-adapttable-part="export-progress-retry"
            >
              {retry.label}
            </Button>
          ) : null}
          {download ? (
            <Button size="xs" asChild>
              <a
                href={download.url}
                download
                data-adapttable-part="export-progress-download"
              >
                {download.label}
              </a>
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
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

export function CommandPaletteButton({
  labels,
  onOpenPalette,
  paletteOpen,
}: Readonly<AdapterCommandPaletteTriggerProps>): ReactNode {
  return (
    <Button
      size="sm"
      variant="outline"
      data-adapttable-part="command-palette-button"
      aria-haspopup="dialog"
      aria-expanded={paletteOpen}
      onClick={onOpenPalette}
    >
      {labels.commandPalette}
    </Button>
  );
}
