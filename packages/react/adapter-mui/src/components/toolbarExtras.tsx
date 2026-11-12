/** The toolbar controls the composed features add, drawn with MUI's buttons. */
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
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

import { Button as KitButton } from "./primitives";

/** A long export's progress, as a raised MUI paper in the corner. */
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

/** Undo and redo the last edit. */
export const UndoRedoButtons = /* @__PURE__ */ createUndoRedoButtons(KitButton);
/** Export to CSV, with a long export's progress. */
export const ExportCsvButton = /* @__PURE__ */ createExportCsvButton(
  KitButton,
  ExportProgressSurface
);
/** Print the table. */
export const PrintButton = /* @__PURE__ */ createPrintButton(KitButton);
/** Switch row density. */
export const DensityButton = /* @__PURE__ */ createDensityButton(KitButton);
/** Enter or leave fullscreen. */
export const FullscreenButton =
  /* @__PURE__ */ createFullscreenButton(KitButton);
/** Open the command palette. */
export const CommandPaletteButton =
  /* @__PURE__ */ createCommandPaletteButton(KitButton);
/** Open find in table. */
export const FindButton = /* @__PURE__ */ createFindButton(KitButton);
