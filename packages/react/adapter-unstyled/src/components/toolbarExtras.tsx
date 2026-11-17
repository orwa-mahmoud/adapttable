/**
 * The toolbar controls the features add, built by the binding from native
 * buttons; each carries its part name and the class of its `classNames` key.
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
} from "@adapttable/react/adapter";
import { type CSSProperties, forwardRef, type ReactNode } from "react";

import { useClassNames, useClassOfPart } from "./classNamesContext";
import { Button } from "./kitPrimitives";

/** A toolbar button: native, with the class of its part. */
const ToolbarButton = forwardRef<HTMLButtonElement, KitButtonProps>(
  function ToolbarButton(props, ref) {
    "use no memo";
    return (
      <Button
        ref={ref}
        className={useClassOfPart(props["data-adapttable-part"])}
        {...props}
      />
    );
  }
);

const NO_WRAP: CSSProperties = { flexShrink: 0, whiteSpace: "nowrap" };

/**
 * The export button: it keeps its caption on one line and, while busy, shows
 * a spinner element the host styles; `aria-hidden`, because the announcement
 * is what a screen reader should hear.
 */
const ExportButton = forwardRef<HTMLButtonElement, KitButtonProps>(
  function ExportButton({ busy, children, ...rest }, ref) {
    "use no memo";
    const classNames = useClassNames();
    return (
      <Button
        ref={ref}
        busy={busy}
        className={classNames.exportCsvButton}
        style={NO_WRAP}
        {...rest}
      >
        {busy === true && (
          <span
            aria-hidden="true"
            data-adapttable-part="export-spinner"
            className={classNames.exportSpinner}
          />
        )}
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
  const classNames = useClassNames();
  return (
    <section
      aria-label={heading}
      data-adapttable-part="export-progress-surface"
      className={classNames.exportProgressSurface}
      style={{
        position: "fixed",
        zIndex: 1400,
        insetInlineEnd: 16,
        bottom: 16,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        padding: 16,
        border: "1px solid currentColor",
        borderRadius: 8,
        background: "Canvas",
        color: "CanvasText",
        boxShadow: "0 8px 28px rgb(0 0 0 / 18%)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <strong style={{ flex: 1 }}>{heading}</strong>
        {dismiss ? (
          <button
            type="button"
            className={classNames.exportProgressDismiss}
            onClick={dismiss.onAction}
            data-adapttable-part="export-progress-dismiss"
          >
            {dismiss.label}
          </button>
        ) : null}
      </div>
      {status === "busy" ? (
        <progress
          value={progress}
          max={100}
          aria-label={progressLabel}
          data-adapttable-part="export-progress-bar"
          className={classNames.exportProgressBar}
          style={{ display: "block", width: "100%", marginBlock: 12 }}
        />
      ) : null}
      {message ? (
        <p
          data-adapttable-part="export-progress-message"
          className={classNames.exportProgressMessage}
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          data-adapttable-part="export-progress-message"
          className={classNames.exportProgressMessage}
        >
          {error}
        </p>
      ) : null}
      <div
        data-adapttable-part="export-progress-actions"
        className={classNames.exportProgressActions}
        style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
      >
        {cancel ? (
          <button
            type="button"
            className={classNames.exportProgressCancel}
            onClick={cancel.onAction}
            data-adapttable-part="export-progress-cancel"
          >
            {cancel.label}
          </button>
        ) : null}
        {retry ? (
          <button
            type="button"
            className={classNames.exportProgressRetry}
            onClick={retry.onAction}
            data-adapttable-part="export-progress-retry"
          >
            {retry.label}
          </button>
        ) : null}
        {download ? (
          <a
            href={download.url}
            download
            className={classNames.exportProgressDownload}
            data-adapttable-part="export-progress-download"
          >
            {download.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** Undo and redo. */
export const UndoRedoButtons =
  /* @__PURE__ */ createUndoRedoButtons(ToolbarButton);

/** Export to CSV, with a native surface for a long export's progress. */
export const ExportCsvButton = /* @__PURE__ */ createExportCsvButton(
  ExportButton,
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
