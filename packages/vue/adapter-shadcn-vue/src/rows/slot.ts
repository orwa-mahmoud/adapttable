import type { FeatureSlotKey, RowActionControl } from "@adapttable/vue";
import {
  type DataTableClassNames,
  featureSlotKey,
  type RowActionsLayout,
} from "@adapttable/vue/adapter";

export interface RowActionsControlProps<TRow> {
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: DataTableClassNames;
}
/** A lightweight presentation channel; the menu is supplied only by rowActions() or rowPinning(). */
export const ROW_ACTIONS_CONTROL = featureSlotKey<
  RowActionsControlProps<unknown>
>("shadcn-vue-row-actions-control", { single: true });
export function rowActionsControlKey<TRow>(): FeatureSlotKey<
  RowActionsControlProps<TRow>
> {
  return ROW_ACTIONS_CONTROL as unknown as FeatureSlotKey<
    RowActionsControlProps<TRow>
  >;
}
