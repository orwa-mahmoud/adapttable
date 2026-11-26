/**
 * The toolbar's feature entries.
 *
 * Each feature that puts a control on the toolbar adds one entry: it reads
 * the state its feature published and draws its kit control. The toolbar
 * draws the entries in feature-id order, so every kit lays them out the same
 * way and a new feature needs no kit change.
 */
import type { TableDensity } from "@adapttable/core";
import {
  type FeatureRender,
  featureSlotKey,
  type FeatureStateKey,
  type SlotFill,
  slotRender,
} from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { ActionPresentation } from "../actions/contracts";
import type { FeatureSlotDrawer } from "./tableFeature";

/**
 * What a toolbar entry is drawn with.
 *
 * @public
 */
export interface ToolbarEntryProps {
  /** The labels, direction, class map and overlay container controls take. */
  readonly presentation: ActionPresentation;
  /** The table's row density. */
  readonly density: TableDensity;
  /** Ask the table for another row density. */
  readonly onDensityChange: (next: TableDensity) => void;
  /** What a feature published under `key`, if it did. */
  read<T>(key: FeatureStateKey<T>): T | undefined;
  /** Draw this entry's feature's fill of a kit control slot. */
  readonly draw: FeatureSlotDrawer;
}

/**
 * The toolbar's feature entries; several features fill it.
 *
 * @public
 */
export const TOOLBAR_EXTRAS =
  featureSlotKey<ToolbarEntryProps>("toolbar-extras");

/**
 * The kit's filters trigger and its panel, drawn ahead of the entries.
 *
 * @public
 */
export const FILTERS_PANEL = featureSlotKey<Readonly<Record<string, never>>>(
  "vue-filters-panel",
  { single: true }
);

/**
 * A feature's toolbar entry.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function toolbarEntry(
  render: (props: ToolbarEntryProps) => VNodeChild
): FeatureRender<ToolbarEntryProps, VNodeChild> {
  return slotRender(TOOLBAR_EXTRAS, render);
}

/**
 * Draw every entry, each with a drawer for its own feature's controls, as one
 * flat list of the controls that drew.
 */
export function renderToolbarEntries(
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>,
  propsOf: (featureId: string) => ToolbarEntryProps
): VNodeChild[] {
  return (fills.get(TOOLBAR_EXTRAS.id) ?? []).flatMap((fill) =>
    drawnNodes(
      (fill.render as (props: ToolbarEntryProps) => VNodeChild)(
        propsOf(fill.id)
      )
    )
  );
}

function drawnNodes(child: VNodeChild): VNodeChild[] {
  if (Array.isArray(child)) return child.flatMap(drawnNodes);
  return drawsSomething(child) ? [child] : [];
}

/** Whether a drawn child puts anything on the page. */
export function drawsSomething(child: VNodeChild): boolean {
  if (Array.isArray(child)) return child.some(drawsSomething);
  return child !== null && child !== undefined && typeof child !== "boolean";
}
