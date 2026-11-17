/**
 * The toolbar controls the features add, built by the binding from Base UI's
 * toolbar buttons; the export keeps Base UI's own progress surface.
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
  type KitButtonProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import { forwardRef, type ReactNode } from "react";

import { Box, Button, Flex, Progress, Spinner, Text } from "../ui";
import { useAccentColor } from "./accent";

/** A toolbar button: soft and grey at the toolbar's size. */
const ToolbarButton = forwardRef<HTMLButtonElement, KitButtonProps>(
  function ToolbarButton(
    {
      elementRef,
      variant: _variant,
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <Button
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="2"
        variant="soft"
        color="gray"
        loading={busy}
        {...rest}
      />
    );
  }
);

/** The export button: outlined in the table's accent, a spinner while busy. */
const AccentButton = forwardRef<HTMLButtonElement, KitButtonProps>(
  function AccentButton(
    {
      elementRef,
      variant: _variant,
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      disabled,
      children,
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <Button
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="2"
        variant="outline"
        color={useAccentColor()}
        disabled={disabled === true || busy === true}
        {...rest}
      >
        {busy ? <Spinner size="1" /> : null}
        {children}
      </Button>
    );
  }
);

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

/** Undo and redo. */
export const UndoRedoButtons =
  /* @__PURE__ */ createUndoRedoButtons(ToolbarButton);

/** Export to CSV, with Base UI's progress surface for a long export. */
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
