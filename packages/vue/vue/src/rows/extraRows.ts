import type { ExtraRow as NeutralExtraRow } from "@adapttable/core";
import type { VNodeChild } from "vue";
/** Vue content carried unchanged by the neutral extra-row assembly. @public */
export interface ExtraRow extends Omit<NeutralExtraRow, "render"> {
  readonly render?: () => VNodeChild;
}
/** A body entry containing only adapter-rendered extra content. @public */
export type ExtraEntry =
  | { readonly kind: "separator"; readonly key: string }
  | {
      readonly kind: "fullWidth";
      readonly key: string;
      readonly render?: () => VNodeChild;
    };
export type { ExtraRowKind } from "@adapttable/core";
