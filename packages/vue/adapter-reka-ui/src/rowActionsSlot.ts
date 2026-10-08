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
  readonly dir?: "ltr" | "rtl";
  readonly classNames: DataTableClassNames;
}

/** A lightweight channel; only rowActions() or rowPinning() loads its native menu. */
export const ROW_ACTIONS_CONTROL = featureSlotKey<
  RowActionsControlProps<unknown>
>("reka-ui-row-actions-control", { single: true });

export function rowActionsControlKey<TRow>(): FeatureSlotKey<
  RowActionsControlProps<TRow>
> {
  return ROW_ACTIONS_CONTROL as unknown as FeatureSlotKey<
    RowActionsControlProps<TRow>
  >;
}
