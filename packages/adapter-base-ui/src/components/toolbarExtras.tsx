/**
 * The optional toolbar controls, each drawn with Base UI's own components.
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
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Button, Flex, Progress, Spinner, Text } from "../ui";

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
  download,
}: Readonly<ExportProgressSurfaceSlotProps>): ReactNode {
  return (
    <Box
      role="region"
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      className="adapttable-card"
      style={{
        position: "fixed",
        zIndex: 1400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        padding: 16,
        boxShadow: "var(--shadow-5)",
      }}
    >
      <Flex direction="column" gap="3">
        <Text size="2" weight="bold">
          {heading}
        </Text>
        {status === "busy" ? (
          <Progress
            value={progress}
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
            <a
              href={download.url}
              download
              className="adapttable-btn"
              data-size="1"
              data-variant="solid"
              data-adapttable-part="export-progress-download"
            >
              {download.label}
            </a>
          ) : null}
        </Flex>
      </Flex>
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
