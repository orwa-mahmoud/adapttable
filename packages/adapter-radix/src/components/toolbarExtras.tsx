/**
 * The optional toolbar controls, each drawn with Radix Themes's own components.
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
import { Button, Card, Flex, Progress, Spinner, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

import type { RadixAccentColor } from "../types";

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
  // The kit's own accent union, narrowed the way this adapter's filter
  // overlays already narrow it off the same slot contract.
  const accent = accentColor as RadixAccentColor | undefined;
  if (!onExportCsv) return null;
  return (
    <>
      <Button
        size="2"
        variant="outline"
        color={accent}
        data-adapttable-part="export-csv-button"
        onClick={onExportCsv}
        disabled={exportBusy === true || exportDisabled}
        aria-busy={exportBusy}
        title={exportDisabled ? exportDisabledReason : undefined}
      >
        {/* Radix Themes' own pattern for a working button: its Spinner
            wrapping the label, which reserves the label's width so the toolbar
            does not reflow when the export starts. */}
        <Spinner loading={exportBusy}>{exportLabel}</Spinner>
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
    <Card
      role="region"
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      size="2"
      style={{
        position: "fixed",
        zIndex: 1400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        boxShadow: "var(--shadow-5)",
      }}
    >
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center" gap="2">
          <Text size="2" weight="bold">
            {heading}
          </Text>
          {dismiss ? (
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={dismiss.onAction}
              data-adapttable-part="export-progress-dismiss"
            >
              {dismiss.label}
            </Button>
          ) : null}
        </Flex>
        {status === "busy" ? (
          <Progress
            value={progress}
            duration={progress === undefined ? "1.5s" : undefined}
            aria-label={progressLabel}
            data-adapttable-part="export-progress-bar"
          />
        ) : null}
        {message ? (
          <Text size="2" data-adapttable-part="export-progress-message">
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text
            size="2"
            color="red"
            data-adapttable-part="export-progress-message"
          >
            {error}
          </Text>
        ) : null}
        <Flex
          justify="end"
          gap="2"
          wrap="wrap"
          data-adapttable-part="export-progress-actions"
        >
          {cancel ? (
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={cancel.onAction}
              data-adapttable-part="export-progress-cancel"
            >
              {cancel.label}
            </Button>
          ) : null}
          {retry ? (
            <Button
              size="1"
              onClick={retry.onAction}
              data-adapttable-part="export-progress-retry"
            >
              {retry.label}
            </Button>
          ) : null}
          {download ? (
            <Button size="1" asChild>
              <a
                href={download.url}
                download
                data-adapttable-part="export-progress-download"
              >
                {download.label}
              </a>
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
