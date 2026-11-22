/**
 * Filter widgets for Angular kits: a filters feature composed with only the
 * widgets a table draws, and the form that draws them.
 */
import {
  type AdaptTableFeature,
  injectFeatureState,
} from "@adapttable/angular";
import type { FilterDef, TableLabels, TableSource } from "@adapttable/core";
import {
  featureStateKey,
  filterWidgetFor,
  type FilterWidgetOf,
} from "@adapttable/core/binding";
import { computed, Directive, input, type Type } from "@angular/core";

import { AdaptAutoFilterFormModel } from "./filterFieldModels";

/**
 * One kit's field component for one or more built-in widget kinds. It takes
 * the `def`, `source` and `labels` inputs.
 *
 * @public
 */
export type FilterWidget = FilterWidgetOf<Type<unknown>>;

/**
 * A kit's filters factory: definitions in, a feature out.
 *
 * @public
 */
export type AdapterFiltersFeature = <TRow>(
  defs?: readonly FilterDef<TRow>[]
) => AdaptTableFeature;

/** The widgets the composed filters feature draws its fields with. */
const FILTER_WIDGETS_STATE =
  featureStateKey<readonly FilterWidget[]>("filter-widgets");

/**
 * The filters feature, publishing the widgets its form draws fields with.
 *
 * @param feature - The kit's filters feature.
 * @param widgets - The widgets its form draws.
 * @returns The feature, publishing `widgets` while it is mounted.
 *
 * @public
 */
export function withFilterWidgets(
  feature: AdaptTableFeature,
  widgets: readonly FilterWidget[]
): AdaptTableFeature {
  return {
    ...feature,
    // The widgets are what the mounted form draws with: other widgets
    // replace it, the same ones declared again keep it.
    dependencies: [...(feature.dependencies ?? []), ...widgets],
    mount(context) {
      const release = feature.mount?.(context);
      context.state.set(FILTER_WIDGETS_STATE, widgets);
      return () => {
        context.state.set(FILTER_WIDGETS_STATE, undefined);
        release?.();
      };
    },
  };
}

/**
 * Shared signals for a kit form that draws each field with the widget its
 * filters feature was composed with. A registered `render` still wins.
 *
 * @public
 */
@Directive({})
export abstract class AdaptFilterWidgetFormModel<
  TRow,
> extends AdaptAutoFilterFormModel<TRow> {
  private readonly widgets = injectFeatureState(FILTER_WIDGETS_STATE);

  /** Each field with the widget that draws it and that widget's inputs. */
  protected readonly widgetFields = computed(() => {
    const widgets = this.widgets();
    if (!widgets)
      throw new Error(
        "AdaptTable: a filter widget form draws inside a filters feature, which publishes its widgets."
      );
    const registry = this.registry();
    return this.fields().map((field) => ({
      ...field,
      widget:
        field.renderer || field.text !== null
          ? undefined
          : filterWidgetFor(field.def, registry, widgets),
      inputs: {
        def: field.def,
        source: this.source(),
        labels: this.labels(),
      },
    }));
  });
}

/**
 * Shared inputs for a kit's checklist widget field.
 *
 * @public
 */
@Directive({})
export abstract class AdaptChecklistFilterFieldModel<TRow> {
  readonly def = input.required<FilterDef<TRow>>();
  readonly source = input.required<TableSource<TRow>>();
  readonly labels = input.required<Required<TableLabels>>();
}
