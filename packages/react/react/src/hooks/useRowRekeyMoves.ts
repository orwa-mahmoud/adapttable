/** State kept by row id that follows its rows through a rekey. */
import { onRowRekeyMoves, type RowRekeyable } from "@adapttable/core/binding";
import { useContext, useLayoutEffect } from "react";

import { TableStoreContext } from "../state/tableStoreContext";

/**
 * Move a store's row-keyed state with a rekeyed commit while it is mounted
 * in a table. Registered in a layout effect, so a render React discards
 * registers nothing.
 *
 * @param target - The store whose state is kept by row id.
 */
export function useRowRekeyMoves<TRow>(target: RowRekeyable<TRow>): void {
  const table = useContext(TableStoreContext);
  useLayoutEffect(() => {
    if (!table) return undefined;
    return onRowRekeyMoves(table, target);
  }, [table, target]);
}
