/**
 * Adapter-neutral structure for the interactive grouping strip.
 *
 * Every visible control is a required slot. Core owns ordering, state
 * transitions, part names, and the invisible live region only.
 */
import {
  deferGroupingDropToInner,
  focusAfterAggregationRemoval,
  groupingAggregationOptions,
  groupingAvailableColumns,
  type GroupingChipKeyboardProps as CoreGroupingChipKeyboardProps,
  groupingColumnName,
  type GroupingDragProps as CoreGroupingDragProps,
  groupingDropPlan,
  type GroupingDropProps as CoreGroupingDropProps,
  INERT_GROUPING_DROP_HANDLERS,
} from "@adapttable/core";
import type {
  GroupingChipKeyboardProps as NeutralGroupingChipKeyboardProps,
  GroupingDragProps as NeutralGroupingDragProps,
  GroupingDropProps as NeutralGroupingDropProps,
  GroupingPanelAggregationItemProps as NeutralGroupingPanelAggregationItemProps,
  GroupingPanelChipProps as NeutralGroupingPanelChipProps,
  GroupingPanelDropZoneProps as NeutralGroupingPanelDropZoneProps,
  GroupingPanelRemoveZoneProps as NeutralGroupingPanelRemoveZoneProps,
  GroupingPanelSlotProps as NeutralGroupingPanelSlotProps,
  GroupingPanelSlots as NeutralGroupingPanelSlots,
  GroupingPanelState,
  GroupingPanelSurfaceProps as NeutralGroupingPanelSurfaceProps,
} from "@adapttable/core/binding";
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { ColumnDef } from "../columnDef";

export type {
  GroupingPanelAggregationRemoveProps,
  GroupingPanelChecklistOption,
  GroupingPanelChecklistProps,
  GroupingPanelOption,
  GroupingPanelRestoreProps,
  GroupingPanelSelectProps,
} from "@adapttable/core/binding";

/**
 * React-compatible drag props for grouping chips and headers —
 * `@adapttable/core`'s `GroupingDragProps` with React's drag event.
 *
 * @public
 */
export type GroupingDragProps = NeutralGroupingDragProps<DragEvent>;

/**
 * React-compatible drop-target props for the grouping strip —
 * `@adapttable/core`'s `GroupingDropProps` with React's drag event.
 *
 * @public
 */
export type GroupingDropProps = NeutralGroupingDropProps<DragEvent>;

/**
 * React-compatible keyboard props for a grouping chip handle —
 * `@adapttable/core`'s `GroupingChipKeyboardProps` with React's key event.
 *
 * @public
 */
export type GroupingChipKeyboardProps =
  NeutralGroupingChipKeyboardProps<KeyboardEvent>;

function reactGroupingDragProps(
  props: CoreGroupingDragProps
): GroupingDragProps {
  return props as unknown as GroupingDragProps;
}

/** Drop handlers that refuse, without letting the refusal bubble. */
const INERT_DROP_PROPS: GroupingDropProps = INERT_GROUPING_DROP_HANDLERS;

function reactGroupingDropProps(
  props: CoreGroupingDropProps
): GroupingDropProps {
  return props as unknown as GroupingDropProps;
}

function reactGroupingChipKeyboardProps(
  props: CoreGroupingChipKeyboardProps
): GroupingChipKeyboardProps {
  return props as unknown as GroupingChipKeyboardProps;
}

/**
 * Props for the kit-owned grouping panel surface — `@adapttable/core`'s
 * `GroupingPanelSurfaceProps` with React content and drag events.
 *
 * @public
 */
export type GroupingPanelSurfaceProps = NeutralGroupingPanelSurfaceProps<
  ReactNode,
  DragEvent
>;

/**
 * Props for one kit-owned insertion target — `@adapttable/core`'s
 * `GroupingPanelDropZoneProps` with React's drag event.
 *
 * @public
 */
export type GroupingPanelDropZoneProps =
  NeutralGroupingPanelDropZoneProps<DragEvent>;

/**
 * Props for one kit-owned active grouping chip — `@adapttable/core`'s
 * `GroupingPanelChipProps` with React's key and drag events.
 *
 * @public
 */
export type GroupingPanelChipProps = NeutralGroupingPanelChipProps<
  KeyboardEvent,
  DragEvent
>;

/**
 * Props for one kit-owned active aggregation — `@adapttable/core`'s
 * `GroupingPanelAggregationItemProps` with React content.
 *
 * @public
 */
export type GroupingPanelAggregationItemProps =
  NeutralGroupingPanelAggregationItemProps<ReactNode>;

/**
 * Props for the chip-only drop target that ungroups a field —
 * `@adapttable/core`'s `GroupingPanelRemoveZoneProps` with React's drag event.
 *
 * @public
 */
export type GroupingPanelRemoveZoneProps =
  NeutralGroupingPanelRemoveZoneProps<DragEvent>;

/**
 * Kit-native visible pieces required by the grouping panel —
 * `@adapttable/core`'s `GroupingPanelSlots` drawing React nodes with React's
 * key and drag events.
 *
 * @public
 */
export type GroupingPanelSlots = NeutralGroupingPanelSlots<
  ReactNode,
  KeyboardEvent,
  DragEvent
>;

/**
 * State and table context supplied to an adapter's grouping-panel slot —
 * `@adapttable/core`'s `GroupingPanelSlotProps` over React column
 * definitions.
 *
 * @public
 */
export type GroupingPanelSlotProps<TRow = unknown> =
  NeutralGroupingPanelSlotProps<ColumnDef<TRow>>;

/** A subscription for a state with no live part: its owner redraws it. */
const STATIC_STATE = (): (() => void) => () => undefined;

/**
 * The drag and announcement as they change while a drag hovers. The table
 * redraws the strip when a drag starts or ends; the strip follows the hover
 * itself, so a drag never redraws the rows.
 */
function useLiveGroupingState(
  state: GroupingPanelState
): Pick<GroupingPanelState, "drag" | "announcement"> {
  const live = state.live;
  const current = () => (live ? live.getSnapshot() : state);
  return useSyncExternalStore(
    live?.subscribe ?? STATIC_STATE,
    current,
    current
  );
}

/** Full props for {@link GroupingPanelChrome}. @public */
export interface GroupingPanelChromeProps<
  TRow = unknown,
> extends GroupingPanelSlotProps<TRow> {
  /** Kit-owned controls used for every visible element. */
  slots: GroupingPanelSlots;
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
  const {
    Surface,
    DropZone,
    Chip,
    Select,
    RemoveZone,
    AggregationItem,
    AggregationRemove,
    AggregationPicker,
    AggregationRestore,
  } = slots;
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const available = groupingAvailableColumns(columns, state.groupBy);
  /** A column's display name, or its key for a cell only the app declared. */
  const nameOf = (key: string): string => {
    const column = byKey.get(key);
    return column ? groupingColumnName(column) : key;
  };
  const items = state.aggregations.items;
  const aggregationsRef = useRef<HTMLFieldSetElement>(null);
  const pendingRemovalIndex = useRef<number | null>(null);
  const itemKeys = items.map((item) => item.columnKey).join("\0");
  useEffect(() => {
    const removedIndex = pendingRemovalIndex.current;
    if (removedIndex === null) return;
    pendingRemovalIndex.current = null;
    focusAfterAggregationRemoval(
      aggregationsRef.current,
      items.map((item) => item.columnKey),
      removedIndex
    );
  }, [itemKeys, items]);
  // Grouping and aggregation are independent: a grouped column may still
  // carry a Count (or any other allowed operation). The group's row count
  // is not a substitute — missing values make those different.
  const offered = state.aggregations.candidates;

  // Which boundary, chip and strip target is live for the drag in flight.
  // A chip is a target too, and the nearest one to the reader's hand: dropping
  // onto a chip takes that chip's place. The strip is mostly free space, and a
  // drop there lands at the end — unless a caret or a chip inside it already
  // answered something more precise.
  const { drag, announcement } = useLiveGroupingState(state);
  const plan = groupingDropPlan(state.groupBy, drag);
  const inert = plan.inert;
  const ontoChip = (index: number): CoreGroupingDropProps => {
    const target = plan.chipTarget(index);
    if (target === undefined) {
      return INERT_DROP_PROPS as unknown as CoreGroupingDropProps;
    }
    return deferGroupingDropToInner(state.dropProps(target));
  };
  const ontoPanel = (): CoreGroupingDropProps =>
    plan.panelTarget === undefined
      ? {}
      : deferGroupingDropToInner(state.dropProps(plan.panelTarget));

  const boundary = (index: number) =>
    inert(index)
      ? {
          dragging: false,
          active: false,
          dropProps: INERT_DROP_PROPS,
        }
      : {
          dragging: drag !== undefined,
          active: drag?.overIndex === index,
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
      {state.groupBy.map((key, index) => {
        const label = byKey.has(key)
          ? groupingColumnName(byKey.get(key)!)
          : key;
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
          dragging={drag !== undefined}
          active={drag?.overIndex === 0}
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
      {/* Aggregations own the line under the grouping chips — never mixed
          onto the chip row, even when the strip still has room. */}
      {state.groupBy.length > 0 && (items.length > 0 || offered.length > 0) ? (
        <fieldset
          ref={aggregationsRef}
          aria-label={labels.groupingAggregations}
          data-adapttable-part="grouping-aggregations"
          style={{
            display: "flex",
            flex: "1 0 100%",
            width: "100%",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem",
            minWidth: 0,
            minInlineSize: 0,
            margin: 0,
            padding: 0,
            border: "none",
          }}
        >
          {items.map((item) => {
            const name = nameOf(item.columnKey);
            return (
              <span
                key={item.columnKey}
                data-adapttable-aggregation={item.columnKey}
              >
                <AggregationItem
                  label={name}
                  readOnly={!item.editable}
                  readOnlyLabel={labels.groupingAggregationReadOnly}
                  data-adapttable-part="grouping-aggregation-item"
                >
                  {item.editable ? (
                    <>
                      <Select
                        label={labels.groupingAggregationFor(name)}
                        value={item.operationId ?? ""}
                        options={groupingAggregationOptions(item, labels)}
                        onChange={(value) => {
                          if (value === "") return;
                          state.setAggregateOperation(item.columnKey, value);
                        }}
                        disabled={!state.canSetAggregates}
                        data-adapttable-part="grouping-aggregation-operation"
                      />
                      <AggregationRemove
                        label={labels.groupingRemoveAggregation(name)}
                        onRemove={() => {
                          pendingRemovalIndex.current = items.findIndex(
                            (entry) => entry.columnKey === item.columnKey
                          );
                          state.removeAggregate(item.columnKey);
                        }}
                        data-adapttable-part="grouping-aggregation-remove"
                      />
                    </>
                  ) : null}
                </AggregationItem>
              </span>
            );
          })}
          <AggregationPicker
            label={labels.groupingAddAggregation}
            options={offered.map((candidate) => ({
              value: candidate.columnKey,
              label: nameOf(candidate.columnKey),
              checked: candidate.active,
            }))}
            onToggle={(value, checked) => {
              if (checked) {
                state.addAggregate(value);
                return;
              }
              pendingRemovalIndex.current = items.findIndex(
                (entry) => entry.columnKey === value
              );
              state.removeAggregate(value);
            }}
            disabled={!state.canSetAggregates || offered.length === 0}
            data-adapttable-part="grouping-aggregation-add"
          />
          {state.aggregations.hasDefaults && !state.aggregations.atDefaults ? (
            <AggregationRestore
              label={labels.groupingRestoreAggregations}
              disabled={!state.canSetAggregates}
              onRestore={state.restoreAggregateDefaults}
              data-adapttable-part="grouping-aggregations-restore"
            />
          ) : null}
        </fieldset>
      ) : null}
      <LiveRegion part="grouping-announcer" statusRole={false}>
        {announcement}
      </LiveRegion>
      {/* The way out of a grouping, on a line of its own: a target squeezed in
          beside the chips is one a reader never finds. It exists only while a
          chip is in the air, so it takes the line BELOW them — a line that
          appears above the chips moves the one under the pointer, and a drag
          whose source is pulled away the instant it starts never begins. */}
      {drag?.source === "chip" ? (
        <span style={{ display: "flex", flex: "1 0 100%", width: "100%" }}>
          <RemoveZone
            label={labels.groupingDropToRemove}
            active={drag.overRemove === true}
            dropProps={reactGroupingDropProps(state.removeDropProps())}
            data-adapttable-part="grouping-remove-zone"
          />
        </span>
      ) : null}
    </Surface>
  );
}
