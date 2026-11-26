import { type TableLabels } from "@adapttable/core";
import {
  FilterTriggerToggleState,
  printToolbarProps,
  type UndoRedoToolbarProps,
  undoRedoToolbarProps,
  viewControlsToolbarProps,
} from "@adapttable/core/binding";
import { useCallback, useState } from "react";

import type { EditHistoryState } from "../editing/editHistory";

/**
 * The resolved density contract and the optional fullscreen toggle.
 *
 * Density is always readable and writable; feature composition decides whether
 * a control renders for it. The fullscreen half folds in whether the browser
 * will allow it at all.
 *
 * @public
 */
export interface ViewControlsToolbar {
  /** Current row density. */
  density: "comfortable" | "compact";
  /** Request a density change. */
  onDensityChange: (next: "comfortable" | "compact") => void;
  /** Enters or leaves fullscreen, absent when it is unavailable. */
  onToggleFullscreen?: () => void;
  /** Whether the table is currently fullscreen. */
  isFullscreen?: boolean;
}

/**
 * The density and fullscreen half of a toolbar's props.
 *
 * @public
 */
export function viewControlsToolbar(
  props: {
    density: "comfortable" | "compact";
    onDensityChange: (next: "comfortable" | "compact") => void;
    fullscreen?: boolean;
  },
  fullscreen: { supported: boolean; active: boolean; toggle: () => void }
): ViewControlsToolbar {
  return viewControlsToolbarProps(props, fullscreen);
}

/**
 * The undo/redo half of a toolbar's props.
 *
 * @public
 */
export function undoRedoToolbar<TRow>(
  wanted: boolean | undefined,
  history: EditHistoryState<TRow>,
  labels: TableLabels
): UndoRedoToolbarProps {
  return undoRedoToolbarProps(wanted, history, labels);
}

/**
 * The print button's half of a toolbar's props.
 *
 * @public
 */
export interface PrintToolbar {
  /** Runs the print layout, absent when printing is off. */
  onPrint?: () => void;
  /** Caption for the print control. */
  printLabel?: string;
}

/**
 * The print button's half of a toolbar's props, or nothing at all.
 *
 * Two conditions again — the host asked for the button, and there is a handler
 * for it to call — resolved here so an adapter renders on `onPrint` being
 * present. `onPrint` alone stays what it has always been: a palette command.
 *
 * @public
 */
export function printToolbar(
  wanted: boolean | undefined,
  onPrint: (() => void) | undefined,
  labels: TableLabels
): PrintToolbar {
  return printToolbarProps(wanted, onPrint, labels);
}

/**
 * Pointer/click handlers returned by `useFilterTriggerToggle`.
 *
 * @public
 */
export interface FilterTriggerToggle {
  /** Records that the press began on the trigger. */
  onPointerDown: () => void;
  /** Opens or closes the overlay, ignoring a click that closed it already. */
  onClick: () => void;
}

/**
 * A toggle for the Filters trigger that survives every kit's outside-close
 * behavior. Some kits (Chakra `closeOnBlur`, outside `mousedown` handlers)
 * close the popover on the trigger's own pointer-down — a plain
 * `setOpen(o => !o)` on click then instantly REOPENS it, so the button can
 * never close the popover. This records whether the popover was open at
 * pointer-down: if the kit closed it in between, the click is swallowed;
 * otherwise the click toggles normally (kits that exclude the trigger from
 * outside-close keep working unchanged).
 */
/**
 * Pointer and click handlers that open the filters overlay without double-firing.
 *
 * @public
 */
export function useFilterTriggerToggle(
  open: boolean,
  setOpen: (next: boolean | ((current: boolean) => boolean)) => void
): FilterTriggerToggle {
  const [toggle] = useState(() => new FilterTriggerToggleState());
  return {
    onPointerDown: useCallback(() => {
      toggle.pointerDown(open);
    }, [open, toggle]),
    onClick: useCallback(() => {
      if (toggle.click(open)) setOpen((current) => !current);
    }, [open, setOpen, toggle]),
  };
}
