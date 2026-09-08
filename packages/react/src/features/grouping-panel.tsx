/**
 * Interactive row grouping — `@adapttable/<kit>/grouping-panel`.
 *
 * This entry owns its drag state, announcements, and the ordinary grouping
 * engine. Importing plain `grouping()` never reaches this module.
 */
import {
  formatGroupBy,
  type GroupAggregateOverride,
  GROUPING_COLUMN_DND_MIME,
  groupingDragKey,
  type GroupingDragSource,
  type GroupingDragState,
  type GroupingPanelInteractions,
  hasGroupingColumnDrag,
  isRtlElement,
  moveGroupingKey,
  moveGroupingKeyBy,
  parseGroupBy,
  removeGroupingKey,
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

function aggregateChoiceText(
  runtime: ReturnType<typeof useTableRuntime>,
  value: GroupAggregateOverride | undefined
): string {
  const choices = {
    default: ["groupingAggregationDefault", "Default"],
    sum: ["selectionSum", "Sum"],
    avg: ["groupingAverage", "Average"],
    min: ["selectionMin", "Minimum"],
    max: ["selectionMax", "Maximum"],
    count: ["selectionCount", "Count"],
    none: ["groupingAggregationNone", "None"],
  } as const;
  const [key, fallback] = choices[value ?? "default"];
  const localized = runtime.labels()?.[key];
  return typeof localized === "string" ? localized : fallback;
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

  const setAggregate = useCallback(
    (key: string, value: GroupAggregateOverride | undefined) => {
      const groupingState: RuntimeGrouping = runtime.view()?.groupingState;
      if (!groupingState?.setAggregateOverrides) return;
      const next = { ...groupingState.aggregateOverrides };
      if (value === undefined) delete next[key];
      else next[key] = value;
      groupingState.setAggregateOverrides(next);
      const column = labelText(runtime, key);
      const choice = aggregateChoiceText(runtime, value);
      setAnnouncement(
        spoken(
          runtime,
          "groupingAggregateChanged",
          (name, aggregate) =>
            `${name} group aggregation changed to ${aggregate}`,
          column,
          choice
        )
      );
    },
    [runtime]
  );

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
      }) as unknown as GroupingPanelInteractions,
    [
      add,
      announcement,
      chipDragProps,
      chipKeyboardProps,
      drag,
      dropProps,
      headerDragProps,
      moveBy,
      remove,
      removeDropProps,
      setAggregate,
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
    apply(input) {
      const patch = base.apply?.(input) ?? {};
      const withoutInitialGroup = { ...patch };
      delete withoutInitialGroup.groupBy;
      return withoutInitialGroup;
    },
    provider: { Provider: GroupingPanelProvider },
  } as GroupingPanelFeature<TRow>;
}
