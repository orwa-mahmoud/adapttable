import type { RowPatchEvent } from "@adapttable/core";
import { createContext, useContext } from "react";

import type { Person } from "./data";

/**
 * A page that wants real patch events — Feature Lab cell-flash — fills
 * this. `Demo.tsx` never imports `@adapttable/core/stream`.
 */
export interface PatchSink {
  onEvents: (events: readonly RowPatchEvent<Person>[]) => void;
  isFlashingRef: { current: (rowId: string, columnKey: string) => boolean };
}

const PatchSinkContext = createContext<PatchSink | null>(null);

export const PatchSinkProvider = PatchSinkContext.Provider;

export function usePatchSink(): PatchSink | null {
  return useContext(PatchSinkContext);
}
