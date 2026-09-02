/**
 * Adapter-neutral structure for the interactive grouping strip.
 *
 * Every visible control is a required slot. Core owns ordering, state
 * transitions, part names, and the invisible live region only.
 */
import { type ReactNode, useState } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { ColumnDef, Direction, TableLabels } from "../types";
import type { GroupAggregateOverride } from "./groupAggregateOverrides";
import type {
  GroupingChipKeyboardProps,
  GroupingDragProps,
  GroupingDropProps,
  GroupingPanelState,
} from "./groupingPanelModel";

/** One localized select option in the grouping panel. @public */
export interface GroupingPanelOption {
  /** State value written when selected. */
  value: string;
  /** Localized visible option text. */
  label: string;
}

/** Props for the kit-owned grouping panel surface. @public */
export interface GroupingPanelSurfaceProps {
  /** Grouping controls assembled by core. */
  children: ReactNode;
  /** Localized visible and accessible surface label. */
  label: string;
  /** Whether controls use the compact mobile treatment. */
  mobile: boolean;
  /** Logical text direction. */
  dir?: Direction;
  /** Stable styling and test part name. */
  "data-adapttable-part": "grouping-panel";
}

/** Props for one kit-owned insertion target. @public */
export interface GroupingPanelDropZoneProps {
  /** Localized drop instruction and accessible name. */
  label: string;
  /** Whether this is the panel's empty-state target. */
  empty: boolean;
  /** Whether a dragged field is currently over this target. */
  active: boolean;
  /** Native drag handlers supplied by core. */
  dropProps: GroupingDropProps;
  /** Stable styling and test part name. */
  "data-adapttable-part": "grouping-drop-zone";
}

/** Props for one kit-owned active grouping chip. @public */
export interface GroupingPanelChipProps {
  /** Display name of the grouped column. */
  label: string;
  /** One-based nesting position. */
  level: number;
  /** Native drag handlers supplied by core. */
  dragProps: GroupingDragProps;
  /** Keyboard move and remove handlers supplied by core. */
  keyboardProps: GroupingChipKeyboardProps;
  /** Remove this field from grouping. */
  onRemove: () => void;
  /** Localized accessible name for the remove control. */
  removeLabel: string;
  /** Stable styling and test part name. */
  "data-adapttable-part": "grouping-chip";
}

/** Props for a kit-owned grouping panel select. @public */
export interface GroupingPanelSelectProps {
  /** Localized visible and accessible select label. */
  label: string;
  /** Controlled selected value. */
  value: string;
  /** Localized choices. */
  options: readonly GroupingPanelOption[];
  /** Commit one selected value. */
  onChange: (value: string) => void;
  /** Whether the source cannot accept this selection. */
  disabled?: boolean;
  /** Stable styling and test part name. */
  "data-adapttable-part":
    "grouping-add" | "grouping-aggregate-column" | "grouping-aggregate";
}

/** Props for the chip-only drop target that ungroups a field. @public */
export interface GroupingPanelRemoveZoneProps {
  /** Localized visible and accessible target label. */
  label: string;
  /** Whether a dragged chip is currently over this target. */
  active: boolean;
  /** Native drop handlers supplied by core. */
  dropProps: GroupingDropProps;
  /** Stable styling and test part name. */
  "data-adapttable-part": "grouping-remove-zone";
}

/** Kit-native visible pieces required by the grouping panel. @public */
export interface GroupingPanelSlots {
  /** Outer panel surface. */
  Surface: (props: GroupingPanelSurfaceProps) => ReactNode;
  /** One insertion boundary. */
  DropZone: (props: GroupingPanelDropZoneProps) => ReactNode;
  /** One active grouping field. */
  Chip: (props: GroupingPanelChipProps) => ReactNode;
  /** Add-field or aggregation select. */
  Select: (props: GroupingPanelSelectProps) => ReactNode;
  /** Chip-only drag-to-ungroup target. */
  RemoveZone: (props: GroupingPanelRemoveZoneProps) => ReactNode;
}

/**
 * State and table context supplied to an adapter's grouping-panel slot.
 *
 * @public
 */
export interface GroupingPanelSlotProps<TRow = unknown> {
  /** Live URL-backed grouping interactions and values. */
  state: GroupingPanelState;
  /** Every table column available for grouping or aggregation. */
  columns: readonly ColumnDef<TRow>[];
  /** Fully resolved localized table labels. */
  labels: Required<TableLabels>;
  /** Whether the table is rendering its mobile layout. */
  mobile: boolean;
  /** Logical text direction. */
  dir?: Direction;
}

/** Full props for {@link GroupingPanelChrome}. @public */
export interface GroupingPanelChromeProps<
  TRow = unknown,
> extends GroupingPanelSlotProps<TRow> {
  /** Kit-owned controls used for every visible element. */
  slots: GroupingPanelSlots;
}

function columnName<TRow>(column: ColumnDef<TRow>): string {
  if (typeof column.header === "string") return column.header;
  return column.mobileLabel ?? column.key;
}

function aggregateOptions(
  labels: Required<TableLabels>
): readonly GroupingPanelOption[] {
  return [
    { value: "", label: labels.groupingAggregationDefault },
    { value: "sum", label: labels.selectionSum },
    { value: "avg", label: labels.groupingAverage },
    { value: "min", label: labels.selectionMin },
    { value: "max", label: labels.selectionMax },
    { value: "count", label: labels.selectionCount },
    { value: "none", label: labels.groupingAggregationNone },
  ];
}

/**
 * Render a kit-native, keyboard-complete interactive grouping strip.
 *
 * @public
 */
export function GroupingPanelChrome<TRow>({
  state,
  columns,
  labels,
  mobile,
  dir,
  slots,
}: Readonly<GroupingPanelChromeProps<TRow>>): ReactNode {
  const { Surface, DropZone, Chip, Select, RemoveZone } = slots;
  const [aggregateColumn, setAggregateColumn] = useState("");
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const available = columns
    .filter((column) => !state.groupBy.includes(column.key))
    .map((column) => ({ value: column.key, label: columnName(column) }));
  const aggregateColumns = columns
    .filter((column) => !state.groupBy.includes(column.key))
    .map((column) => ({ value: column.key, label: columnName(column) }));
  const selectedAggregateColumn = aggregateColumns.some(
    (option) => option.value === aggregateColumn
  )
    ? aggregateColumn
    : (aggregateColumns[0]?.value ?? "");
  const aggregateValue =
    state.aggregateOverrides[selectedAggregateColumn] ?? "";

  return (
    <Surface
      label={labels.groupingPanel}
      mobile={mobile}
      dir={dir}
      data-adapttable-part="grouping-panel"
    >
      {!mobile ? (
        <DropZone
          label={labels.groupingDropColumns}
          empty={state.groupBy.length === 0}
          active={state.drag?.overIndex === 0}
          dropProps={state.dropProps(0)}
          data-adapttable-part="grouping-drop-zone"
        />
      ) : null}
      {state.groupBy.map((key, index) => {
        const label = byKey.has(key) ? columnName(byKey.get(key)!) : key;
        return (
          <span key={key} data-adapttable-part="grouping-item">
            <Chip
              label={label}
              level={index + 1}
              dragProps={state.chipDragProps(key)}
              keyboardProps={state.chipKeyboardProps(key, label)}
              onRemove={() => state.remove(key)}
              removeLabel={labels.removeGroupingColumn(label)}
              data-adapttable-part="grouping-chip"
            />
            {!mobile ? (
              <DropZone
                label={labels.groupingDropColumns}
                empty={false}
                active={state.drag?.overIndex === index + 1}
                dropProps={state.dropProps(index + 1)}
                data-adapttable-part="grouping-drop-zone"
              />
            ) : null}
          </span>
        );
      })}
      <Select
        label={labels.addGroupingColumn}
        value=""
        options={available}
        onChange={state.add}
        disabled={available.length === 0}
        data-adapttable-part="grouping-add"
      />
      {state.groupBy.length > 0 && aggregateColumns.length > 0 ? (
        <span data-adapttable-part="grouping-aggregate-controls">
          <Select
            label={labels.groupingAggregateColumn}
            value={selectedAggregateColumn}
            options={aggregateColumns}
            onChange={setAggregateColumn}
            disabled={!state.canSetAggregates}
            data-adapttable-part="grouping-aggregate-column"
          />
          <Select
            label={labels.groupingAggregation}
            value={aggregateValue}
            options={aggregateOptions(labels)}
            onChange={(value) =>
              state.setAggregate(
                selectedAggregateColumn,
                (value || undefined) as GroupAggregateOverride | undefined
              )
            }
            disabled={!state.canSetAggregates}
            data-adapttable-part="grouping-aggregate"
          />
        </span>
      ) : null}
      {state.drag?.source === "chip" ? (
        <RemoveZone
          label={labels.groupingDropToRemove}
          active={state.drag.overRemove === true}
          dropProps={state.removeDropProps()}
          data-adapttable-part="grouping-remove-zone"
        />
      ) : null}
      <LiveRegion part="grouping-announcer">{state.announcement}</LiveRegion>
    </Surface>
  );
}
