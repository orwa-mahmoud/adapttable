import { createContext, useContext } from "react";

import type { FindInTableState } from "./useFindInTable";

/** The live find state, for a control drawn somewhere else in the table. */
export const FindStateContext = createContext<FindInTableState | null>(null);

/**
 * The find state a toolbar control reads, or `null` outside a table that
 * composed `findInTable()`.
 *
 * @public
 */
export function useFindState(): FindInTableState | null {
  return useContext(FindStateContext);
}
