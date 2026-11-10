import { type SortByOption, type TableLabels } from "@adapttable/core";
import {
  FilterTriggerToggleState,
  printToolbarProps,
  undoRedoToolbarProps,
  viewControlsToolbarProps,
} from "@adapttable/core/binding";
import { type ReactNode, useCallback, useState } from "react";

import type { EditHistoryState } from "../editing/editHistory";
import type {
  ExportProgressState,
  ExportStatus,
} from "../export/useExportHandler";
import type { ToolbarSlots } from "../props";
import { type UseDataTableResult } from "../useDataTable/useDataTable";

/**
 * The shared prop surface every adapter's toolbar sub-component needs.
 * Adapters render kit-specific markup from this; extracting it keeps the
 * identical shape from being re-declared (and flagged as duplication) in
 * each adapter.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface ToolbarChromeProps<TRow> {
  /** The headless table state + prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Render the search input (default `true`). */
  searchable?: boolean;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Options for an explicit sort-by control. */
  sortByOptions?: SortByOption[];
  /** Extra caller-supplied toolbar content, in the middle region. */
  toolbar?: ReactNode;
  /** Caller-supplied content for the two ends of the toolbar. */
  toolbarSlots?: ToolbarSlots;
  /**
   * Put the last edit back. Set only when the host asked for the buttons
   * (`undoRedoButtons`) AND `editHistory` is armed, so an adapter renders
   * the pair on presence and never has to check two things.
   */
  onUndo?: () => void;
  /** Do the last undone edit again. Present with `onUndo`. */
  onRedo?: () => void;
  /**
   * Whether there is anything to undo. The button is disabled, not
   * hidden — a control that vanishes moves the ones beside it, and a
   * toolbar that reflows while someone is working is worse than a button
   * that is briefly unavailable.
   */
  canUndo?: boolean;
  /** Whether there is anything to redo. */
  canRedo?: boolean;
  /** `labels.undoEdit` — the undo button's caption. */
  undoLabel?: string;
  /** `labels.redoEdit` — the redo button's caption. */
  redoLabel?: string;
  /**
   * Open the print dialog. Set only when the host asked for the button
   * (`printButton`) AND wired `onPrint`, so an adapter renders on presence
   * and never has to check two things.
   */
  onPrint?: () => void;
  /** `labels.print` — the print button's caption. */
  printLabel?: string;
  /** The density the table is rendering. */
  density: "comfortable" | "compact";
  /** Request a density change. */
  onDensityChange: (next: "comfortable" | "compact") => void;
  /** Toggle fullscreen. Present iff asked for AND the browser allows it. */
  onToggleFullscreen?: () => void;
  /** Whether the table is fullscreen right now, for the button's state. */
  isFullscreen?: boolean;
  /** Whether a filters affordance should render. */
  hasFilters: boolean;
  /** Number shown on the filters badge. */
  activeFilterCount: number;
  /** Whether the filter container is open (drives `aria-expanded`). */
  filtersOpen: boolean;
  /** Toggle the filter container (popover and drawer alike). */
  onToggleFilters: () => void;
  /**
   * Bind to the trigger's `onPointerDown` (see
   * `useFilterTriggerToggle`) so a click on the open trigger CLOSES
   * the popover instead of racing the kit's outside-close and reopening.
   */
  onFiltersTriggerPointerDown?: () => void;
  /** Whether to show the rows-per-page control (infinite mode). */
  showRowsPerPage: boolean;
  /**
   * Built saved-views menu node, when the feature is composed. Renders
   * ahead of `columnMenu` so every adapter's toolbar reads
   * Filters · Saved views · Columns · Export CSV.
   */
  savedViewsMenu?: ReactNode;
  /** Built column-menu node, when `enableColumnMenu` is set. */
  columnMenu?: ReactNode;
  /**
   * When set, render the Export CSV toolbar button and call this on click.
   * Built by `makeExportCsvHandler` from the export feature's configuration.
   */
  onExportCsv?: () => void;
  /**
   * True while a host-handled export is still running.
   *
   * Adapters disable the Export button and mark it busy, so the same export
   * cannot be started twice and the user can see that something is happening.
   * Always false for the built-in browser export, which is synchronous.
   */
  exportBusy?: boolean;
  /**
   * What the last export did, including a reader-cancelled host job.
   */
  exportStatus?: ExportStatus;
  /**
   * Live-region text for the last export's outcome, empty until there is one.
   * Adapters render it through `ExportAnnouncer` beside the button: a download
   * is silent, so without it a screen-reader user cannot tell a finished export
   * from a failed one.
   */
  exportAnnouncement?: string;
  /** Server-built progress surface state; absent for browser-built exports. */
  exportProgressState?: ExportProgressState | null;
  /**
   * The export button's caption, naming the format it produces — CSV by
   * default, the writer's format otherwise, localized either way. Adapters
   * render this rather than `labels.exportCsv`, so a button never names a file
   * the user is not getting.
   */
  exportLabel?: string;
  /**
   * The host asked for an export the source cannot cover. Adapters render the
   * Export button disabled rather than writing a narrower file than the button
   * offered.
   */
  exportDisabled?: boolean;
  /** Why the Export button is disabled, localized; empty while it is not. */
  exportDisabledReason?: string;
  /**
   * When set, render an Add-row control and call this on click. Present iff
   * the host wired `onAddRow`, so the toolbar needs no second guard.
   */
  onAddRow?: () => void;
  /** The Add control's caption, already localized. */
  addRowLabel?: string;
  /** Text direction, for adapters whose toolbar needs explicit RTL hints. */
  dir?: "ltr" | "rtl";
}

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
): Partial<ToolbarChromeProps<TRow>> {
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
 * Not generic, unlike {@link undoRedoToolbar}: neither prop mentions the row
 * type, and a `Partial<ToolbarChromeProps<TRow>>` return with no `TRow` in the
 * arguments infers `unknown` and widens the whole spread at every call site.
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
