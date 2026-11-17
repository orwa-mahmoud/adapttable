/** The table's one store, for every part of the table that keeps state. */
import type { TableStore } from "@adapttable/core/binding";
import { createContext } from "react";

/**
 * The store of the table being rendered: its URL view state, selection,
 * column layout, expansion and the other values it keeps live in it as
 * slices. Absent outside a table, where each hook keeps a store of its own.
 *
 * @public
 */
export const TableStoreContext = /* @__PURE__ */ createContext<
  TableStore | undefined
>(undefined);
