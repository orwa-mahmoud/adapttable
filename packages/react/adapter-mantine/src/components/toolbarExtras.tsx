/** The toolbar controls the composed features add, drawn with Mantine's buttons. */
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
import {
  Button as MantineButton,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import type { ReactNode } from "react";

import { Button } from "./Toolbar";

/** A long export's progress, as a Mantine paper in the corner. */
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
            <MantineButton
              variant="subtle"
              size="xs"
              onClick={dismiss.onAction}
              data-adapttable-part="export-progress-dismiss"
            >
              {dismiss.label}
            </MantineButton>
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
            <MantineButton
              variant="subtle"
              size="xs"
              onClick={cancel.onAction}
              data-adapttable-part="export-progress-cancel"
            >
              {cancel.label}
            </MantineButton>
          ) : null}
          {retry ? (
            <MantineButton
              size="xs"
              onClick={retry.onAction}
              data-adapttable-part="export-progress-retry"
            >
              {retry.label}
            </MantineButton>
          ) : null}
          {download ? (
            <MantineButton
              component="a"
              href={download.url}
              download
              size="xs"
              data-adapttable-part="export-progress-download"
            >
              {download.label}
            </MantineButton>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  );
}

function ButtonGroup({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return <MantineButton.Group>{children}</MantineButton.Group>;
}

/** Undo and redo the last edit. */
export const UndoRedoButtons = /* @__PURE__ */ createUndoRedoButtons(
  Button,
  ButtonGroup
);
/** Export to CSV, with a long export's progress. */
export const ExportCsvButton = /* @__PURE__ */ createExportCsvButton(
  Button,
  ExportProgressSurface
);
/** Print the table. */
export const PrintButton = /* @__PURE__ */ createPrintButton(Button);
/** Switch row density. */
export const DensityButton = /* @__PURE__ */ createDensityButton(Button);
/** Enter or leave fullscreen. */
export const FullscreenButton = /* @__PURE__ */ createFullscreenButton(Button);
/** Open the command palette. */
export const CommandPaletteButton =
  /* @__PURE__ */ createCommandPaletteButton(Button);
/** Open find in table. */
export const FindButton = /* @__PURE__ */ createFindButton(Button);
