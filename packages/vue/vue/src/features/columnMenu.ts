import { coreColumnMenu } from "@adapttable/core/binding";

import {
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
} from "../columns/columnMenuContracts";
import type { StaticTableFeature } from "./tableFeature";

/** Opt in to the kit's column manager and direct header rename controls. */
export function columnMenu(): StaticTableFeature {
  return {
    ...coreColumnMenu(),
    requiredSlots: [COLUMN_MENU, COLUMN_HEADER_RENAME],
  };
}
