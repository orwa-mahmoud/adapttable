/**
 * The named positions a table asks features to fill, and the props it hands
 * each one.
 *
 * A slot's id and props are the contract between the table and every kit
 * that draws into it, in whichever framework: the table computes the props,
 * the kit answers with its own components. Props that carry rendered content
 * take the binding's render node as `TNode` (`ReactNode` in React); the keys
 * declared here carry `unknown` there, and a binding re-declares a key with
 * its own node type when it needs the render callback typed.
 */
import type {
  ColumnMenuLabels,
  ColumnMenuSlotProps,
} from "../columns/columnMenuModel";
import type { ActiveFilterChipsSlotProps } from "../filters/activeFilterChips";
import type { Direction, TableLabels } from "../types";
import { featureSlotKey } from "./featureKeys";

/**
 * The Columns menu in the toolbar.
 *
 * The row type is erased to `never` because a slot key is one module-level
 * constant serving every table. Callers pass that table's columns and layout;
 * the renderer only reads them.
 *
 * @public
 */
export const COLUMN_MENU = featureSlotKey<ColumnMenuSlotProps<never>>(
  "column-menu",
  { single: true }
);

/**
 * Props for a kit-owned direct column-name editor in a semantic header.
 *
 * @typeParam TNode - The binding's render node (`ReactNode` in React).
 *
 * @public
 */
export interface ColumnHeaderRenameSlotProps<TNode = unknown> {
  /** Stable column identity; renaming never changes this value. */
  columnKey: string;
  /** Current prose display name. */
  name: string;
  /** Pre-translated rename form labels and announcement builder. */
  labels: ColumnMenuLabels;
  /** Commit a trimmed, validated display name. */
  onRenameColumn: (key: string, name: string) => void;
  /** Existing caption/sort control, rendered by adapters that replace it while editing. */
  children?: TNode;
}

/**
 * Direct header entry point supplied by the optional Columns-menu feature.
 *
 * The adapter root renders only this inert slot boundary. The kit input and its
 * rename controller enter the graph when the host imports `columnMenu()`.
 *
 * @public
 */
export const COLUMN_HEADER_RENAME = featureSlotKey<ColumnHeaderRenameSlotProps>(
  "column-header-rename",
  { single: true }
);

/**
 * Removable chips for the active filters.
 *
 * @public
 */
export const ACTIVE_FILTER_CHIPS = featureSlotKey<ActiveFilterChipsSlotProps>(
  "active-filter-chips",
  { single: true }
);

/**
 * Drawer or popover chrome around the filters form.
 *
 * @typeParam TNode - The binding's render node (`ReactNode` in React).
 *
 * @public
 */
export interface FilterOverlaySlotProps<TNode = unknown> {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Dismiss the overlay. */
  onClose: () => void;
  /** The filter fields to render inside. */
  filters: TNode;
  /** How many filters are currently set. */
  activeFilterCount: number;
  /** Clears every active filter. */
  onClearFilters: () => void;
  /** Resolved labels. */
  labels: Required<TableLabels>;
  /** Writing direction. */
  dir?: Direction;
  /** The Filters button, for the popover anchor. */
  anchorEl?: HTMLElement | null;
  /** Kit toolbars that wrap the trigger inside the popover pass it here. */
  children?: TNode;
  /** Kit accent token some overlays paint with. */
  accentColor?: string;
}

/**
 * The slide-in filters drawer.
 *
 * @public
 */
export const FILTER_DRAWER = featureSlotKey<FilterOverlaySlotProps>(
  "filter-drawer",
  { single: true }
);

/**
 * The anchored filters popover.
 *
 * @public
 */
export const FILTER_POPOVER = featureSlotKey<FilterOverlaySlotProps>(
  "filter-popover",
  { single: true }
);

/**
 * Row-detail / tree expand chevron.
 *
 * @public
 */
export interface ExpandToggleSlotProps {
  /** Row or node id this toggle controls. */
  id: string;
  /** Whether the row is expanded. */
  expanded: boolean;
  /** Flip expansion for an id. */
  onToggle: (id: string) => void;
  /** Writing direction. */
  dir?: Direction;
  /** Accessible expand label. */
  expandLabel: string;
  /** Accessible collapse label. */
  collapseLabel: string;
}

/**
 * The expand/collapse control.
 *
 * `rowDetail` and `nestedTable` both fill it, and a row opens one panel, so
 * the slot is single: composing both draws one control per row.
 *
 * @public
 */
export const EXPAND_TOGGLE = featureSlotKey<ExpandToggleSlotProps>(
  "expand-toggle",
  { single: true }
);

/**
 * Live region for row reorder.
 *
 * @public
 */
export const ROW_REORDER_ANNOUNCER = featureSlotKey<{
  announcement: string;
}>("row-reorder-announcer", { single: true });
