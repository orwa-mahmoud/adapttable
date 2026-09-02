import type {
  DragEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
} from "react";

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

/** Drag props spread onto a desktop column header or a grouping chip. @public */
export interface GroupingDragProps extends Pick<
  HTMLAttributes<HTMLElement>,
  "draggable" | "onDragStart" | "onDragEnd"
> {
  /** Marks the element whose native drag is active. */
  "data-grouping-dragging"?: boolean;
}

/** Props spread onto one insertion target in the grouping strip. @public */
export interface GroupingDropProps extends Pick<
  HTMLAttributes<HTMLElement>,
  "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
> {
  /** Marks the insertion target currently under the dragged field. */
  "data-drop-active"?: boolean;
}

/** Keyboard props spread onto a grouping chip's drag handle. @public */
export interface GroupingChipKeyboardProps {
  /** Keep every grouping handle in the tab order. */
  tabIndex: 0;
  /** Expose the handle as an interactive control. */
  role: "button";
  /** Localized move instruction for the field. */
  "aria-label": string;
  /** Handle logical arrow movement and removal keys. */
  onKeyDown: KeyboardEventHandler<HTMLElement>;
}

/** Interaction engine published by the optional feature provider. @public */
export interface GroupingPanelInteractions {
  /** Active native drag, when one is in progress. */
  drag?: GroupingDragState;
  /** Latest localized screen-reader announcement. */
  announcement: string;
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
  /** Set or clear one session aggregate override. */
  setAggregate: (
    key: string,
    value: GroupAggregateOverride | undefined
  ) => void;
}

/** Live panel state adapters and the column menu consume. @public */
export interface GroupingPanelState extends GroupingPanelInteractions {
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
export type GroupingDropHandler = DragEventHandler<HTMLElement>;
