import {
  type FeatureSlotKey,
  featureSlotKey,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";

/** Structural group props are defined by the binding; this key carries native paint only. */
export type NativeGroupRowProps<TRow> = Parameters<
  NonNullable<TableChromeSlots<TRow>["GroupRow"]>
>[0];
export const NATIVE_GROUP_ROW = featureSlotKey<NativeGroupRowProps<unknown>>(
  "vue-unstyled-group-row"
);
export function nativeGroupRowSlotKey<TRow>(): FeatureSlotKey<
  NativeGroupRowProps<TRow>
> {
  return NATIVE_GROUP_ROW as unknown as FeatureSlotKey<
    NativeGroupRowProps<TRow>
  >;
}
