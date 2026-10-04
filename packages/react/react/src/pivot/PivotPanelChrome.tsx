/**
 * The pivot configuration panel: three lists, and a way to move fields
 * between them.
 *
 * Every pivot UI in every spreadsheet is drag-and-drop, and every one of them
 * is unusable without a mouse. Dragging is a fine way to express "put Team
 * above Region" and a terrible way to be the *only* way — so the panel is
 * built keyboard-first: each field carries buttons that move it, and the
 * result is a control anyone can drive with Tab and Enter. A kit that wants
 * dragging can add it on top; nothing here forbids it, and nothing here
 * depends on it.
 *
 * Structure, part names, ordering and labels live here. Every visible control
 * — the buttons, the selects, the surfaces they sit on — is a required slot
 * the adapter fills with its own kit's component, so a Mantine panel is built
 * from Mantine buttons and an antd panel from antd buttons.
 */
import {
  assignField,
  moveField,
  PIVOT_AGGREGATIONS,
  pivotPanelZones,
  removeField,
  resolveLabels,
  setMeasureAgg,
} from "@adapttable/core";
import type {
  PivotFieldProps as NeutralPivotFieldProps,
  PivotPanelChromeProps as NeutralPivotPanelChromeProps,
  PivotPanelSlots as NeutralPivotPanelSlots,
  PivotPanelSurfaceProps as NeutralPivotPanelSurfaceProps,
  PivotZoneProps as NeutralPivotZoneProps,
} from "@adapttable/core/binding";
import type { ReactNode } from "react";

export type {
  AggregateName,
  PivotConfig,
  PivotField,
  PivotZone,
} from "@adapttable/core";
export type { PivotAddProps, PivotAggProps } from "@adapttable/core/binding";

/**
 * Props an adapter's panel surface receives — `@adapttable/core`'s
 * `PivotPanelSurfaceProps` drawing React nodes.
 *
 * @public
 */
export type PivotPanelSurfaceProps = NeutralPivotPanelSurfaceProps<ReactNode>;

/**
 * Props an adapter's zone receives — `@adapttable/core`'s `PivotZoneProps`
 * drawing React nodes.
 *
 * @public
 */
export type PivotZoneProps = NeutralPivotZoneProps<ReactNode>;

/**
 * Props an adapter's field row receives — `@adapttable/core`'s
 * `PivotFieldProps` drawing React nodes.
 *
 * @public
 */
export type PivotFieldProps = NeutralPivotFieldProps<ReactNode>;

/**
 * The kit-native pieces the panel is built from — `@adapttable/core`'s
 * `PivotPanelSlots` drawing React nodes.
 *
 * @public
 */
export type PivotPanelSlots = NeutralPivotPanelSlots<ReactNode>;

/**
 * What the panel needs to render — `@adapttable/core`'s
 * `PivotPanelChromeProps` with React's slots.
 *
 * @public
 */
export type PivotPanelChromeProps = NeutralPivotPanelChromeProps<ReactNode>;

/**
 * The pivot configuration panel.
 *
 * @param props - Fields, the configuration, a change handler and the slots.
 * @returns The panel, built from the adapter's own controls.
 *
 * @public
 */
export function PivotPanelChrome({
  fields,
  config,
  onChange,
  labels: labelsProp,
  slots,
  className,
}: Readonly<PivotPanelChromeProps>) {
  const labels = resolveLabels(labelsProp);
  const { Surface, Zone, Field, Add, Agg } = slots;

  return (
    <Surface className={className} data-adapttable-part="pivot-panel">
      {pivotPanelZones(fields, config, labels).map(
        ({ zone, label, entries, addOptions }) => (
          <Zone
            key={zone}
            zone={zone}
            label={label}
            data-adapttable-part="pivot-zone"
          >
            {entries.map((entry) => (
              <Field
                key={entry.key}
                label={entry.label}
                data-adapttable-part="pivot-field"
                moveUpLabel={labels.pivotMoveUp}
                moveDownLabel={labels.pivotMoveDown}
                removeLabel={labels.pivotRemove}
                onMoveUp={
                  entry.canMoveUp
                    ? () => {
                        onChange(moveField(config, zone, entry.index, -1));
                      }
                    : undefined
                }
                onMoveDown={
                  entry.canMoveDown
                    ? () => {
                        onChange(moveField(config, zone, entry.index, 1));
                      }
                    : undefined
                }
                onRemove={() => {
                  onChange(removeField(config, zone, entry.index));
                }}
                aggregation={
                  entry.aggregation === undefined ? undefined : (
                    <Agg
                      label={labels.pivotAggregation}
                      value={entry.aggregation}
                      options={PIVOT_AGGREGATIONS}
                      onChange={(next) => {
                        onChange(setMeasureAgg(config, entry.index, next));
                      }}
                    />
                  )
                }
              />
            ))}
            <Add
              label={labels.pivotAdd}
              options={addOptions}
              onAdd={(key) => {
                onChange(assignField(config, key, zone));
              }}
            />
          </Zone>
        )
      )}
    </Surface>
  );
}
