export type {
  BatchEditBarProps,
  BatchEditingState,
  BatchRowEdit,
  EditingActionButtonProps,
  EditingActionSlots,
} from "./editing";
export type {
  EditingLifecycleExtras,
  ExternalStoreOptions,
  TableEditingOptions,
} from "./editing";
export {
  BatchEditBarChrome,
  batchEditBarSlotKey,
  batchEditing,
  useBatchEditing,
} from "./editing";
export type { TableFeature } from "./features/tableFeature";

/** Public feature signatures share the binding's nameable member types. */
export type * from "./index";

/** Preserve the existing core type-only surface through declaration bundling. */
export type * from "@adapttable/core";
