/**
 * Column resolution for the three-prop table: declared order, developer
 * `hidden` honored, no user mutation state.
 *
 * Hide / reorder / pin / resize live on {@link useColumnLayout} and mount
 * only when a layout-owning feature is composed.
 */
import type { ColumnDef } from "../types";
import {
  EMPTY_COLUMN_LAYOUT,
  type PinOffset,
  type PinSide,
  type UseColumnLayoutResult,
} from "./columnLayoutModel";

function noop(): void {
  // User layout mutations are a feature. The base table cannot change them.
}

/**
 * Layout that only honours what the host declared on each column.
 *
 * @public
 */
type DeclaredColumn<TRow> = ColumnDef<TRow> & { hidden?: boolean };

export function declaredColumnLayout<TRow>(
  columns: readonly ColumnDef<TRow>[]
): UseColumnLayoutResult<TRow> {
  const declared = columns as readonly DeclaredColumn<TRow>[];
  const visibleColumns = declared.filter((column) => column.hidden !== true);
  const hiddenKeys = new Set(
    declared
      .filter((column) => column.hidden === true)
      .map((column) => column.key)
  );
  return {
    state: EMPTY_COLUMN_LAYOUT,
    visibleColumns,
    isHidden: (key: string) => hiddenKeys.has(key),
    setHidden: noop,
    toggleVisible: noop,
    setPinned: (_key: string, _side: PinSide | undefined) => {
      noop();
    },
    move: noop,
    setWidth: noop,
    pinOffset: (_key: string): PinOffset | undefined => undefined,
    reset: noop,
    toggleColumnGroup: noop,
  };
}
