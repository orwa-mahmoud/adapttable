/**
 * The toolbar controls the features add, built by the binding from antd's
 * buttons; the export keeps antd's own progress surface.
 */
import {
  createCommandPaletteButton,
  createDensityButton,
  createExportCsvButton,
  createFindButton,
  createFullscreenButton,
  createPrintButton,
  createUndoRedoButtons,
  type ExportProgressSurfaceSlotProps,
} from "@adapttable/react/adapter";
import { Button, Card, Flex, Progress, Spin, Typography } from "antd";
import type { ReactNode } from "react";

import { Button as ToolbarButton, buttonOfType } from "./kitPrimitives";

/** Undo, redo and export: antd's default-size buttons. */
const WideButton = /* @__PURE__ */ buttonOfType("link", "middle");

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

/** Undo and redo. */
export const UndoRedoButtons =
  /* @__PURE__ */ createUndoRedoButtons(WideButton);

/** Export to CSV, with antd's progress surface for a long export. */
export const ExportCsvButton = /* @__PURE__ */ createExportCsvButton(
  WideButton,
  ExportProgressSurface
);

/** Print the table. */
export const PrintButton = /* @__PURE__ */ createPrintButton(ToolbarButton);

/** Switch between comfortable and compact rows. */
export const DensityButton = /* @__PURE__ */ createDensityButton(ToolbarButton);

/** Enter or leave fullscreen. */
export const FullscreenButton =
  /* @__PURE__ */ createFullscreenButton(ToolbarButton);

/** Open the command palette. */
export const CommandPaletteButton =
  /* @__PURE__ */ createCommandPaletteButton(ToolbarButton);

/** Open find in the table. */
export const FindButton = /* @__PURE__ */ createFindButton(ToolbarButton);
