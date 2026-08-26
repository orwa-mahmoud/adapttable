import {
  type ComponentType,
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
} from "react";

import type { Person } from "./data";

/**
 * The seam the realtime page fills. `Demo.tsx` never imports the stream
 * module — `/` has no static path to `@adapttable/core/stream`.
 */
export interface RealtimeSlotProps {
  data: readonly Person[];
  setData: Dispatch<SetStateAction<readonly Person[]>>;
  sortDir: "asc" | "desc";
  onPatched?: (id: string) => void;
  isFlashingRef: { current: (rowId: string, columnKey: string) => boolean };
}

const RealtimeSlotContext =
  createContext<ComponentType<RealtimeSlotProps> | null>(null);

export const RealtimeSlotProvider = RealtimeSlotContext.Provider;

export function useRealtimeSlot(): ComponentType<RealtimeSlotProps> | null {
  return useContext(RealtimeSlotContext);
}
