/** Opt-in pivot data, URL state, and structural configuration controls. */
import {
  type AggregateName,
  assignField,
  moveField,
  PIVOT_AGGREGATIONS,
  PIVOT_ROW_COLUMN_KEY,
  PIVOT_ROW_INDENT,
  type PivotConfig,
  type PivotField,
  pivotPanelZones,
  type PivotResult,
  type PivotRow,
  pivotRowCaption,
  pivotRowIndentStyle,
  pivotSlice,
  pivotTableLayout,
  removeField,
  resolveLabels,
  setMeasureAgg,
  type TableLabels,
} from "@adapttable/core";
import {
  type PivotAggProps,
  type PivotPanelChromeProps as NeutralPivotPanelChromeProps,
  type PivotPanelSlots as NeutralPivotPanelSlots,
} from "@adapttable/core/binding";
import {
  computed,
  h,
  type MaybeRefOrGetter,
  toValue,
  type VNodeChild,
} from "vue";

import type { ColumnDef } from "../columnDef";
import type { MaybeRefOrGetterOptional } from "../store";
import { type UrlSliceOptions, useUrlSlice } from "../url/useUrlSlice";
export type { ColumnDef } from "../columnDef";
export type {
  PivotAddProps,
  PivotAggProps,
  PivotFieldProps,
  PivotPanelSurfaceProps,
  PivotZoneProps,
} from "@adapttable/core/binding";
export * from "@adapttable/core/pivot";
export interface VuePivotAggProps extends PivotAggProps {
  readonly optionLabels: Readonly<Record<AggregateName, string>>;
}
export type PivotPanelSlots = Omit<
  NeutralPivotPanelSlots<VNodeChild>,
  "Agg"
> & { readonly Agg: (props: VuePivotAggProps) => VNodeChild };
export type PivotPanelChromeProps = Omit<
  NeutralPivotPanelChromeProps<VNodeChild>,
  "slots"
> & { readonly slots: PivotPanelSlots };
export function PivotPanelChrome(props: PivotPanelChromeProps): VNodeChild {
  const { fields, config, onChange, slots, className } = props;
  const labels = resolveLabels(props.labels);
  const aggregationLabels = {
    sum: labels.selectionSum,
    avg: labels.groupingAverage,
    count: labels.selectionCount,
    min: labels.selectionMin,
    max: labels.selectionMax,
  };
  for (const key of ["Surface", "Zone", "Field", "Add", "Agg"] as const)
    if (typeof slots[key] !== "function")
      throw new Error(
        `AdaptTable: required pivot control slot "${key}" is missing.`
      );
  return slots.Surface({
    className,
    "data-adapttable-part": "pivot-panel",
    children: pivotPanelZones(fields, config, labels, aggregationLabels).map(
      ({ zone, label, entries, addOptions }) =>
        slots.Zone({
          zone,
          label,
          "data-adapttable-part": "pivot-zone",
          children: [
            ...entries.map((entry) =>
              slots.Field({
                label: entry.label,
                "data-adapttable-part": "pivot-field",
                moveUpLabel: labels.pivotMoveUp,
                moveDownLabel: labels.pivotMoveDown,
                removeLabel: labels.pivotRemove,
                onMoveUp: entry.canMoveUp
                  ? () => onChange(moveField(config, zone, entry.index, -1))
                  : undefined,
                onMoveDown: entry.canMoveDown
                  ? () => onChange(moveField(config, zone, entry.index, 1))
                  : undefined,
                onRemove: () =>
                  onChange(removeField(config, zone, entry.index)),
                aggregation:
                  entry.aggregation === undefined
                    ? undefined
                    : slots.Agg({
                        label: labels.pivotAggregation,
                        value: entry.aggregation,
                        options: PIVOT_AGGREGATIONS,
                        optionLabels: aggregationLabels,
                        onChange: (next) =>
                          onChange(setMeasureAgg(config, entry.index, next)),
                      }),
              })
            ),
            slots.Add({
              label: labels.pivotAdd,
              options: addOptions,
              onAdd: (key) => onChange(assignField(config, key, zone)),
            }),
          ],
        })
    ),
  });
}
export interface PivotTableModelOptions {
  readonly fields?: readonly PivotField[];
  readonly labels?: TableLabels;
  readonly rowHeader?: string;
  readonly renderRowHeader?: (row: PivotRow) => VNodeChild;
  readonly indent?: number;
}
export interface PivotTableModel {
  readonly columns: readonly ColumnDef<PivotRow>[];
  readonly rows: readonly PivotRow[];
  readonly rowKey: (row: PivotRow) => string;
  readonly pinnedRows?: { readonly bottom: readonly PivotRow[] };
}
export function pivotTableModel(
  result: PivotResult,
  options: PivotTableModelOptions = {}
): PivotTableModel {
  const labels = resolveLabels(options.labels);
  const layout = pivotTableLayout(result, { fields: options.fields, labels });
  const columns: ColumnDef<PivotRow>[] = [
    {
      key: PIVOT_ROW_COLUMN_KEY,
      header: options.rowHeader ?? layout.rowHeaderLabel,
      accessor: (row) => pivotRowCaption(row, labels),
      cell: ({ row }) =>
        h(
          "span",
          {
            "data-adapttable-part": "pivot-row-header",
            "data-pivot-kind": row.kind,
            style: pivotRowIndentStyle(row, options.indent ?? PIVOT_ROW_INDENT),
          },
          options.renderRowHeader?.(row) ?? pivotRowCaption(row, labels)
        ),
      formatValue: (row) => pivotRowCaption(row, labels),
    },
    ...layout.leafColumns.map(({ key, index, header, group, leaf }) => ({
      key,
      header,
      mobileLabel: [...(group ?? []), header].join(" / "),
      group,
      align: "end" as const,
      accessor: (row: PivotRow) => row.cells[index],
      meta: { pivotLeaf: leaf },
    })),
  ];
  const total = result.rows.filter((row) => row.kind === "grandTotal");
  return {
    columns,
    rows: layout.rows,
    rowKey: (row) => row.key,
    pinnedRows: total.length ? { bottom: total } : undefined,
  };
}
export interface UsePivotUrlStateOptions extends UrlSliceOptions {
  readonly defaultConfig?: MaybeRefOrGetterOptional<PivotConfig>;
}
export function usePivotUrlState(
  input: MaybeRefOrGetter<UsePivotUrlStateOptions> = {},
  activity?: MaybeRefOrGetter<boolean>
) {
  const slice = useUrlSlice(
    input,
    pivotSlice,
    () => ({ defaultConfig: toValue(toValue(input).defaultConfig) }),
    activity
  );
  return {
    config: computed(() => slice.value.value.config),
    collapsed: computed(() => new Set(slice.value.value.collapsed)),
    onConfigChange: (next: PivotConfig) =>
      slice.set({ config: next, collapsed: slice.value.value.collapsed }),
    onCollapsedChange: (next: ReadonlySet<string>) =>
      slice.set({ config: slice.value.value.config, collapsed: [...next] }),
    flush: slice.flush,
  };
}
export type UsePivotUrlStateResult = ReturnType<typeof usePivotUrlState>;

PivotPanelChrome.props = [
  "fields",
  "config",
  "onChange",
  "labels",
  "slots",
  "className",
];

export type * from "../columnDef";
export type { MaybeRefOrGetterOptional } from "../store";
export type { UrlSliceOptions } from "../url/useUrlSlice";
