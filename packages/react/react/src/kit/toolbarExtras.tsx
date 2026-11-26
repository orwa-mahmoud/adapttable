/**
 * The toolbar controls the composed features add, each built from a kit's
 * button by its own factory, so a table carries only the controls of the
 * features it composes.
 *
 * Undo and redo, CSV export with its progress and announcements, print,
 * density, fullscreen, the command palette's trigger and the find button: the
 * binding owns each caption, glyph, part name and state; the kit's button
 * draws them, an optional group holds undo and redo together, and the kit's
 * own surface shows a long export's progress.
 */
import type { ComponentType, ReactElement, ReactNode } from "react";

import type { AdapterCommandPaletteTriggerProps } from "../adapterFeatures/commandPalette";
import type { AdapterFindButtonProps } from "../adapterFeatures/findButton";
import {
  printToolbar,
  undoRedoToolbar,
  viewControlsToolbar,
} from "../chrome/toolbarChrome";
import { ExportAnnouncer } from "../export/ExportAnnouncer";
import {
  ExportProgressChrome,
  type ExportProgressSurfaceSlotProps,
} from "../export/ExportProgressChrome";
import { useFeatureState } from "../features/featureState";
import type { ToolbarEntrySlotProps } from "../features/slotKeys";
import {
  EDIT_HISTORY_STATE,
  EXPORT_STATE,
  FULLSCREEN_STATE,
  TABLE_PROPS_STATE,
} from "../features/stateKeys";
import type { KitButtonProps } from "./primitives";

/**
 * Undo and redo the last edit.
 *
 * @param Button - The kit's toolbar button.
 * @param Group - Holds the two together; absent, they sit side by side.
 *
 * @public
 */
export function createUndoRedoButtons(
  Button: ComponentType<KitButtonProps>,
  Group?: ComponentType<{ readonly children: ReactNode }>
): (props: Readonly<ToolbarEntrySlotProps>) => ReactElement | null {
  return function UndoRedoButtons({ labels }) {
    const history = useFeatureState(EDIT_HISTORY_STATE);
    const props = useFeatureState(TABLE_PROPS_STATE);
    if (!history) return null;
    const { onUndo, onRedo, canUndo, canRedo, undoLabel, redoLabel } =
      undoRedoToolbar(props?.undoRedoButtons, history, labels);
    if (!onUndo || !onRedo) return null;
    const buttons = (
      <>
        <Button
          variant="outlined"
          data-adapttable-part="undo-button"
          disabled={canUndo !== true}
          onClick={onUndo}
        >
          {undoLabel}
        </Button>
        <Button
          variant="outlined"
          data-adapttable-part="redo-button"
          disabled={canRedo !== true}
          onClick={onRedo}
        >
          {redoLabel}
        </Button>
      </>
    );
    return Group ? <Group>{buttons}</Group> : buttons;
  };
}

/**
 * Export to CSV, with a long export's progress and its announcements.
 *
 * @param Button - The kit's toolbar button.
 * @param Surface - The kit's surface for a long export's progress.
 *
 * @public
 */
export function createExportCsvButton(
  Button: ComponentType<KitButtonProps>,
  Surface: (props: ExportProgressSurfaceSlotProps) => ReactNode
): (props: Readonly<ToolbarEntrySlotProps>) => ReactElement | null {
  const slots = { Surface };
  return function ExportCsvButton({ labels }) {
    const state = useFeatureState(EXPORT_STATE);
    if (!state?.onExportCsv) return null;
    const {
      onExportCsv,
      exportBusy,
      exportAnnouncement = "",
      exportProgressState = null,
      exportLabel,
      exportDisabled = false,
      exportDisabledReason = "",
    } = state;
    return (
      <>
        <Button
          variant="outlined"
          data-adapttable-part="export-csv-button"
          busy={exportBusy}
          aria-busy={exportBusy}
          disabled={exportDisabled}
          title={exportDisabled ? exportDisabledReason : undefined}
          onClick={onExportCsv}
        >
          {exportLabel}
        </Button>
        <ExportProgressChrome
          progress={exportProgressState}
          labels={labels}
          slots={slots}
        />
        <ExportAnnouncer announcement={exportAnnouncement} />
      </>
    );
  };
}

/**
 * Print the table.
 *
 * @public
 */
export function createPrintButton(
  Button: ComponentType<KitButtonProps>
): (props: Readonly<ToolbarEntrySlotProps>) => ReactElement | null {
  return function PrintButton({ labels }) {
    const props = useFeatureState(TABLE_PROPS_STATE);
    const { onPrint, printLabel } = printToolbar(
      props?.printButton,
      props?.onPrint,
      labels
    );
    if (!onPrint) return null;
    return (
      <Button
        variant="outlined"
        data-adapttable-part="print-button"
        onClick={onPrint}
      >
        {printLabel}
      </Button>
    );
  };
}

/**
 * Switch between comfortable and compact rows.
 *
 * @public
 */
export function createDensityButton(
  Button: ComponentType<KitButtonProps>
): (props: Readonly<ToolbarEntrySlotProps>) => ReactElement | null {
  return function DensityButton({ labels }) {
    const props = useFeatureState(TABLE_PROPS_STATE);
    if (!props) return null;
    const { density, onDensityChange } = props;
    const compact = density === "compact";
    return (
      <Button
        variant="outlined"
        aria-label={labels.density}
        data-adapttable-part="density-toggle"
        onClick={() => onDensityChange(compact ? "comfortable" : "compact")}
      >
        {compact ? labels.densityCompact : labels.densityComfortable}
      </Button>
    );
  };
}

/**
 * Enter or leave fullscreen.
 *
 * @public
 */
export function createFullscreenButton(
  Button: ComponentType<KitButtonProps>
): (props: Readonly<ToolbarEntrySlotProps>) => ReactElement | null {
  return function FullscreenButton({ labels }) {
    const props = useFeatureState(TABLE_PROPS_STATE);
    const fullscreen = useFeatureState(FULLSCREEN_STATE);
    if (!props || !fullscreen) return null;
    const { onToggleFullscreen, isFullscreen } = viewControlsToolbar(
      props,
      fullscreen
    );
    if (!onToggleFullscreen) return null;
    const on = isFullscreen === true;
    return (
      <Button
        variant="outlined"
        aria-label={on ? labels.exitFullscreen : labels.enterFullscreen}
        data-adapttable-part="fullscreen-toggle"
        onClick={onToggleFullscreen}
      >
        {on ? "\u2715" : "\u26f6"}
      </Button>
    );
  };
}

/**
 * Open the command palette.
 *
 * @public
 */
export function createCommandPaletteButton(
  Button: ComponentType<KitButtonProps>
): (props: Readonly<AdapterCommandPaletteTriggerProps>) => ReactElement {
  return function CommandPaletteButton({ labels, onOpenPalette, paletteOpen }) {
    return (
      <Button
        variant="outlined"
        data-adapttable-part="command-palette-button"
        aria-haspopup="dialog"
        aria-expanded={paletteOpen}
        onClick={onOpenPalette}
      >
        {labels.commandPalette}
      </Button>
    );
  };
}

/**
 * Open find in table.
 *
 * @public
 */
export function createFindButton(
  Button: ComponentType<KitButtonProps>
): (props: Readonly<AdapterFindButtonProps>) => ReactElement {
  return function FindButton({ labels, onOpenFind, findOpen }) {
    return (
      <Button
        variant="outlined"
        data-adapttable-part="find-button"
        aria-expanded={findOpen}
        onClick={onOpenFind}
      >
        {labels.findInTable}
      </Button>
    );
  };
}
