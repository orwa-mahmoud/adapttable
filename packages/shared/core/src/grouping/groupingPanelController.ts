/**
 * The interactive grouping panel's behavior: the drag state machine, the
 * aggregate gates, and what each change announces.
 *
 * A binding holds one controller per panel, hands it the live table through
 * {@link TableRuntime} (read at the moment of an event, never during render),
 * and publishes {@link GroupingPanelController.interactions} to its chrome.
 * Everything a reader can do to the strip — drag a header in, drag a chip out,
 * move a chip with the arrows, add or remove an aggregation — is decided here,
 * so every framework's panel refuses and announces the same things.
 */
import {
  type AggregationSourceSupport,
  allowsReaderOperation,
  resolveAggregatable,
} from "../aggregate/aggregatable";
import {
  type DeclaredAggregates,
  declaredAggregates as readDeclaredAggregates,
} from "../aggregate/aggregate";
import {
  addAggregation,
  type AggregationModelInput,
  columnAggregationSignature,
  declaredByDeveloper,
  initialOperation,
  readerControlAllowed,
  reconcileAggregations,
  removeAggregation,
  restoreAggregationDefaults,
} from "../aggregate/aggregationModel";
import type { TableRuntime } from "../features/tableRuntime";
import { isRtlElement } from "../layout/writingDirection";
import type { GroupAggregateOverride } from "./groupAggregateOverrides";
import {
  GROUPING_COLUMN_DND_MIME,
  type GroupingChipKeyboardProps,
  groupingDragKey,
  type GroupingDragProps,
  type GroupingDragSource,
  type GroupingDragState,
  type GroupingDropProps,
  type GroupingPanelInteractions,
  hasGroupingColumnDrag,
  moveGroupingKey,
  moveGroupingKeyBy,
  removeGroupingKey,
} from "./groupingPanelModel";
import { formatGroupBy, parseGroupBy } from "./groupKeys";

/**
 * As much of a native drag event as the grouping panel reads. A DOM
 * `DragEvent` and every framework's wrapper around one satisfy it.
 *
 * @public
 */
export interface GroupingDragEventLike {
  /** The drag's payload; `null` only on a synthetic event. */
  readonly dataTransfer: DataTransfer | null;
  /** Where the event started. */
  readonly target: EventTarget | null;
  /** The element the handler is bound to. */
  readonly currentTarget: EventTarget | null;
  /** Accept the drop, or refuse the drag start. */
  preventDefault(): void;
}

/**
 * As much of a key press on a grouping chip as the panel reads.
 *
 * @public
 */
export interface GroupingKeyEventLike {
  /** The key pressed, as `KeyboardEvent.key` names it. */
  readonly key: string;
  /** The chip the handler is bound to, for its writing direction. */
  readonly currentTarget: EventTarget | null;
  /** Keep the arrow from scrolling the page. */
  preventDefault(): void;
}

/**
 * What a grouping panel controller reads.
 *
 * @public
 */
export interface GroupingPanelControllerOptions {
  /** The live table, read from event handlers. */
  readonly runtime: TableRuntime;
  /**
   * The developer's `groupAggregates` mapper, when the panel was composed
   * with one — the only place its declared aggregates can be read from.
   */
  readonly groupAggregates?: unknown;
}

/**
 * The panel's transient state at one moment.
 *
 * @public
 */
export interface GroupingPanelSnapshot {
  /** The drag in flight, or `undefined` when none is. */
  readonly drag: GroupingDragState | undefined;
  /** The latest screen-reader announcement. Empty until something happens. */
  readonly announcement: string;
}

/**
 * The grouping panel's controller.
 *
 * @public
 */
export interface GroupingPanelController {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => GroupingPanelSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: GroupingPanelControllerOptions) => void;
  /**
   * Seed the table's grouping from the panel's initial keys, once. A table
   * whose URL already carries a grouping keeps it.
   */
  readonly initialize: (initialGroupBy?: string | readonly string[]) => void;
  /** Append a grouping field and announce it. */
  readonly add: (key: string) => void;
  /** Remove a grouping field and announce it. */
  readonly remove: (key: string) => void;
  /** Move a grouping field by one logical position and announce it. */
  readonly moveBy: (key: string, delta: -1 | 1) => void;
  /**
   * Begin a drag from a header or a chip. A header drag that starts inside
   * a field, a chooser or a link is refused: that gesture is theirs.
   */
  readonly startDrag: (
    key: string,
    source: GroupingDragSource,
    event: GroupingDragEventLike
  ) => void;
  /** End the drag, dropped or not. */
  readonly finishDrag: () => void;
  /** A dragged field entered the insertion boundary `index`. */
  readonly dragEnter: (index: number, event: GroupingDragEventLike) => void;
  /** A dragged field is over the insertion boundary `index`. */
  readonly dragOver: (index: number, event: GroupingDragEventLike) => void;
  /** A dragged field was let go at the insertion boundary `index`. */
  readonly drop: (index: number, event: GroupingDragEventLike) => void;
  /** A dragged chip entered the ungroup target. */
  readonly removeDragEnter: (event: GroupingDragEventLike) => void;
  /** A dragged chip is over the ungroup target. */
  readonly removeDragOver: (event: GroupingDragEventLike) => void;
  /** A dragged chip was let go over the ungroup target. */
  readonly removeDrop: (event: GroupingDragEventLike) => void;
  /**
   * An arrow key on a chip: up and down move it by one, left and right move
   * it in reading order, flipped under RTL.
   */
  readonly chipKeyDown: (key: string, event: GroupingKeyEventLike) => void;
  /** The chip handle's localized accessible name. */
  readonly chipLabel: (label: string) => string;
  /** Set or clear one aggregate override, refusing what the column forbids. */
  readonly setAggregate: (
    key: string,
    value: GroupAggregateOverride | undefined
  ) => void;
  /** Change one aggregation's operation, refusing one the column does not offer. */
  readonly setAggregateOperation: (key: string, operationId: string) => void;
  /** Turn a column's aggregation on with its opening operation. */
  readonly addAggregate: (key: string) => void;
  /** Take one aggregation away, recording it when the developer declared it. */
  readonly removeAggregate: (key: string) => void;
  /** Put the developer's declared setup back. */
  readonly restoreAggregateDefaults: () => void;
  /**
   * Drop reader choices a column no longer allows. A binding calls this
   * whenever {@link GroupingPanelController.reconcileKey} changes.
   */
  readonly reconcile: () => void;
  /**
   * What reconciling depends on, as one value: the reader's choices, the
   * columns they can land on, and the operations the backend listed.
   */
  readonly reconcileKey: () => string;
  /**
   * The interactions the chrome consumes, built over the snapshot the binding
   * rendered and the aggregates the panel's mapper declares. The same object
   * while both are, so a binding can publish it without memoizing it again.
   *
   * @param snapshot - The snapshot being rendered.
   * @param declared - `declaredAggregates(groupAggregates)` for the panel's
   *   mapper.
   */
  readonly interactions: (
    snapshot: GroupingPanelSnapshot,
    declared: DeclaredAggregates | undefined
  ) => GroupingPanelInteractions;
}

/** The built-in operations' label keys and English fallbacks. */
const BUILT_IN_LABELS: Readonly<
  Record<string, readonly [labelKey: string, fallback: string]>
> = {
  sum: ["selectionSum", "Sum"],
  avg: ["groupingAverage", "Average"],
  min: ["selectionMin", "Minimum"],
  max: ["selectionMax", "Maximum"],
  count: ["selectionCount", "Count"],
  none: ["groupingAggregationNone", "None"],
};

/**
 * Controls whose own gesture a drag would steal.
 *
 * A field, a chooser or a link each does something with a press-and-move of
 * its own — selecting text, opening a list, dragging a URL — so a drag that
 * starts inside one is theirs. A BUTTON is not among them: a press is a click
 * and a press-and-move is a drag, and the browser already tells the two apart.
 * Counting buttons here made the sort control an undraggable hole across the
 * middle of every header, which is most of what a reader aims at.
 */
const OWN_GESTURE_SELECTOR =
  "input,select,textarea,a[href],[contenteditable='true'],[data-no-group-drag]";

function isInteractiveDragTarget(event: GroupingDragEventLike): boolean {
  const target = event.target;
  return (
    typeof Element !== "undefined" &&
    target instanceof Element &&
    target !== event.currentTarget &&
    target.closest(OWN_GESTURE_SELECTOR) !== null
  );
}

/** The chip's element, for its writing direction; `isRtlElement` tolerates stubs. */
function asElement(target: EventTarget | null): HTMLElement | null {
  return target as HTMLElement | null;
}

/**
 * Create the grouping panel's controller.
 *
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createGroupingPanelController(
  initial: GroupingPanelControllerOptions
): GroupingPanelController {
  let options = initial;
  let snapshot: GroupingPanelSnapshot = {
    drag: undefined,
    announcement: "",
  };
  let initialized = false;
  let built:
    | {
        readonly snapshot: GroupingPanelSnapshot;
        readonly declared: DeclaredAggregates | undefined;
        readonly value: GroupingPanelInteractions;
      }
    | undefined;
  const listeners = new Set<() => void>();

  const commit = (next: Partial<GroupingPanelSnapshot>): void => {
    const merged = { ...snapshot, ...next };
    if (
      merged.drag === snapshot.drag &&
      merged.announcement === snapshot.announcement
    ) {
      return;
    }
    snapshot = merged;
    // Subscription changes during a publication apply to the next publication.
    const pendingListeners = [...listeners];
    for (const listener of pendingListeners) listener();
  };
  const setDrag = (
    recipe: (
      current: GroupingDragState | undefined
    ) => GroupingDragState | undefined
  ): void => {
    commit({ drag: recipe(snapshot.drag) });
  };
  const announce = (text: string): void => {
    commit({ announcement: text });
  };

  const view = () => options.runtime.view();
  const groupingState = () => view()?.groupingState;

  const activeKeys = (): string[] => {
    const current = view();
    const live = current?.grouping as
      { groupBy?: readonly string[] } | undefined;
    return live?.groupBy
      ? [...live.groupBy]
      : parseGroupBy(current?.groupingState?.groupBy);
  };
  const labelText = (key: string): string =>
    groupingState()?.columnLabel(key) ?? key;
  const spoken = <TArgs extends readonly unknown[]>(
    key: string,
    fallback: (...args: TArgs) => string,
    ...args: TArgs
  ): string => {
    const candidate = options.runtime.labels()?.[key];
    return typeof candidate === "function"
      ? String((candidate as (...values: TArgs) => unknown)(...args))
      : fallback(...args);
  };
  /**
   * What one operation is called. The table localizes its own operations; a
   * host operation carries the label the host wrote, which is the only name
   * it has.
   */
  const aggregateChoiceText = (value: string, hostLabel?: string): string => {
    const entry = BUILT_IN_LABELS[value];
    if (!entry) return hostLabel ?? value;
    const localized = options.runtime.labels()?.[entry[0]];
    return typeof localized === "string" ? localized : entry[1];
  };

  const writeKeys = (next: readonly string[]): void => {
    groupingState()?.setGroupBy(formatGroupBy(next));
  };
  const announceAdded = (key: string): void => {
    announce(
      spoken(
        "groupingAdded",
        (name) => `${name} added to grouping`,
        labelText(key)
      )
    );
  };
  const announceMoved = (key: string, position: number): void => {
    announce(
      spoken(
        "groupingMoved",
        (name, at) => `${name} moved to grouping position ${String(at)}`,
        labelText(key),
        position
      )
    );
  };
  const announceAggregate = (
    key: string,
    operationId: string | undefined,
    hostLabel?: string
  ): void => {
    const column = labelText(key);
    if (operationId === undefined) {
      announce(
        spoken(
          "groupingAggregateRemoved",
          (name) => `${name} aggregate removed`,
          column
        )
      );
      return;
    }
    announce(
      spoken(
        "groupingAggregateChanged",
        (name, aggregate) =>
          `${name} group aggregation changed to ${aggregate}`,
        column,
        aggregateChoiceText(operationId, hostLabel)
      )
    );
  };

  const aggregationSource = (): AggregationSourceSupport | undefined => {
    const current = view();
    const grouping = current?.sourceCapabilities?.grouping;
    const listed = current?.groupingState?.aggregateOperations;
    if (grouping === undefined && listed === undefined) return undefined;
    return { grouping, aggregateOperations: listed };
  };
  const aggregationInput = (): AggregationModelInput<unknown> => {
    const state = groupingState();
    return {
      columns: state?.columns ?? [],
      overrides: state?.aggregateOverrides ?? {},
      declared: readDeclaredAggregates(options.groupAggregates),
      queryAggregates: state?.queryAggregates,
      computedKeys: state?.computedAggregateKeys,
      source: aggregationSource(),
    };
  };
  const columnOf = (input: AggregationModelInput<unknown>, key: string) =>
    input.columns.find((candidate) => candidate.key === key);

  const add = (key: string): void => {
    const keys = activeKeys();
    if (key === "" || keys.includes(key)) return;
    writeKeys([...keys, key]);
    announceAdded(key);
  };
  const remove = (key: string): void => {
    const keys = activeKeys();
    if (!keys.includes(key)) return;
    writeKeys(removeGroupingKey(keys, key));
    announce(
      spoken(
        "groupingRemoved",
        (name) => `${name} removed from grouping`,
        labelText(key)
      )
    );
  };
  const moveBy = (key: string, delta: -1 | 1): void => {
    const keys = activeKeys();
    const next = moveGroupingKeyBy(keys, key, delta);
    const index = next.indexOf(key);
    if (index === keys.indexOf(key)) return;
    writeKeys(next);
    announceMoved(key, index + 1);
  };

  const startDrag = (
    key: string,
    source: GroupingDragSource,
    event: GroupingDragEventLike
  ): void => {
    if (source === "header" && isInteractiveDragTarget(event)) {
      event.preventDefault();
      return;
    }
    const transfer = event.dataTransfer;
    if (transfer) {
      transfer.effectAllowed = "move";
      transfer.setData(GROUPING_COLUMN_DND_MIME, key);
      transfer.setData("text/plain", key);
    }
    commit({ drag: { key, source } });
  };
  const finishDrag = (): void => {
    commit({ drag: undefined });
  };
  const hoverBoundary = (index: number): void => {
    setDrag((current) =>
      current ? { ...current, overIndex: index, overRemove: false } : current
    );
  };
  const dragEnter = (index: number, event: GroupingDragEventLike): void => {
    if (hasGroupingColumnDrag(event)) hoverBoundary(index);
  };
  const dragOver = (index: number, event: GroupingDragEventLike): void => {
    if (!hasGroupingColumnDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    hoverBoundary(index);
  };
  const drop = (index: number, event: GroupingDragEventLike): void => {
    if (!hasGroupingColumnDrag(event)) return;
    event.preventDefault();
    const key = groupingDragKey(event) ?? snapshot.drag?.key;
    if (!key) return;
    const before = activeKeys();
    const next = moveGroupingKey(before, key, index);
    writeKeys(next);
    if (before.includes(key)) announceMoved(key, next.indexOf(key) + 1);
    else announceAdded(key);
    commit({ drag: undefined });
  };
  const chipDragged = (event: GroupingDragEventLike): boolean =>
    snapshot.drag?.source === "chip" && hasGroupingColumnDrag(event);
  const removeDragEnter = (event: GroupingDragEventLike): void => {
    if (!chipDragged(event)) return;
    setDrag((current) =>
      current ? { ...current, overIndex: undefined, overRemove: true } : current
    );
  };
  const removeDragOver = (event: GroupingDragEventLike): void => {
    if (!chipDragged(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  };
  const removeDrop = (event: GroupingDragEventLike): void => {
    const dragged = snapshot.drag;
    if (!dragged || !chipDragged(event)) return;
    event.preventDefault();
    remove(groupingDragKey(event) ?? dragged.key);
    commit({ drag: undefined });
  };

  const chipKeyDown = (key: string, event: GroupingKeyEventLike): void => {
    let delta: -1 | 1 | undefined;
    if (event.key === "ArrowUp") delta = -1;
    else if (event.key === "ArrowDown") delta = 1;
    else if (event.key === "ArrowLeft")
      delta = isRtlElement(asElement(event.currentTarget)) ? 1 : -1;
    else if (event.key === "ArrowRight")
      delta = isRtlElement(asElement(event.currentTarget)) ? -1 : 1;
    if (delta === undefined) return;
    event.preventDefault();
    moveBy(key, delta);
  };
  const chipLabel = (label: string): string =>
    spoken("moveGroupingColumn", (name) => `Move ${name} grouping`, label);

  const setAggregate = (
    key: string,
    value: GroupAggregateOverride | undefined
  ): void => {
    const state = groupingState();
    if (!state?.setAggregateOverrides) return;
    if (value !== undefined) {
      const input = aggregationInput();
      const column = columnOf(input, key);
      // Columns the runtime does not yet know stay writable so a host can
      // seed state; a column that is known must still offer the operation.
      if (column) {
        const resolved = resolveAggregatable(column);
        const allowed =
          value === "none"
            ? readerControlAllowed(resolved, input.source)
            : allowsReaderOperation(resolved, value, input.source);
        if (!allowed) return;
      }
    }
    const next = { ...state.aggregateOverrides };
    if (value === undefined) delete next[key];
    else next[key] = value;
    state.setAggregateOverrides(next);
  };
  const setAggregateOperation = (key: string, operationId: string): void => {
    const input = aggregationInput();
    const column = columnOf(input, key);
    const resolved = column ? resolveAggregatable(column) : undefined;
    // The one gate every entry point shares. An operation the column does not
    // offer is refused here rather than calculated, whatever asked for it —
    // this panel, the column menu, a link, or a restored view.
    if (
      !resolved ||
      !allowsReaderOperation(resolved, operationId, input.source)
    )
      return;
    setAggregate(key, operationId);
    announceAggregate(
      key,
      operationId,
      resolved.operations.find((entry) => entry.id === operationId)?.label
    );
  };
  const addAggregate = (key: string): void => {
    const input = aggregationInput();
    const column = columnOf(input, key);
    const state = groupingState();
    const resolved = column ? resolveAggregatable(column) : undefined;
    if (!resolved || !state?.setAggregateOverrides) return;
    const operationId = initialOperation(resolved, input.source);
    state.setAggregateOverrides(
      addAggregation(state.aggregateOverrides, key, operationId)
    );
    announceAggregate(
      key,
      operationId,
      resolved.operations.find((entry) => entry.id === operationId)?.label
    );
  };
  const removeAggregate = (key: string): void => {
    const input = aggregationInput();
    const column = columnOf(input, key);
    const state = groupingState();
    if (!column || !state?.setAggregateOverrides) return;
    // Taking away something the developer declared has to be recorded as a
    // decision. Dropping the entry would hand the column straight back to the
    // default the reader just removed.
    state.setAggregateOverrides(
      removeAggregation(
        state.aggregateOverrides,
        key,
        declaredByDeveloper(column, input)
      )
    );
    announceAggregate(key, undefined);
  };
  const restoreAggregateDefaults = (): void => {
    const state = groupingState();
    if (!state?.setAggregateOverrides) return;
    state.setAggregateOverrides(restoreAggregationDefaults());
    announce(
      spoken(
        "groupingAggregatesRestored",
        () => "Aggregations restored to defaults"
      )
    );
  };

  const reconcile = (): void => {
    // A link, a saved view or a configuration change can carry an operation
    // a column no longer allows. Reconciling means it is never calculated,
    // while an explicit removal — the reader's own decision — survives.
    const state = groupingState();
    if (!state?.setAggregateOverrides) return;
    const current = state.aggregateOverrides;
    const next = reconcileAggregations(
      current,
      state.columns ?? [],
      aggregationSource()
    );
    if (next !== current) state.setAggregateOverrides(next);
  };
  const reconcileKey = (): string => {
    const state = groupingState();
    const overrides = Object.entries(state?.aggregateOverrides ?? {})
      .map(([key, value]) => `${key}:${String(value)}`)
      .sort((left, right) => left.localeCompare(right))
      .join(",");
    const columns = (state?.columns ?? [])
      .map((column) => columnAggregationSignature(column))
      .join(",");
    const listed = (state?.aggregateOperations ?? []).join("/");
    return `${overrides}|${columns}|${listed}`;
  };

  const initialize = (initialGroupBy?: string | readonly string[]): void => {
    if (initialized) return;
    initialized = true;
    const encoded = formatGroupBy(parseGroupBy(initialGroupBy));
    const state = groupingState();
    if (!state || !encoded) return;
    if (state.initializeGroupBy) state.initializeGroupBy(encoded);
    else if (state.groupBy === undefined) state.setGroupBy(encoded);
  };

  const dragFlag = (key: string, source: GroupingDragSource) =>
    snapshot.drag?.key === key && snapshot.drag.source === source
      ? true
      : undefined;
  const dragProps = (
    key: string,
    source: GroupingDragSource
  ): GroupingDragProps => ({
    draggable: true,
    onDragStart: (event) => {
      startDrag(key, source, event);
    },
    onDragEnd: finishDrag,
    "data-grouping-dragging": dragFlag(key, source),
  });
  const dropProps = (index: number): GroupingDropProps => ({
    onDragEnter: (event) => {
      dragEnter(index, event);
    },
    onDragOver: (event) => {
      dragOver(index, event);
    },
    onDragLeave: () => undefined,
    onDrop: (event) => {
      drop(index, event);
    },
    "data-drop-active":
      snapshot.drag?.overIndex === index && snapshot.drag.overRemove !== true
        ? true
        : undefined,
  });
  const removeDropProps = (): GroupingDropProps => ({
    onDragEnter: removeDragEnter,
    onDragOver: removeDragOver,
    onDragLeave: () => undefined,
    onDrop: removeDrop,
    "data-drop-active": snapshot.drag?.overRemove === true ? true : undefined,
  });
  const chipKeyboardProps = (
    key: string,
    label: string
  ): GroupingChipKeyboardProps => ({
    tabIndex: 0,
    role: "button",
    "aria-label": chipLabel(label),
    onKeyDown: (event) => {
      chipKeyDown(key, event);
    },
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure: (next) => {
      options = next;
    },
    initialize,
    add,
    remove,
    moveBy,
    startDrag,
    finishDrag,
    dragEnter,
    dragOver,
    drop,
    removeDragEnter,
    removeDragOver,
    removeDrop,
    chipKeyDown,
    chipLabel,
    setAggregate,
    setAggregateOperation,
    addAggregate,
    removeAggregate,
    restoreAggregateDefaults,
    reconcile,
    reconcileKey,
    interactions: (rendered, declared) => {
      if (built?.snapshot === rendered && built.declared === declared) {
        return built.value;
      }
      const value: GroupingPanelInteractions = {
        drag: rendered.drag,
        announcement: rendered.announcement,
        headerDragProps: (key) => dragProps(key, "header"),
        chipDragProps: (key) => dragProps(key, "chip"),
        chipKeyboardProps,
        dropProps,
        removeDropProps,
        add,
        remove,
        moveBy,
        setAggregate,
        declaredAggregates: declared,
        setAggregateOperation,
        addAggregate,
        removeAggregate,
        restoreAggregateDefaults,
      };
      built = { snapshot: rendered, declared, value };
      return value;
    },
  };
}
