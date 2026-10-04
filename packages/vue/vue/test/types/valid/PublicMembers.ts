import type {
  AggregateSpec,
  CellEditor,
  ColumnInput,
  ComponentRenderer,
  FeatureMountContext,
  FeatureState,
  FeatureStateKey,
  FilterRuntime,
  HeaderFilterModel,
  ResolvedTableOptions,
  RowActionControlsProjector,
  StaticFeatureHost,
  TableFeatureHost,
  TableRuntimeView,
  UseDataTableShellOptions,
  UseDataTableShellResult,
  VueHeaderFilterControlProps,
} from "@adapttable/vue";
interface Row {
  id: string;
  value: number;
}
export type NamedMembers = [
  AggregateSpec,
  CellEditor,
  ColumnInput<Row>,
  ComponentRenderer<{ value: number }>,
  FeatureMountContext<Row>,
  FeatureState,
  FeatureStateKey<number>,
  FilterRuntime<Row>,
  HeaderFilterModel<Row>,
  ResolvedTableOptions<Row>,
  RowActionControlsProjector<Row>,
  StaticFeatureHost,
  TableFeatureHost<Row>,
  TableRuntimeView<Row>,
  UseDataTableShellOptions<Row>,
  UseDataTableShellResult<Row>,
  VueHeaderFilterControlProps<Row>,
];
