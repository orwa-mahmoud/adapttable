/**
 * The optional toolbar controls, each drawn with Mantine's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  ExportAnnouncer,
  ExportProgressChrome,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/react/adapter";
import {
  Button,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
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
      {/* Mantine's own loading Button: it swaps in the kit's Loader and
          blocks interaction itself, which reads as "working" rather than as a
          control that has been switched off. */}
      <Button
        variant="default"
        size="sm"
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
        <Loader
          size="sm"
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
        />
      ) : (
        <Progress
          value={progress}
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
        />
      );
  }
  return (
    <Paper
      role="region"
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      shadow="lg"
      withBorder
      p="md"
      style={{
        position: "fixed",
        zIndex: 400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text fw={600} size="sm">
            {heading}
          </Text>
          {dismiss ? (
            <Button
              variant="subtle"
              size="xs"
              onClick={dismiss.onAction}
              data-adapttable-part="export-progress-dismiss"
            >
              {dismiss.label}
            </Button>
          ) : null}
        </Group>
        {progressIndicator}
        {message ? (
          <Text size="sm" data-adapttable-part="export-progress-message">
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text
            size="sm"
            c="red"
            data-adapttable-part="export-progress-message"
          >
            {error}
          </Text>
        ) : null}
        <Group
          justify="flex-end"
          gap="xs"
          data-adapttable-part="export-progress-actions"
        >
          {cancel ? (
            <Button
              variant="subtle"
              size="xs"
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
            <Button
              component="a"
              href={download.url}
              download
              size="xs"
              data-adapttable-part="export-progress-download"
            >
              {download.label}
            </Button>
          ) : null}
        </Group>
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
