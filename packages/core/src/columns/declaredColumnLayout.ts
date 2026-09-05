/**
 * Column resolution for the three-prop table: declared order, developer
 * `hidden` honored, no user mutation state.
 *
 * Hide / reorder / pin / resize live on {@link useColumnLayout} and mount
 * only when a layout-owning feature is composed.
 */
import type { ColumnModel, ColumnMetadata } from "../columnModel";
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
type DeclaredColumn<TRow> = ColumnModel<TRow> & { hidden?: boolean };

export function declaredColumnLayout<TCol extends ColumnMetadata<any>>(
  columns: readonly TCol[]
): Omit<UseColumnLayoutResult<any>, "visibleColumns"> & {
  visibleColumns: TCol[];
} {
  const declared = columns as readonly DeclaredColumn<any>[];
  const visibleColumns = declared.filter(
    (column) => column.hidden !== true
  ) as TCol[];
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
    setName: noop,
    resetName: noop,
    pinOffset: (_key: string): PinOffset | undefined => undefined,
    reset: noop,
    toggleColumnGroup: noop,
  };
}
