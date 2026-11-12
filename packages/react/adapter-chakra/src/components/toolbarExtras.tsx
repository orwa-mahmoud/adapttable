/**
 * The toolbar controls the features add, built by the binding from Chakra's
 * toolbar button; the export keeps Chakra's own progress surface.
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
import {
  Box,
  Button as ChakraButton,
  Progress,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

import { useAccentColor } from "./accent";
import { buttonOfSize } from "./kitPrimitives";

/** A toolbar button: small and outlined; a busy one shows Chakra's loader. */
const ToolbarButton = /* @__PURE__ */ buttonOfSize("sm");

/** The export button, in the table's accent colour. */
const AccentButton = /* @__PURE__ */ buttonOfSize("sm", useAccentColor);

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
            <ChakraButton
              size="xs"
              variant="ghost"
              onClick={dismiss.onAction}
              data-adapttable-part="export-progress-dismiss"
            >
              {dismiss.label}
            </ChakraButton>
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
            <ChakraButton
              size="xs"
              variant="ghost"
              onClick={cancel.onAction}
              data-adapttable-part="export-progress-cancel"
            >
              {cancel.label}
            </ChakraButton>
          ) : null}
          {retry ? (
            <ChakraButton
              size="xs"
              onClick={retry.onAction}
              data-adapttable-part="export-progress-retry"
            >
              {retry.label}
            </ChakraButton>
          ) : null}
          {download ? (
            <ChakraButton size="xs" asChild>
              <a
                href={download.url}
                download
                data-adapttable-part="export-progress-download"
              >
                {download.label}
              </a>
            </ChakraButton>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

/** Undo and redo. */
export const UndoRedoButtons =
  /* @__PURE__ */ createUndoRedoButtons(ToolbarButton);

/** Export to CSV, with Chakra's progress surface for a long export. */
export const ExportCsvButton = /* @__PURE__ */ createExportCsvButton(
  AccentButton,
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
