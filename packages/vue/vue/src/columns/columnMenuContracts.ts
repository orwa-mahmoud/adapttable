/** Typed, inert positions shared by the shell and every Vue kit. */
import type {
  ColumnMenuLabels,
  ColumnMenuSlotProps as NeutralColumnMenuSlotProps,
} from "@adapttable/core";
import {
  type ColumnHeaderRenameSlotProps as NeutralColumnHeaderRenameSlotProps,
  type FeatureHostState,
  featureSlotKey,
} from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { ColumnDef } from "../columnDef";
import type { ColumnLayout } from "./columnLayout";

export interface ColumnMenuSlotProps<TRow> extends Omit<
  NeutralColumnMenuSlotProps<TRow>,
  "allColumns" | "layout"
> {
  readonly allColumns: readonly ColumnDef<TRow>[];
  readonly layout: ColumnLayout<TRow>;
  readonly featureHost?: FeatureHostState<TRow>;
  readonly classNames?: Readonly<Record<string, string | undefined>>;
  readonly container?: HTMLElement;
}
export interface ColumnHeaderRenameSlotProps extends NeutralColumnHeaderRenameSlotProps<VNodeChild> {
  readonly classNames?: Readonly<Record<string, string | undefined>>;
}
export function columnMenuSlotKey<TRow>() {
  return featureSlotKey<ColumnMenuSlotProps<TRow>>("column-menu", {
    single: true,
  });
}
export const COLUMN_MENU = columnMenuSlotKey<never>();
export const COLUMN_HEADER_RENAME = featureSlotKey<ColumnHeaderRenameSlotProps>(
  "column-header-rename",
  { single: true }
);
export type { ColumnMenuLabels };
