/**
 * Names the main entry still serves for code written against it. Each is
 * machinery the kits build on, and each is the same value or type
 * `@adapttable/react/adapter` exports, so it compares equal across imports.
 */
import * as useShortcutsModule from "./actions/useShortcuts";
import * as scrollResetModule from "./chrome/scrollReset";
import * as toolbarChromeModule from "./chrome/toolbarChrome";
import * as columnHeaderModule from "./columns/columnHeader";
import * as columnReorderModule from "./columns/columnReorder";
import * as resolveColumnsModule from "./columns/resolveColumns";
import * as editHistoryModule from "./editing/editHistory";
import * as useTableEngineModule from "./engine/useTableEngine";
import * as useActiveFilterChipsModule from "./filters/useActiveFilterChips";
import * as useExtraChipsModule from "./filters/useExtraChips";
import * as useFindInTableModule from "./find/useFindInTable";
import * as useColorSchemeModule from "./hooks/useColorScheme";
import * as useDebounceModule from "./hooks/useDebounce";
import * as usePrefersReducedMotionModule from "./hooks/usePrefersReducedMotion";
import * as useScrollToTableTopModule from "./hooks/useScrollToTableTop";
import * as useHorizontalOverflowModule from "./layout/useHorizontalOverflow";
import type * as propsModule from "./props";
import * as useSelectionModule from "./selection/useSelection";
import * as useTableChromeModule from "./useTableChrome";
import type * as chromeBodySharedModule from "./virtual/chromeBodyShared";
import type * as useColumnWindowModule from "./virtual/useColumnWindow";
import * as usePlainChromeBodyDataModule from "./virtual/usePlainChromeBodyData";
import * as useVirtualChromeBodyDataModule from "./virtual/useVirtualChromeBodyData";

/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ChromeBodyData<TRow> = chromeBodySharedModule.ChromeBodyData<TRow>;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ColumnDragState = columnReorderModule.ColumnDragState;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ColumnDropProps = columnReorderModule.ColumnDropProps;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ColumnReorderKeyProps = columnReorderModule.ColumnReorderKeyProps;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ColumnRowDragProps = columnReorderModule.ColumnRowDragProps;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ColumnWindow<TRow> = useColumnWindowModule.ColumnWindow<TRow>;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type ComposedTableProps<TRow> = propsModule.ComposedTableProps<TRow>;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type FilterTriggerToggle = toolbarChromeModule.FilterTriggerToggle;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type HorizontalOverflow<E extends HTMLElement> =
  useHorizontalOverflowModule.HorizontalOverflow<E>;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const ReducedMotionScope: typeof usePrefersReducedMotionModule.ReducedMotionScope =
  usePrefersReducedMotionModule.ReducedMotionScope;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type TableEditHistoryProps<TRow> =
  editHistoryModule.TableEditHistoryProps<TRow>;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type UseActiveFilterChipsOptions =
  useActiveFilterChipsModule.UseActiveFilterChipsOptions;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type UseExtraChipsOptions = useExtraChipsModule.UseExtraChipsOptions;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type UseScrollToTableTopOptions =
  useScrollToTableTopModule.UseScrollToTableTopOptions;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type UseShortcutsOptions = useShortcutsModule.UseShortcutsOptions;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnDropProps: typeof columnReorderModule.columnDropProps =
  columnReorderModule.columnDropProps;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnHeaderController: typeof columnHeaderModule.columnHeaderController =
  columnHeaderModule.columnHeaderController;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnReorderKeyProps: typeof columnReorderModule.columnReorderKeyProps =
  columnReorderModule.columnReorderKeyProps;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnRowDragProps: typeof columnReorderModule.columnRowDragProps =
  columnReorderModule.columnRowDragProps;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnsHaveFooter: typeof columnHeaderModule.columnsHaveFooter =
  columnHeaderModule.columnsHaveFooter;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const offersAllMatching: typeof useSelectionModule.offersAllMatching =
  useSelectionModule.offersAllMatching;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const readCellValue: typeof editHistoryModule.readCellValue =
  editHistoryModule.readCellValue;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const resolveColumnFooter: typeof columnHeaderModule.resolveColumnFooter =
  columnHeaderModule.resolveColumnFooter;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const resolveColumnHeader: typeof columnHeaderModule.resolveColumnHeader =
  columnHeaderModule.resolveColumnHeader;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const resolveNeutralColumnHeaders: typeof resolveColumnsModule.resolveNeutralColumnHeaders =
  resolveColumnsModule.resolveNeutralColumnHeaders;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useActiveFilterChips: typeof useActiveFilterChipsModule.useActiveFilterChips =
  useActiveFilterChipsModule.useActiveFilterChips;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useChromeScrollReset: typeof scrollResetModule.useChromeScrollReset =
  scrollResetModule.useChromeScrollReset;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useColorScheme: typeof useColorSchemeModule.useColorScheme =
  useColorSchemeModule.useColorScheme;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useColumnDragState: typeof columnReorderModule.useColumnDragState =
  columnReorderModule.useColumnDragState;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useDebounce: typeof useDebounceModule.useDebounce =
  useDebounceModule.useDebounce;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useExtraChips: typeof useExtraChipsModule.useExtraChips =
  useExtraChipsModule.useExtraChips;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useFilterTriggerToggle: typeof toolbarChromeModule.useFilterTriggerToggle =
  toolbarChromeModule.useFilterTriggerToggle;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useFindFocus: typeof useFindInTableModule.useFindFocus =
  useFindInTableModule.useFindFocus;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useHorizontalOverflow: typeof useHorizontalOverflowModule.useHorizontalOverflow =
  useHorizontalOverflowModule.useHorizontalOverflow;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const usePlainChromeBodyData: typeof usePlainChromeBodyDataModule.usePlainChromeBodyData =
  usePlainChromeBodyDataModule.usePlainChromeBodyData;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useScrollToTableTop: typeof useScrollToTableTopModule.useScrollToTableTop =
  useScrollToTableTopModule.useScrollToTableTop;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useShortcuts: typeof useShortcutsModule.useShortcuts =
  useShortcutsModule.useShortcuts;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useTableChrome: typeof useTableChromeModule.useTableChrome =
  useTableChromeModule.useTableChrome;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useTableEditHistory: typeof editHistoryModule.useTableEditHistory =
  editHistoryModule.useTableEditHistory;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useTableEngine: typeof useTableEngineModule.useTableEngine =
  useTableEngineModule.useTableEngine;
/**
 * The export of the same name on `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const useVirtualChromeBodyData: typeof useVirtualChromeBodyDataModule.useVirtualChromeBodyData =
  useVirtualChromeBodyDataModule.useVirtualChromeBodyData;
