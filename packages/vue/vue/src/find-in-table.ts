export type * from "./index";
export {
  FIND_BUTTON,
  FIND_MODEL,
  type FindButtonControlProps,
  type FindInTableState,
} from "./navigation/contracts";
export { findInTable } from "./navigation/features";
export {
  FindBarChrome,
  type FindBarChromeProps,
  type FindBarSlots,
} from "./navigation/navigationChrome";
export {
  type FindInTableOptions,
  useFindInTable,
} from "./navigation/useFindInTable";
export type { ExternalStoreOptions } from "./store";
export type {
  FindBarProps,
  FindButtonProps,
  FindSearchProps,
} from "@adapttable/core/binding";
export { FIND_BAR } from "@adapttable/core/binding";

/** Preserve the existing core type-only surface through declaration bundling. */
export type * from "@adapttable/core";
