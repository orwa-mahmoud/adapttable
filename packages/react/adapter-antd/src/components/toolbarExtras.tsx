/**
 * The optional toolbar controls, each drawn with antd's own components.
 *
 * They render through `TOOLBAR_EXTRAS`, so the button and the feature that
 * makes it work arrive together: a table that never imports `/export` carries
 * neither the handler nor this button.
 */
import {
  type AdapterCommandPaletteTriggerProps,
  type AdapterFindButtonProps,
  ExportAnnouncer,
  ExportProgressChrome,
  type ExportProgressSurfaceSlotProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/react/adapter";
import { Button, Card, Flex, Progress, Spin, Typography } from "antd";
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
      {/* antd's own loading Button: the spinner replaces its icon slot and the
          button disables itself, which is the kit's language for "working"
          rather than a bare greyed-out control. */}
      <Button
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
        <Spin
          size="small"
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
        />
      ) : (
        <Progress
          percent={progress}
          size="small"
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
        />
      );
  }
  return (
    <Card
      role="region"
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      size="small"
      title={heading}
      extra={
        dismiss ? (
          <Button
            size="small"
            type="text"
            onClick={dismiss.onAction}
            data-adapttable-part="export-progress-dismiss"
          >
            {dismiss.label}
          </Button>
        ) : undefined
      }
      style={{
        position: "fixed",
        zIndex: 1400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 8px 28px rgb(0 0 0 / 18%)",
      }}
    >
      <Flex vertical gap="small">
        {progressIndicator}
        {message ? (
          <Typography.Text data-adapttable-part="export-progress-message">
            {message}
          </Typography.Text>
        ) : null}
        {error ? (
          <Typography.Text
            type="danger"
            data-adapttable-part="export-progress-message"
          >
            {error}
          </Typography.Text>
        ) : null}
        <Flex
          justify="flex-end"
          gap="small"
          wrap
          data-adapttable-part="export-progress-actions"
        >
          {cancel ? (
            <Button
              size="small"
              type="text"
              onClick={cancel.onAction}
              data-adapttable-part="export-progress-cancel"
            >
              {cancel.label}
            </Button>
          ) : null}
          {retry ? (
            <Button
              size="small"
              type="primary"
              onClick={retry.onAction}
              data-adapttable-part="export-progress-retry"
            >
              {retry.label}
            </Button>
          ) : null}
          {download ? (
            <Button
              size="small"
              type="primary"
              href={download.url}
              download
              data-adapttable-part="export-progress-download"
            >
              {download.label}
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Card>
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

export function CommandPaletteButton({
  labels,
  onOpenPalette,
  paletteOpen,
}: Readonly<AdapterCommandPaletteTriggerProps>): ReactNode {
  return (
    <Button
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

export function FindButton({
  labels,
  onOpenFind,
  findOpen,
}: Readonly<AdapterFindButtonProps>): ReactNode {
  return (
    <Button
      size="small"
      data-adapttable-part="find-button"
      aria-expanded={findOpen}
      onClick={onOpenFind}
    >
      {labels.findInTable}
    </Button>
  );
}
