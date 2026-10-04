/** Feature signatures expose the same nameable member types as the binding. */
export * from "./features/tableFeature";
export type * from "./index";
export type {
  FeatureApplyInput,
  FeaturePatch,
  FeatureRender,
  FeatureSlotKey,
  FeatureStateKey,
} from "@adapttable/core/binding";
export {
  featureSlotKey,
  featureStateKey,
  slotRender,
} from "@adapttable/core/binding";
