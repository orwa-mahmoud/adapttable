/**
 * The grouping strip's drop and focus policy, as its chrome needs it.
 *
 * The strip nests drop targets — an insertion caret inside a chip's row, a
 * chip inside the panel — and a chip being dragged makes some of them
 * meaningless. Which target is live, which one refuses, and where focus goes
 * after an aggregation is removed are decisions, not layout, so every
 * binding's chrome reads them from here.
 */
import type { ResolvedAggregateOperation } from "../aggregate/aggregatable";
import type { AggregationItem } from "../aggregate/aggregationModel";
import type { TableLabels } from "../types";
import type { GroupingDragState } from "./groupingPanelModel";

/**
 * The four drop handlers of one grouping target, over whatever event type the
 * binding's handlers receive.
 *
 * @public
 */
export interface GroupingDropHandlers<TEvent> {
  /** A dragged field entered the target. */
  onDragEnter?: (event: TEvent) => void;
  /** A dragged field is over the target. */
  onDragOver?: (event: TEvent) => void;
  /** A dragged field left the target. */
  onDragLeave?: (event: TEvent) => void;
  /** A dragged field was let go over the target. */
  onDrop?: (event: TEvent) => void;
}

/**
 * The strip's drop plan for one drag.
 *
 * @public
 */
export interface GroupingDropPlan {
  /**
   * Whether the insertion boundary `index` does nothing. A chip dropped either
   * side of itself lands exactly where it already is; those boundaries are
   * the two nearest the reader's hand, so offering them is offering a target
   * that does nothing — which reads as the drag failing.
   */
  readonly inert: (index: number) => boolean;
  /**
   * Where a drop onto the chip at `index` inserts, or `undefined` when that
   * chip is the one being dragged and refuses. Dropping onto a chip takes
   * that chip's place.
   */
  readonly chipTarget: (index: number) => number | undefined;
  /**
   * Where a drop on the strip's free space inserts — the end — or `undefined`
   * when that end is inert.
   */
  readonly panelTarget: number | undefined;
}

/**
 * Plan the strip's drop targets for the drag in flight.
 *
 * @param groupBy - The grouping keys, outermost first.
 * @param drag - The drag in flight, if any.
 * @returns Which targets are live and where each inserts.
 *
 * @public
 */
export function groupingDropPlan(
  groupBy: readonly string[],
  drag: GroupingDragState | undefined
): GroupingDropPlan {
  const lifted = drag?.source === "chip" ? groupBy.indexOf(drag.key) : -1;
  const inert = (index: number): boolean =>
    lifted >= 0 && (index === lifted || index === lifted + 1);
  const end = groupBy.length;
  return {
    inert,
    chipTarget: (index) => {
      const target = lifted >= 0 && lifted < index ? index + 1 : index;
      // The chip being dragged is not a place to drop it.
      return lifted >= 0 && target === lifted ? undefined : target;
    },
    panelTarget: inert(end) ? undefined : end,
  };
}

/**
 * Drop handlers that refuse.
 *
 * Nothing calls `preventDefault`, so the browser shows the reader this is not
 * a place to let go — and the event stops here rather than reaching the chip
 * or the strip around it, both of which would have taken it. A refusal that
 * bubbles is not a refusal.
 *
 * @public
 */
export const INERT_GROUPING_DROP_HANDLERS: Readonly<
  GroupingDropHandlers<{ stopPropagation(): void }>
> = {
  onDragEnter: (event) => {
    event.stopPropagation();
  },
  onDragOver: (event) => {
    event.stopPropagation();
  },
  onDragLeave: (event) => {
    event.stopPropagation();
  },
  onDrop: (event) => {
    event.stopPropagation();
  },
};

/**
 * Drop handlers that stand down for whatever inside them already answered.
 *
 * The strip nests targets, and the innermost one is always the more precise
 * answer. It says so by calling `preventDefault`, which is how the browser is
 * told a drop is accepted here; anything wrapping it reads that and keeps out
 * of the way. Leaving is never deferred.
 *
 * @param props - The target's own handlers.
 * @returns The same handlers, skipped once an inner target accepted.
 *
 * @public
 */
export function deferGroupingDropToInner<
  TEvent extends { readonly defaultPrevented: boolean },
>(props: GroupingDropHandlers<TEvent>): GroupingDropHandlers<TEvent> {
  const passUp =
    (handler: ((event: TEvent) => void) | undefined) =>
    (event: TEvent): void => {
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

/**
 * The name a grouping chip or picker shows for a column: its text header,
 * else its mobile label, else its key.
 *
 * @param column - The column.
 * @returns Its display name.
 *
 * @public
 */
export function groupingColumnName(column: {
  readonly key: string;
  readonly header?: unknown;
  readonly mobileLabel?: string;
}): string {
  if (typeof column.header === "string") return column.header;
  return column.mobileLabel ?? column.key;
}

/**
 * The columns the add-grouping picker offers: every groupable column not
 * already grouped, in column order.
 *
 * @param columns - Every table column.
 * @param groupBy - The grouping keys already active.
 * @returns The picker's options.
 *
 * @public
 */
export function groupingAvailableColumns(
  columns: readonly {
    readonly key: string;
    readonly header?: unknown;
    readonly mobileLabel?: string;
    readonly groupable?: boolean;
  }[],
  groupBy: readonly string[]
): { value: string; label: string }[] {
  return columns
    .filter(
      (column) => column.groupable !== false && !groupBy.includes(column.key)
    )
    .map((column) => ({
      value: column.key,
      label: groupingColumnName(column),
    }));
}

/**
 * What one aggregate operation is called.
 *
 * The table localizes its own five; an operation a column declared itself
 * carries the label the host wrote, which no locale file can know.
 *
 * @param operation - The operation.
 * @param labels - Resolved table labels.
 * @returns Its display name.
 *
 * @public
 */
export function groupingOperationLabel(
  operation: Pick<ResolvedAggregateOperation, "id" | "builtIn" | "label">,
  labels: Required<TableLabels>
): string {
  if (!operation.builtIn) return operation.label ?? operation.id;
  const named: Partial<Record<string, string>> = {
    sum: labels.selectionSum,
    avg: labels.groupingAverage,
    min: labels.selectionMin,
    max: labels.selectionMax,
    count: labels.selectionCount,
  };
  return named[operation.id] ?? operation.id;
}

/**
 * The operation choices for one active aggregation, including an honest
 * current value: "Custom" for a host mapper the table cannot name, or the
 * current operation when the column no longer lists it.
 *
 * @param item - The active aggregation.
 * @param labels - Resolved table labels.
 * @returns The select's options.
 *
 * @public
 */
export function groupingAggregationOptions(
  item: AggregationItem,
  labels: Required<TableLabels>
): { value: string; label: string }[] {
  const options = item.operations.map((operation) => ({
    value: operation.id,
    label: groupingOperationLabel(operation, labels),
  }));
  if (item.operationId === undefined) {
    options.unshift({ value: "", label: labels.groupingAggregationCustom });
  } else if (!options.some((option) => option.value === item.operationId)) {
    options.unshift({
      value: item.operationId,
      label: groupingOperationLabel(
        { id: item.operationId, builtIn: true },
        labels
      ),
    });
  }
  return options;
}

/**
 * Where focus goes after an aggregation's remove control unmounts, as the
 * selectors to try in order: the next remaining item's remove, the previous
 * one's, the first picker option, then the picker or the restore button — so
 * a keyboard reader is never dumped onto the document body.
 *
 * @param remainingKeys - The aggregated column keys left, in order.
 * @param removedIndex - Where the removed item stood.
 * @returns Selectors, most precise first.
 *
 * @public
 */
export function aggregationRemovalFocusSelectors(
  remainingKeys: readonly string[],
  removedIndex: number
): string[] {
  const selectors: string[] = [];
  const nextKey =
    remainingKeys[removedIndex] ?? remainingKeys[removedIndex - 1];
  if (nextKey) {
    selectors.push(
      `[data-adapttable-aggregation="${CSS.escape(nextKey)}"] [data-adapttable-part="grouping-aggregation-remove"]`
    );
  }
  selectors.push(
    `[data-adapttable-part="grouping-aggregation-option"]`,
    `[data-adapttable-part="grouping-aggregation-add"], [data-adapttable-part="grouping-aggregations-restore"]`
  );
  return selectors;
}

const AGGREGATION_FOCUS_CONTROLS =
  'input:not([type="hidden"]),button,select,textarea,[tabindex]';

function aggregationControlIsHidden(target: HTMLElement): boolean {
  if (
    target.closest(
      '[hidden],[inert],[aria-hidden="true"],[aria-disabled="true"]'
    )
  )
    return true;
  const view = target.ownerDocument.defaultView;
  for (
    let ancestor: HTMLElement | null = target;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const style = view?.getComputedStyle(ancestor);
    if (
      style?.display === "none" ||
      style?.visibility === "hidden" ||
      style?.visibility === "collapse"
    )
      return true;
  }
  return false;
}

function focusOwnedAggregationControl(part: HTMLElement): boolean {
  const candidates = part.matches(AGGREGATION_FOCUS_CONTROLS)
    ? [part]
    : part.querySelectorAll(AGGREGATION_FOCUS_CONTROLS);
  for (const target of candidates) {
    if (
      !(target instanceof HTMLElement) ||
      target.matches(":disabled") ||
      aggregationControlIsHidden(target)
    )
      continue;
    target.focus();
    if (target.ownerDocument.activeElement === target) return true;
  }
  return false;
}

/**
 * Move focus after an aggregation was removed, following
 * {@link aggregationRemovalFocusSelectors} inside `root`.
 *
 * @param root - The aggregations group, or `null` when it is not mounted.
 * @param remainingKeys - The aggregated column keys left, in order.
 * @param removedIndex - Where the removed item stood.
 *
 * @public
 */
export function focusAfterAggregationRemoval(
  root: ParentNode | null,
  remainingKeys: readonly string[],
  removedIndex: number
): void {
  for (const selector of aggregationRemovalFocusSelectors(
    remainingKeys,
    removedIndex
  )) {
    for (const part of root?.querySelectorAll(selector) ?? []) {
      if (
        typeof HTMLElement !== "undefined" &&
        part instanceof HTMLElement &&
        !part.matches(':disabled,[aria-disabled="true"]') &&
        focusOwnedAggregationControl(part)
      )
        return;
    }
  }
}
