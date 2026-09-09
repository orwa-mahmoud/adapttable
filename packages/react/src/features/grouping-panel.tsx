/**
 * Interactive row grouping — `@adapttable/<kit>/grouping-panel`.
 *
 * This entry owns its drag state, announcements, and the ordinary grouping
 * engine. Importing plain `grouping()` never reaches this module.
 */
import {
  addAggregation,
  type AggregationSourceSupport,
  allowsReaderOperation,
  declaredAggregates,
  declaredByDeveloper,
  formatGroupBy,
  type GroupAggregateOverride,
  GROUPING_COLUMN_DND_MIME,
  groupingDragKey,
  type GroupingDragSource,
  type GroupingDragState,
  type GroupingPanelInteractions,
  hasGroupingColumnDrag,
  initialOperation,
  isRtlElement,
  moveGroupingKey,
  moveGroupingKeyBy,
  parseGroupBy,
  reconcileAggregations,
  removeAggregation,
  removeGroupingKey,
  resolveAggregatable,
  restoreAggregationDefaults,
} from "@adapttable/core";
import {
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { grouping, type GroupingExtras } from "./grouping";
import { GROUPING_PANEL_STATE } from "./groupingPanelKey";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  useTableRuntime,
} from "./providers";
import type { TableFeature } from "./tableFeature";

type RuntimeGrouping = NonNullable<
  ReturnType<ReturnType<typeof useTableRuntime>["view"]>
>["groupingState"];

interface GroupingPanelFeature<TRow> extends TableFeature<TRow> {
  initialGroupBy?: string | readonly string[];
  /** The extras the panel was composed with, for their declared aggregates. */
  extras?: GroupingExtras<TRow>;
}

/**
 * What the aggregation model is built from, as one value.
 *
 * The runtime view is read through a getter, so a memo over it needs
 * something that changes when its inputs do: the reader's choices, and the
 * columns those choices can land on.
 */
function aggregationInputKey(
  runtime: ReturnType<typeof useTableRuntime>
): string {
  const groupingState = runtime.view()?.groupingState;
  const overrides = Object.entries(groupingState?.aggregateOverrides ?? {})
    .map(([key, value]) => `${key}:${String(value)}`)
    .sort((left, right) => left.localeCompare(right))
    .join(",");
  const columns = (groupingState?.columns ?? [])
    .map((column) => column.key)
    .join(",");
  return `${overrides}|${columns}`;
}

function activeKeys(runtime: ReturnType<typeof useTableRuntime>): string[] {
  const view = runtime.view();
  const live = view?.grouping as { groupBy?: readonly string[] } | undefined;
  return live?.groupBy
    ? [...live.groupBy]
    : parseGroupBy(view?.groupingState?.groupBy);
}

function labelText(
  runtime: ReturnType<typeof useTableRuntime>,
  key: string
): string {
  return runtime.view()?.groupingState?.columnLabel(key) ?? key;
}

function spoken<TArgs extends readonly unknown[]>(
  runtime: ReturnType<typeof useTableRuntime>,
  key: string,
  fallback: (...args: TArgs) => string,
  ...args: TArgs
): string {
  const candidate = runtime.labels()?.[key];
  return typeof candidate === "function"
    ? String((candidate as (...values: TArgs) => unknown)(...args))
    : fallback(...args);
}

const BUILT_IN_LABELS = {
  sum: ["selectionSum", "Sum"],
  avg: ["groupingAverage", "Average"],
  min: ["selectionMin", "Minimum"],
  max: ["selectionMax", "Maximum"],
  count: ["selectionCount", "Count"],
  none: ["groupingAggregationNone", "None"],
} as const;

/**
 * What one operation is called.
 *
 * The table localizes its own operations; a host operation carries the label
 * the host wrote, which is the only name it has.
 */
function aggregateChoiceText(
  runtime: ReturnType<typeof useTableRuntime>,
  value: string | undefined,
  hostLabel?: string
): string {
  if (value === undefined) return hostLabel ?? "";
  const entry = BUILT_IN_LABELS[value as keyof typeof BUILT_IN_LABELS];
  if (!entry) return hostLabel ?? value;
  const localized = runtime.labels()?.[entry[0]];
  return typeof localized === "string" ? localized : entry[1];
}

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
function isInteractiveDragTarget(event: ReactDragEvent<HTMLElement>): boolean {
  const target = event.target;
  return (
    target instanceof Element &&
    target !== event.currentTarget &&
    target.closest(
      "input,select,textarea,a[href],[contenteditable='true'],[data-no-group-drag]"
    ) !== null
  );
}

function GroupingPanelProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const runtime = useTableRuntime();
  const extras: GroupingExtras<unknown> =
    (feature as GroupingPanelFeature<unknown>).extras ?? {};
  const initialGroupBy = (feature as GroupingPanelFeature<unknown>)
    .initialGroupBy;
  const initialized = useRef(false);
  const [drag, setDrag] = useState<GroupingDragState>();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initial = parseGroupBy(initialGroupBy);
    const state = runtime.view()?.groupingState;
    const encoded = formatGroupBy(initial);
    if (!state || !encoded) return;
    if (state.initializeGroupBy) state.initializeGroupBy(encoded);
    else if (state.groupBy === undefined) state.setGroupBy(encoded);
  }, [initialGroupBy, runtime]);

  const writeKeys = useCallback(
    (next: readonly string[]) => {
      runtime.view()?.groupingState?.setGroupBy(formatGroupBy(next));
    },
    [runtime]
  );

  const announceAdded = useCallback(
    (key: string) => {
      const label = labelText(runtime, key);
      setAnnouncement(
        spoken(
          runtime,
          "groupingAdded",
          (name) => `${name} added to grouping`,
          label
        )
      );
    },
    [runtime]
  );

  const add = useCallback(
    (key: string) => {
      const keys = activeKeys(runtime);
      if (key === "" || keys.includes(key)) return;
      writeKeys([...keys, key]);
      announceAdded(key);
    },
    [announceAdded, runtime, writeKeys]
  );

  const remove = useCallback(
    (key: string) => {
      const keys = activeKeys(runtime);
      if (!keys.includes(key)) return;
      writeKeys(removeGroupingKey(keys, key));
      const label = labelText(runtime, key);
      setAnnouncement(
        spoken(
          runtime,
          "groupingRemoved",
          (name) => `${name} removed from grouping`,
          label
        )
      );
    },
    [runtime, writeKeys]
  );

  const moveBy = useCallback(
    (key: string, delta: -1 | 1) => {
      const keys = activeKeys(runtime);
      const next = moveGroupingKeyBy(keys, key, delta);
      const index = next.indexOf(key);
      if (index === keys.indexOf(key)) return;
      writeKeys(next);
      const label = labelText(runtime, key);
      setAnnouncement(
        spoken(
          runtime,
          "groupingMoved",
          (name, position) =>
            `${name} moved to grouping position ${String(position)}`,
          label,
          index + 1
        )
      );
    },
    [runtime, writeKeys]
  );

  const startDrag = useCallback(
    (
      key: string,
      source: GroupingDragSource,
      event: ReactDragEvent<HTMLElement>
    ) => {
      if (source === "header" && isInteractiveDragTarget(event)) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(GROUPING_COLUMN_DND_MIME, key);
      event.dataTransfer.setData("text/plain", key);
      setDrag({ key, source });
    },
    []
  );

  const finishDrag = useCallback(() => setDrag(undefined), []);

  const headerDragProps = useCallback(
    (key: string) => ({
      draggable: true,
      onDragStart: (event: ReactDragEvent<HTMLElement>) =>
        startDrag(key, "header", event),
      onDragEnd: finishDrag,
      "data-grouping-dragging":
        drag?.key === key && drag.source === "header" ? true : undefined,
    }),
    [drag, finishDrag, startDrag]
  );

  const chipDragProps = useCallback(
    (key: string) => ({
      draggable: true,
      onDragStart: (event: ReactDragEvent<HTMLElement>) =>
        startDrag(key, "chip", event),
      onDragEnd: finishDrag,
      "data-grouping-dragging":
        drag?.key === key && drag.source === "chip" ? true : undefined,
    }),
    [drag, finishDrag, startDrag]
  );

  const commitDrop = useCallback(
    (index: number, event: ReactDragEvent<HTMLElement>) => {
      if (!hasGroupingColumnDrag(event)) return;
      event.preventDefault();
      const key = groupingDragKey(event) ?? drag?.key;
      if (!key) return;
      const before = activeKeys(runtime);
      const next = moveGroupingKey(before, key, index);
      writeKeys(next);
      if (!before.includes(key)) announceAdded(key);
      else {
        const label = labelText(runtime, key);
        setAnnouncement(
          spoken(
            runtime,
            "groupingMoved",
            (name, position) =>
              `${name} moved to grouping position ${String(position)}`,
            label,
            next.indexOf(key) + 1
          )
        );
      }
      setDrag(undefined);
    },
    [announceAdded, drag?.key, runtime, writeKeys]
  );

  const dropProps = useCallback(
    (index: number) => ({
      onDragEnter: (event: ReactDragEvent<HTMLElement>) => {
        if (hasGroupingColumnDrag(event)) {
          setDrag((current) =>
            current
              ? { ...current, overIndex: index, overRemove: false }
              : current
          );
        }
      },
      onDragOver: (event: ReactDragEvent<HTMLElement>) => {
        if (!hasGroupingColumnDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDrag((current) =>
          current
            ? { ...current, overIndex: index, overRemove: false }
            : current
        );
      },
      onDragLeave: () => undefined,
      onDrop: (event: ReactDragEvent<HTMLElement>) => commitDrop(index, event),
      "data-drop-active":
        drag?.overIndex === index && drag.overRemove !== true
          ? true
          : undefined,
    }),
    [commitDrop, drag]
  );

  const removeDropProps = useCallback(
    () => ({
      onDragEnter: (event: ReactDragEvent<HTMLElement>) => {
        if (drag?.source === "chip" && hasGroupingColumnDrag(event)) {
          setDrag((current) =>
            current
              ? { ...current, overIndex: undefined, overRemove: true }
              : current
          );
        }
      },
      onDragOver: (event: ReactDragEvent<HTMLElement>) => {
        if (drag?.source !== "chip" || !hasGroupingColumnDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDragLeave: () => undefined,
      onDrop: (event: ReactDragEvent<HTMLElement>) => {
        if (drag?.source !== "chip" || !hasGroupingColumnDrag(event)) return;
        event.preventDefault();
        remove(groupingDragKey(event) ?? drag.key);
        setDrag(undefined);
      },
      "data-drop-active": drag?.overRemove === true ? true : undefined,
    }),
    [drag, remove]
  );

  const chipKeyboardProps = useCallback(
    (key: string, label: string) => ({
      tabIndex: 0 as const,
      role: "button" as const,
      "aria-label": spoken(
        runtime,
        "moveGroupingColumn",
        (name) => `Move ${name} grouping`,
        label
      ),
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        let delta: -1 | 1 | undefined;
        if (event.key === "ArrowUp") delta = -1;
        else if (event.key === "ArrowDown") delta = 1;
        else if (event.key === "ArrowLeft")
          delta = isRtlElement(event.currentTarget) ? 1 : -1;
        else if (event.key === "ArrowRight")
          delta = isRtlElement(event.currentTarget) ? -1 : 1;
        if (delta === undefined) return;
        event.preventDefault();
        moveBy(key, delta);
      },
    }),
    [moveBy, runtime]
  );

  /** Say what just happened to a column's aggregate. */
  const announceAggregate = useCallback(
    (key: string, operationId: string | undefined, hostLabel?: string) => {
      const column = labelText(runtime, key);
      if (operationId === undefined) {
        setAnnouncement(
          spoken(
            runtime,
            "groupingAggregateRemoved",
            (name) => `${name} aggregate removed`,
            column
          )
        );
        return;
      }
      setAnnouncement(
        spoken(
          runtime,
          "groupingAggregateChanged",
          (name, aggregate) =>
            `${name} group aggregation changed to ${aggregate}`,
          column,
          aggregateChoiceText(runtime, operationId, hostLabel)
        )
      );
    },
    [runtime]
  );

  // What the developer's own mapper declares. Only this feature can see it —
  // it was handed the extras — so it publishes it, and the chrome builds the
  // model with the live overrides beside it.
  const declared = useMemo(
    () => declaredAggregates(extras.groupAggregates),
    [extras.groupAggregates]
  );

  const aggregationSource = useCallback(():
    AggregationSourceSupport | undefined => {
    const view = runtime.view();
    const grouping = view?.sourceCapabilities?.grouping;
    const listed = view?.groupingState?.aggregateOperations;
    if (grouping === undefined && listed === undefined) return undefined;
    return { grouping, aggregateOperations: listed };
  }, [runtime]);

  const aggregationInput = useCallback(() => {
    const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
    return {
      columns: groupingState?.columns ?? [],
      overrides: groupingState?.aggregateOverrides ?? {},
      declared: declaredAggregates(extras.groupAggregates),
      queryAggregates: groupingState?.queryAggregates,
      computedKeys: groupingState?.computedAggregateKeys,
      source: aggregationSource(),
    };
  }, [aggregationSource, extras.groupAggregates, runtime]);

  const setAggregate = useCallback(
    (key: string, value: GroupAggregateOverride | undefined) => {
      const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
      if (!groupingState?.setAggregateOverrides) return;
      if (value !== undefined && value !== "none") {
        const input = aggregationInput();
        const column = input.columns.find((candidate) => candidate.key === key);
        // Columns the runtime does not yet know stay writable so a host can
        // seed state; a column that is known must still offer the operation.
        if (
          column &&
          !allowsReaderOperation(
            resolveAggregatable(column),
            value,
            input.source
          )
        ) {
          return;
        }
      }
      const next = { ...groupingState.aggregateOverrides };
      if (value === undefined) delete next[key];
      else next[key] = value;
      groupingState.setAggregateOverrides(next);
    },
    [aggregationInput, runtime]
  );

  const setAggregateOperation = useCallback(
    (key: string, operationId: string) => {
      const input = aggregationInput();
      const column = input.columns.find((candidate) => candidate.key === key);
      const resolved = column ? resolveAggregatable(column) : undefined;
      // The one gate every entry point shares. An operation the column does
      // not offer is refused here rather than calculated, whatever asked for
      // it — this panel, the column menu, a link, or a restored view.
      if (
        !resolved ||
        !allowsReaderOperation(resolved, operationId, input.source)
      ) {
        return;
      }
      setAggregate(key, operationId);
      announceAggregate(
        key,
        operationId,
        resolved.operations.find((entry) => entry.id === operationId)?.label
      );
    },
    [aggregationInput, announceAggregate, setAggregate]
  );

  const addAggregate = useCallback(
    (key: string) => {
      const input = aggregationInput();
      const column = input.columns.find((candidate) => candidate.key === key);
      const resolved = column ? resolveAggregatable(column) : undefined;
      if (!resolved) return;
      const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
      if (!groupingState?.setAggregateOverrides) return;
      const operationId = initialOperation(resolved, input.source);
      groupingState.setAggregateOverrides(
        addAggregation(groupingState.aggregateOverrides, key, operationId)
      );
      announceAggregate(
        key,
        operationId,
        resolved.operations.find((entry) => entry.id === operationId)?.label
      );
    },
    [aggregationInput, announceAggregate, runtime]
  );

  const removeAggregate = useCallback(
    (key: string) => {
      const input = aggregationInput();
      const column = input.columns.find((candidate) => candidate.key === key);
      const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
      if (!column || !groupingState?.setAggregateOverrides) return;
      // Taking away something the developer declared has to be recorded as a
      // decision. Dropping the entry would hand the column straight back to
      // the default the reader just removed.
      groupingState.setAggregateOverrides(
        removeAggregation(
          groupingState.aggregateOverrides,
          key,
          declaredByDeveloper(column, input)
        )
      );
      announceAggregate(key, undefined);
    },
    [aggregationInput, announceAggregate, runtime]
  );

  const restoreAggregateDefaults = useCallback(() => {
    const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
    if (!groupingState?.setAggregateOverrides) return;
    groupingState.setAggregateOverrides(restoreAggregationDefaults());
    setAnnouncement(
      spoken(
        runtime,
        "groupingAggregatesRestored",
        () => "Aggregations restored to defaults"
      )
    );
  }, [runtime]);

  // A link, a saved view or a configuration change can carry an operation a
  // column no longer allows. Reconciling here means it is never calculated,
  // while an explicit removal — the reader's own decision — survives.
  const overridesKey = aggregationInputKey(runtime);
  useEffect(() => {
    const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
    if (!groupingState?.setAggregateOverrides) return;
    const current = groupingState.aggregateOverrides;
    const next = reconcileAggregations(
      current,
      groupingState.columns ?? [],
      aggregationSource()
    );
    if (next !== current) groupingState.setAggregateOverrides(next);
  }, [aggregationSource, overridesKey, runtime]);

  const value = useMemo(
    () =>
      ({
        drag,
        announcement,
        headerDragProps,
        chipDragProps,
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
      }) as unknown as GroupingPanelInteractions,
    [
      add,
      addAggregate,
      announcement,
      declared,
      chipDragProps,
      chipKeyboardProps,
      drag,
      dropProps,
      headerDragProps,
      moveBy,
      remove,
      removeAggregate,
      removeDropProps,
      restoreAggregateDefaults,
      setAggregate,
      setAggregateOperation,
    ]
  );

  return (
    <FeatureStateScope stateKey={GROUPING_PANEL_STATE} value={value}>
      {children}
    </FeatureStateScope>
  );
}

/**
 * Add an interactive grouping panel while retaining the ordinary grouping
 * feature's options and row model.
 *
 * @public
 */
export function groupingPanel<TRow = unknown>(
  groupBy?: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  const base = grouping(groupBy ?? [], extras);
  return {
    ...base,
    id: "grouping-panel",
    initialGroupBy: groupBy,
    extras,
    apply(input) {
      const patch = base.apply?.(input) ?? {};
      const withoutInitialGroup = { ...patch };
      delete withoutInitialGroup.groupBy;
      return withoutInitialGroup;
    },
    provider: { Provider: GroupingPanelProvider },
  } as GroupingPanelFeature<TRow>;
}
