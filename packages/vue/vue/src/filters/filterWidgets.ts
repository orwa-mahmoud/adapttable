import type { FilterDef, FilterTypeRegistry } from "@adapttable/core";
import { filterWidgetFor, type FilterWidgetOf } from "@adapttable/core/binding";
import type { Component } from "vue";

import type { TableFeature } from "../features/tableFeature";
import type { FiltersOptions } from "../filters";

/**
 * One kit's field for one or more built-in widget kinds, composed into a
 * filters feature with that kit's `filtersWith`.
 *
 * @public
 */
export type FilterWidget = FilterWidgetOf<Component>;

/**
 * A kit's filters factory: definitions and panel options in, a feature out.
 *
 * @public
 */
export type AdapterFiltersFeature = <TRow>(
  defs?: readonly FilterDef<TRow>[],
  options?: FiltersOptions
) => TableFeature<TRow>;

/**
 * The component a filters panel draws for this definition.
 *
 * @throws When the definition's type names no widget, or names a kind that
 *   has no widget among `widgets`.
 *
 * @public
 */
export function filterWidgetComponent(
  def: Pick<FilterDef, "key" | "type">,
  registry: FilterTypeRegistry,
  widgets: readonly FilterWidget[]
): Component {
  const component = filterWidgetFor(def, registry, widgets);
  if (component) return component;
  throw new Error(
    `AdaptTable: filter type "${def.type}" needs a registered adapter field renderer.`
  );
}
