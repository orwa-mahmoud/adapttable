/** Vue-renderable aggregation without a second aggregation implementation. */
import {
  aggregate as neutralAggregate,
  type AggregateOperationId,
  type AggregateOptions as NeutralAggregateOptions,
  type AggregateOrderedValue,
  type AggregateSpec as NeutralAggregateSpec,
} from "@adapttable/core";
import type { VNodeChild } from "vue";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOrderedValue,
} from "@adapttable/core";
export type Aggregator<TValue = AggregateOrderedValue> = (
  values: readonly TValue[]
) => VNodeChild;
export type AggregateSpec = Partial<
  Record<string, AggregateOperationId | Aggregator>
>;
export interface AggregateOptions<TRow> extends Omit<
  NeutralAggregateOptions<TRow>,
  "format"
> {
  readonly format?: (value: unknown, key: string) => VNodeChild;
}
export type SummaryRowFn<TRow> = (
  rows: readonly TRow[]
) => Record<string, VNodeChild>;
/** Build a typed summary mapper backed by the neutral aggregate registry. @public */
export function aggregate<TRow>(
  spec: AggregateSpec,
  options: AggregateOptions<TRow> = {}
): SummaryRowFn<TRow> {
  return neutralAggregate(
    spec as NeutralAggregateSpec,
    options as NeutralAggregateOptions<TRow>
  ) as SummaryRowFn<TRow>;
}
export type { ColumnMetadata } from "@adapttable/core";
export type { FeatureHostState } from "@adapttable/core/binding";
