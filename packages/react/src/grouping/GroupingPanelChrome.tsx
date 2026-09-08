/**
 * Adapter-neutral structure for the interactive grouping strip.
 *
 * Every visible control is a required slot. Core owns ordering, state
 * transitions, part names, and the invisible live region only.
 */
import {
  type Direction,
  type GroupAggregateOverride,
  type GroupingChipKeyboardProps as CoreGroupingChipKeyboardProps,
  type GroupingDragProps as CoreGroupingDragProps,
  type GroupingDropProps as CoreGroupingDropProps,
  type GroupingPanelState,
  type TableLabels,
} from "@adapttable/core";
import {
  type DragEventHandler,
  type KeyboardEventHandler,
  type ReactNode,
  useState,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { ColumnDef } from "../columnDef";

/** React-compatible drag props for grouping chips and headers. @public */
export type GroupingDragProps = Omit<
  CoreGroupingDragProps,
  "onDragStart" | "onDragEnd"
> & {
  onDragStart?: DragEventHandler;
  onDragEnd?: DragEventHandler;
};

/** React-compatible drop-target props for the grouping strip. @public */
export type GroupingDropProps = Omit<
  CoreGroupingDropProps,
  "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
> & {
  onDragEnter?: DragEventHandler;
  onDragOver?: DragEventHandler;
  onDragLeave?: DragEventHandler;
  onDrop?: DragEventHandler;
};

/** React-compatible keyboard props for a grouping chip handle. @public */
export type GroupingChipKeyboardProps = Omit<
  CoreGroupingChipKeyboardProps,
  "onKeyDown"
> & {
  onKeyDown?: KeyboardEventHandler;
};

function reactGroupingDragProps(
  props: CoreGroupingDragProps
): GroupingDragProps {
  return props as unknown as GroupingDragProps;
}

/**
 * Drop handlers that refuse.
 *
 * Nothing calls `preventDefault`, so the browser shows the reader this is not
 * a place to let go — and the event stops here rather than reaching the chip
 * or the strip around it, both of which would have taken it. A refusal that
 * bubbles is not a refusal.
 */
const INERT_DROP_PROPS: GroupingDropProps = {
  onDragEnter: (event) => event.stopPropagation(),
  onDragOver: (event) => event.stopPropagation(),
  onDragLeave: (event) => event.stopPropagation(),
  onDrop: (event) => event.stopPropagation(),
};

function reactGroupingDropProps(
  props: CoreGroupingDropProps
): GroupingDropProps {
  return props as unknown as GroupingDropProps;
}

/**
 * Drop handlers that stand down for whatever inside them already answered.
 *
 * The strip nests targets — a caret inside a chip, a chip inside the panel —
 * and the innermost one is always the more precise answer. It says so by
 * calling `preventDefault`, which is how the browser is told a drop is
 * accepted here; anything wrapping it reads that and keeps out of the way.
 */
function deferToInner(props: CoreGroupingDropProps): CoreGroupingDropProps {
  const passUp =
    <TEvent extends { defaultPrevented: boolean }>(
      handler: ((event: TEvent) => void) | undefined
    ) =>
    (event: TEvent) => {
      if (event.defaultPrevented) return;
      handler?.(event);
    };
  return {
    onDragEnter: passUp(props.onDragEnter),
    onDragOver: passUp(props.onDragOver),
    onDragLeave: props.onDragLeave,
    onDrop: passUp(props.onDrop),
  };
}

function reactGroupingChipKeyboardProps(
  props: CoreGroupingChipKeyboardProps
): GroupingChipKeyboardProps {
  return props as unknown as GroupingChipKeyboardProps;
}

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
  /**
   * A dragged field arriving over the strip. The panel is mostly free space
   * once a few chips are in it, and that space is where a reader aims: a drop
   * anywhere on it that no caret or chip already answered adds the field at
   * the end. Spread all four onto the same element as the part name.
   */
  onDragEnter?: DragEventHandler;
  /** The field still over the strip — what accepts the drop. */
  onDragOver?: DragEventHandler;
  /** The field leaving the strip. */
  onDragLeave?: DragEventHandler;
  /** The field let go over the strip. */
  onDrop?: DragEventHandler;
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
  /**
   * Whether a grouping drag is in flight anywhere in the strip. A boundary
   * between two chips is a caret at rest; while something is being dragged it
   * has to be big enough to aim at.
   */
  dragging: boolean;
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
    .filter(
      (column) =>
        column.groupable !== false && !state.groupBy.includes(column.key)
    )
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

  // A chip dropped either side of itself lands exactly where it already is.
  // Those boundaries are the two nearest the reader's hand, so offering them
  // is offering a target that does nothing — which reads as the drag failing.
  const lifted =
    state.drag?.source === "chip" ? state.groupBy.indexOf(state.drag.key) : -1;
  const inert = (index: number) =>
    lifted >= 0 && (index === lifted || index === lifted + 1);
  // A chip is a target too, and the nearest one to the reader's hand: dropping
  // onto a chip takes that chip's place. Insertion boundaries alone put every
  // meaningful target a chip's width away from where the drag began — pick up
  // the last field and the only places that would move it are back at the head
  // of the strip.
  const ontoChip = (index: number): CoreGroupingDropProps => {
    const target = lifted >= 0 && lifted < index ? index + 1 : index;
    // The chip being dragged is not a place to drop it.
    if (lifted >= 0 && target === lifted) {
      return INERT_DROP_PROPS as unknown as CoreGroupingDropProps;
    }
    return deferToInner(state.dropProps(target));
  };
  // The strip is mostly free space, and free space is where a hand carrying a
  // header lets go. A drop there lands at the end — unless a caret or a chip
  // inside it already answered something more precise.
  const ontoPanel = (): CoreGroupingDropProps => {
    const target = state.groupBy.length;
    if (inert(target)) return {};
    return deferToInner(state.dropProps(target));
  };

  const boundary = (index: number) =>
    inert(index)
      ? {
          dragging: false,
          active: false,
          dropProps: INERT_DROP_PROPS,
        }
      : {
          dragging: state.drag !== undefined,
          active: state.drag?.overIndex === index,
          dropProps: reactGroupingDropProps(state.dropProps(index)),
        };

  return (
    <Surface
      label={labels.groupingPanel}
      mobile={mobile}
      dir={dir}
      {...(mobile ? {} : reactGroupingDropProps(ontoPanel()))}
      data-adapttable-part="grouping-panel"
    >
      {/* The way out of a grouping, on a line of its own above the chips: a
          target squeezed in beside them is one a reader never finds, and it
          only exists while a chip is in the air. */}
      {state.drag?.source === "chip" ? (
        <span style={{ display: "flex", flex: "1 0 100%", width: "100%" }}>
          <RemoveZone
            label={labels.groupingDropToRemove}
            active={state.drag.overRemove === true}
            dropProps={reactGroupingDropProps(state.removeDropProps())}
            data-adapttable-part="grouping-remove-zone"
          />
        </span>
      ) : null}
      {state.groupBy.map((key, index) => {
        const label = byKey.has(key) ? columnName(byKey.get(key)!) : key;
        return (
          // Each boundary is drawn WITH the chip it sits before, inside one
          // inline-flex row. Drawn beside the chips instead, the boundary
          // before the first one floated off on its own — and dropping there
          // is the only way to group by a new field FIRST.
          <span
            key={key}
            data-adapttable-part="grouping-item"
            style={{ display: "inline-flex", alignItems: "center" }}
            {...(mobile ? {} : reactGroupingDropProps(ontoChip(index)))}
          >
            {!mobile ? (
              <DropZone
                label={labels.groupingDropColumns}
                empty={false}
                {...boundary(index)}
                data-adapttable-part="grouping-drop-zone"
              />
            ) : null}
            <Chip
              label={label}
              level={index + 1}
              dragProps={reactGroupingDragProps(state.chipDragProps(key))}
              keyboardProps={reactGroupingChipKeyboardProps(
                state.chipKeyboardProps(key, label)
              )}
              onRemove={() => state.remove(key)}
              removeLabel={labels.removeGroupingColumn(label)}
              data-adapttable-part="grouping-chip"
            />
            {!mobile && index === state.groupBy.length - 1 ? (
              <DropZone
                label={labels.groupingDropColumns}
                empty={false}
                {...boundary(index + 1)}
                data-adapttable-part="grouping-drop-zone"
              />
            ) : null}
          </span>
        );
      })}
      {!mobile && state.groupBy.length === 0 ? (
        <DropZone
          label={labels.groupingDropColumns}
          empty
          dragging={state.drag !== undefined}
          active={state.drag?.overIndex === 0}
          dropProps={reactGroupingDropProps(state.dropProps(0))}
          data-adapttable-part="grouping-drop-zone"
        />
      ) : null}
      <Select
        label={labels.addGroupingColumn}
        value=""
        options={available}
        onChange={state.add}
        disabled={available.length === 0}
        data-adapttable-part="grouping-add"
      />
      {state.groupBy.length > 0 && aggregateColumns.length > 0 ? (
        <span
          data-adapttable-part="grouping-aggregate-controls"
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "0.5rem",
          }}
        >
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
      <LiveRegion part="grouping-announcer" statusRole={false}>
        {state.announcement}
      </LiveRegion>
    </Surface>
  );
}
