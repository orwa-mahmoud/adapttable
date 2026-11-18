import {
  type FilterDef,
  type FilterFormSource,
  type FilterTypeRegistry,
  renderRegisteredFilter,
  type TableLabels,
} from "@adapttable/core";
import { filterWidgetFor, type FilterWidgetOf } from "@adapttable/core/binding";
import { type ComponentType, createElement, type ReactElement } from "react";

/**
 * What every kit filter widget receives.
 *
 * @public
 */
export interface FilterWidgetProps<TRow = unknown> {
  /** The filter definition the field draws. */
  readonly def: FilterDef<TRow>;
  /** The filter bag the field reads and writes. */
  readonly source: FilterFormSource<TRow>;
  /** Resolved labels, every key filled. */
  readonly labels: Required<TableLabels>;
}

/**
 * One kit's field for one or more built-in widget kinds, composed into a
 * filters feature with that kit's `filtersWith`.
 *
 * @typeParam TProps - The props the kit's fields take.
 *
 * @public
 */
export type FilterWidget<TProps extends FilterWidgetProps = FilterWidgetProps> =
  FilterWidgetOf<ComponentType<TProps>>;

/**
 * Props for {@link FilterWidgetField}.
 *
 * @public
 */
export interface FilterWidgetFieldProps<TProps extends FilterWidgetProps> {
  /** The props the drawn widget receives. */
  readonly field: TProps;
  /** Type registry that names each def's widget kind. */
  readonly registry: FilterTypeRegistry;
  /** The widgets this form was composed with. */
  readonly widgets: readonly FilterWidget<TProps>[];
}

/**
 * One filter field: the type's own `render` when it registered one,
 * otherwise the composed widget for its kind.
 *
 * @throws When the def's kind has no widget among `widgets`.
 *
 * @public
 */
export function FilterWidgetField<TProps extends FilterWidgetProps>({
  field,
  registry,
  widgets,
}: Readonly<FilterWidgetFieldProps<TProps>>): ReactElement | null {
  "use no memo";
  const custom = renderRegisteredFilter(
    field.def,
    field.source,
    field.labels,
    registry
  );
  if (custom) return custom as ReactElement;
  const Widget = filterWidgetFor(field.def, registry, widgets);
  return Widget ? createElement(Widget, field) : null;
}
