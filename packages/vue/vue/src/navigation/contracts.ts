/** Optional navigation models; no controller is imported by the default shell. */
import type { CellRange, SelectionStats } from "@adapttable/core";
import {
  featureSlotKey,
  featureStateKey,
  FILL_HANDLE,
  type FillHandleCellSlotProps,
  type FindInTableState,
  GRID_FOCUS_ANNOUNCER,
  type GridFocusAnnouncerSlotProps,
  type GridFocusState,
} from "@adapttable/core/binding";
export const GRID_FOCUS_MODEL = featureStateKey<GridFocusState>(
  "vue-grid-focus-model"
);
export const FIND_MODEL = featureStateKey<FindInTableState>("vue-find-model");
export const SELECTION_STATS_MODEL = featureStateKey<SelectionStats | null>(
  "vue-selection-stats-model"
);
export const FIND_BUTTON = featureSlotKey<FindButtonControlProps>(
  "vue-find-button",
  { single: true }
);
export const FILL_HANDLE_CONTROL = featureSlotKey<
  FillHandleCellSlotProps<GridFocusState> & {
    readonly firstRowIndex?: number;
    readonly className?: string;
  }
>(FILL_HANDLE.id);
export interface FindButtonControlProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly className?: string;
}
export interface CellNavigationOptions {
  readonly onRangeChange?: (range: CellRange | null) => void;
}
export type { FindInTableState, GridFocusState };

export const GRID_ANNOUNCER = featureSlotKey<
  GridFocusAnnouncerSlotProps<GridFocusState> & { readonly className?: string }
>(GRID_FOCUS_ANNOUNCER.id, { single: true });
export type { CellRange };
