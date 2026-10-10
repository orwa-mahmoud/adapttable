import { type FeatureHostState, type SlotFill } from "@adapttable/core/binding";
import { InjectionToken } from "@angular/core";

import type { SlotComponent } from "./featureHost";
import { type FeatureState } from "./featureState";

/**
 * Which components draw each slot — `DataTable.slotFills`.
 *
 * @public
 */
export type SlotFills = ReadonlyMap<string, readonly SlotFill<SlotComponent>[]>;

/**
 * What a slot component can ask of the table it draws in.
 *
 * @public
 */
export interface SlotTable {
  /** Which components the features draw into each slot. */
  readonly slotFills: SlotFills;
  /** The features' registrations: menu items, commands, writers. */
  readonly featureHost: FeatureHostState;
  /** Reactive values published by the table's mounted features. */
  readonly featureState?: FeatureState;
}

/**
 * The table a slot component draws in, for a component that needs more than
 * its props — the feature host a menu reads its plugin items from.
 *
 * @public
 */
export const ADAPTTABLE_SLOT_TABLE = new InjectionToken<SlotTable>(
  "ADAPTTABLE_SLOT_TABLE"
);
