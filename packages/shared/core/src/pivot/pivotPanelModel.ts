/**
 * The pivot configuration panel's model: its three zones in order, their
 * captions, each entry's caption and which way it can move, the aggregation a
 * measure shows, and the fields a zone can still take.
 *
 * The panel is keyboard-first — each field carries buttons that move it — and
 * a binding draws it from kit slots; what each zone lists and offers is
 * decided here once.
 */
import type { AggregateName } from "../aggregate/aggregate";
import type { TableLabels } from "../types";
import {
  availableFields,
  measureLabel,
  PIVOT_ZONES,
  type PivotField,
  type PivotZone,
} from "./pivotConfigModel";
import type { PivotConfig } from "./pivotModel";

/**
 * The aggregations the pivot panel offers.
 *
 * @public
 */
export const PIVOT_AGGREGATIONS: readonly AggregateName[] = [
  "sum",
  "avg",
  "count",
  "min",
  "max",
];

/**
 * The caption for one pivot zone.
 *
 * @param zone - The zone.
 * @param labels - Resolved labels.
 * @returns The caption.
 *
 * @public
 */
export function pivotZoneLabel(
  zone: PivotZone,
  labels: Pick<
    Required<TableLabels>,
    "pivotRows" | "pivotColumns" | "pivotMeasures"
  >
): string {
  if (zone === "rows") return labels.pivotRows;
  if (zone === "columns") return labels.pivotColumns;
  return labels.pivotMeasures;
}

/**
 * The aggregation shown for a measure, or `sum` for a custom one.
 *
 * @param config - The configuration.
 * @param index - The measure's index.
 * @returns The aggregation name.
 *
 * @public
 */
export function pivotMeasureAggName(
  config: PivotConfig,
  index: number
): AggregateName {
  const agg = config.measures[index]?.agg;
  return typeof agg === "string" && isPivotAggregation(agg) ? agg : "sum";
}

function isPivotAggregation(value: string): value is AggregateName {
  return (PIVOT_AGGREGATIONS as readonly string[]).includes(value);
}

/**
 * One entry in a pivot zone.
 *
 * @public
 */
export interface PivotZoneEntry {
  /** Stable key — the field key, or the measure key with its index. */
  readonly key: string;
  /** The caption. */
  readonly label: string;
  /** Its index within the zone. */
  readonly index: number;
  /** Whether it can move one step towards the outside. */
  readonly canMoveUp: boolean;
  /** Whether it can move one step towards the inside. */
  readonly canMoveDown: boolean;
  /** The measure's aggregation; absent on a dimension. */
  readonly aggregation?: AggregateName;
}

/**
 * One zone of the pivot panel.
 *
 * @public
 */
export interface PivotZoneModel {
  /** Which zone. */
  readonly zone: PivotZone;
  /** Its caption. */
  readonly label: string;
  /** Its entries, in order. */
  readonly entries: readonly PivotZoneEntry[];
  /**
   * The fields that can still be added. Measures may repeat a column;
   * dimensions may not, so this differs per zone.
   */
  readonly addOptions: readonly PivotField[];
}

/**
 * The pivot panel's zones, in panel order.
 *
 * @param fields - Every field the user can pivot on.
 * @param config - The configuration being edited.
 * @param labels - Resolved labels.
 * @param aggregationLabels - Optional presentation captions for aggregation names.
 * @returns The zones.
 *
 * @public
 */
export function pivotPanelZones(
  fields: readonly PivotField[],
  config: PivotConfig,
  labels: Pick<
    Required<TableLabels>,
    "pivotRows" | "pivotColumns" | "pivotMeasures"
  >,
  aggregationLabels?: Readonly<Record<string, string | undefined>>
): PivotZoneModel[] {
  const unused = availableFields(fields, config);
  const nameOf = (key: string) =>
    fields.find((field) => field.key === key)?.label ?? key;
  return PIVOT_ZONES.map((zone) => {
    const raw =
      zone === "measures"
        ? config.measures.map((measure, index) => ({
            key: `${measure.key}-${String(index)}`,
            label: measureLabel(measure, fields, aggregationLabels),
          }))
        : config[zone].map((key) => ({ key, label: nameOf(key) }));
    const entries = raw.map((entry, index) => ({
      ...entry,
      index,
      canMoveUp: index > 0,
      canMoveDown: index < raw.length - 1,
      ...(zone === "measures"
        ? { aggregation: pivotMeasureAggName(config, index) }
        : {}),
    }));
    return {
      zone,
      label: pivotZoneLabel(zone, labels),
      entries,
      addOptions: zone === "measures" ? fields : unused,
    };
  });
}
