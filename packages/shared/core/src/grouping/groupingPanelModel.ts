import type { DeclaredAggregates } from "../aggregate/aggregate";
import type { AggregationModel } from "../aggregate/aggregationModel";
import type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
} from "./groupAggregateOverrides";

/** Native drag payload used only by the optional grouping-panel feature. */
export const GROUPING_COLUMN_DND_MIME =
  "application/x-adapttable-grouping-column";

/** Where a grouping field drag started. @public */
export type GroupingDragSource = "header" | "chip";

/** Active drag metadata exposed to panel chrome. @public */
export interface GroupingDragState {
  /** Column key being dragged. */
  key: string;
  /** Whether the drag began on a table header or active chip. */
  source: GroupingDragSource;
  /** Insertion boundary currently under the drag. */
  overIndex?: number;
  /** Whether the drag is over the ungroup target. */
  overRemove?: boolean;
}

/**
 * Drag props spread onto a desktop column header or a grouping chip.
 *
 * @typeParam TDragEvent - The binding's drag event (React's synthetic event
 *   in React, the DOM event elsewhere).
 *
 * @public
 */
export interface GroupingDragProps<TDragEvent = DragEvent> {
  /** Native HTML drag handle. */
  draggable?: boolean;
  /** Starts the grouping-field drag. */
  onDragStart?: (event: TDragEvent) => void;
  /** Ends the grouping-field drag. */
  onDragEnd?: (event: TDragEvent) => void;
  /** Marks the element whose native drag is active. */
  "data-grouping-dragging"?: boolean;
}

/**
 * Props spread onto one insertion target in the grouping strip.
 *
 * @typeParam TDragEvent - The binding's drag event.
 *
 * @public
 */
export interface GroupingDropProps<TDragEvent = DragEvent> {
  /** Enters an insertion target. */
  onDragEnter?: (event: TDragEvent) => void;
  /** Moves over an insertion target. */
  onDragOver?: (event: TDragEvent) => void;
  /** Leaves an insertion target. */
  onDragLeave?: (event: TDragEvent) => void;
  /** Drops onto an insertion target. */
  onDrop?: (event: TDragEvent) => void;
  /** Marks the insertion target currently under the dragged field. */
  "data-drop-active"?: boolean;
}

/**
 * Keyboard props spread onto a grouping chip's drag handle.
 *
 * @typeParam TKeyboardEvent - The binding's key event.
 *
 * @public
 */
export interface GroupingChipKeyboardProps<TKeyboardEvent = KeyboardEvent> {
  /** Keep every grouping handle in the tab order. */
  tabIndex: 0;
  /** Expose the handle as an interactive control. */
  role: "button";
  /** Localized move instruction for the field. */
  "aria-label": string;
  /** Handle logical arrow movement and removal keys. */
  onKeyDown: (event: TKeyboardEvent) => void;
}

/** Interaction engine published by the optional feature provider. @public */
export interface GroupingPanelInteractions {
  /**
   * Active native drag, when one is in progress. From a table snapshot it
   * names the dragged field only; {@link GroupingPanelInteractions.live}
   * carries where the drag hovers.
   */
  drag?: GroupingDragState;
  /** Latest localized screen-reader announcement. */
  announcement: string;
  /**
   * The drag and announcement as they change while a drag hovers, for the
   * strip that draws the drop targets. `getSnapshot` returns a new object
   * whenever either changes.
   */
  live?: {
    /** Listen for a change. Returns the unsubscribe. */
    readonly subscribe: (listener: () => void) => () => void;
    /** The current drag and announcement. */
    readonly getSnapshot: () => {
      readonly drag: GroupingDragState | undefined;
      readonly announcement: string;
    };
  };
  /** Props for a draggable desktop column header. */
  headerDragProps: (key: string) => GroupingDragProps;
  /** Props for a draggable grouping chip. */
  chipDragProps: (key: string) => GroupingDragProps;
  /** Keyboard controls for a grouping chip. */
  chipKeyboardProps: (key: string, label: string) => GroupingChipKeyboardProps;
  /** Props for one insertion boundary. */
  dropProps: (index: number) => GroupingDropProps;
  /** Props for the drag-to-ungroup target. */
  removeDropProps: () => GroupingDropProps;
  /** Append a grouping field. */
  add: (key: string) => void;
  /** Remove a grouping field. */
  remove: (key: string) => void;
  /** Move a grouping field by one logical position. */
  moveBy: (key: string, delta: -1 | 1) => void;
  /** Set or clear one session aggregate override, without validation. */
  setAggregate: (
    key: string,
    value: GroupAggregateOverride | undefined
  ) => void;
  /**
   * What the developer's own `groupAggregates` mapper declares, when the
   * table built it with `aggregate()`. Published by the panel feature, which
   * is the only part that was handed the mapper.
   */
  declaredAggregates?: DeclaredAggregates;
  /**
   * Change one active aggregation's operation. An operation the column does
   * not offer is refused rather than calculated.
   */
  setAggregateOperation: (key: string, operationId: string) => void;
  /** Turn a column's aggregation on with its opening operation. */
  addAggregate: (key: string) => void;
  /**
   * Take one aggregation away. Removing something the developer declared
   * records the removal, so the default does not come straight back.
   */
  removeAggregate: (key: string) => void;
  /** Restore the developer's whole initial setup, removals included. */
  restoreAggregateDefaults: () => void;
}

/** Live panel state adapters and the column menu consume. @public */
export interface GroupingPanelState extends GroupingPanelInteractions {
  /**
   * Every active aggregation and every column still on offer.
   *
   * The one list the panel and the column menu both read, so a column offers
   * the same operations wherever a reader meets it. Built by the chrome from
   * the choices the current render carries.
   */
  aggregations: AggregationModel;
  /** Ordered grouping fields, outermost first. */
  groupBy: readonly string[];
  /** Session aggregate choices keyed by column. */
  aggregateOverrides: GroupAggregateOverrides;
  /** Whether the source exposes the aggregate-state mutator. */
  canSetAggregates: boolean;
}

/** Add or move `key` at one strip insertion boundary. */
export function moveGroupingKey(
  keys: readonly string[],
  key: string,
  insertionIndex: number
): string[] {
  if (key === "") return [...keys];
  const current = keys.indexOf(key);
  const without = keys.filter((candidate) => candidate !== key);
  const adjusted =
    current >= 0 && current < insertionIndex
      ? insertionIndex - 1
      : insertionIndex;
  const index = Math.max(0, Math.min(adjusted, without.length));
  without.splice(index, 0, key);
  return without;
}

/** Move one grouping key by a logical position. */
export function moveGroupingKeyBy(
  keys: readonly string[],
  key: string,
  delta: -1 | 1
): string[] {
  const from = keys.indexOf(key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= keys.length) return [...keys];
  const next = [...keys];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/** Remove one key without disturbing the remaining nesting order. */
export function removeGroupingKey(
  keys: readonly string[],
  key: string
): string[] {
  return keys.filter((candidate) => candidate !== key);
}

/** Whether a native drag carries this feature's payload. */
export function hasGroupingColumnDrag(
  event: Pick<DragEvent, "dataTransfer">
): boolean {
  const transfer = event.dataTransfer;
  return (
    transfer !== null && [...transfer.types].includes(GROUPING_COLUMN_DND_MIME)
  );
}

/** Read the dragged key, tolerating browser/test payload omissions. */
export function groupingDragKey(
  event: Pick<DragEvent, "dataTransfer">
): string | undefined {
  const key = event.dataTransfer?.getData(GROUPING_COLUMN_DND_MIME);
  return key === "" ? undefined : key;
}

/** Shared native drop handler type for tests and adapters. */
export type GroupingDropHandler = (event: DragEvent) => void;
