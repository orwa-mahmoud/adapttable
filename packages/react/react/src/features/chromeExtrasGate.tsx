/**
 * Walk the chrome stages the composed features bring: the column layout,
 * grouping, the tree, selection, row actions and pins, expansion, editing and
 * edit history, each after the stages whose values it reads.
 *
 * The base names none of them. A table that composes none walks nothing and
 * never imports their modules.
 */
import {
  type LiveStage,
  TableRuntimePublisher,
} from "@adapttable/core/binding";
import { type ReactNode, useState } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import type { EditableCellEditing } from "../editing/editableCellController";
import { useFeatureState } from "./featureState";
import { useChromeStages, usePublishTableRuntime } from "./providers";
import type { ChromeExtraSlotProps } from "./slotKeys";
import {
  EDITING_STATE,
  GROUPING_STATE,
  type GroupingState,
  ROW_PINNING_STATE,
  TREE_STATE,
  type TreeState,
} from "./stateKeys";

/** The props a chrome stage reads and may hand on. */
type StageTableProps<TRow> = ChromeExtraSlotProps<TRow>["props"];

/** What the walk hands on once every stage ran. */
type WalkDone<TRow, TProps> = (
  chrome: TableChrome<TRow>,
  props: TProps
) => ReactNode;

function RuntimePublisher<TRow, TProps extends StageTableProps<TRow>>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: TProps;
  readonly children: WalkDone<TRow, TProps>;
}): ReactNode {
  "use no memo";
  // One publisher per table: it keeps the neutral table, and hands it a
  // binding that reads the latest published view.
  const [publisher] = useState(() => new TableRuntimePublisher<TRow>());
  const editing = useFeatureState(EDITING_STATE) as
    EditableCellEditing<TRow> | undefined;
  const rowPinning = useFeatureState(ROW_PINNING_STATE);
  const grouping = useFeatureState(GROUPING_STATE) as
    GroupingState<TRow> | undefined;
  const tree = useFeatureState(TREE_STATE) as TreeState<TRow> | undefined;
  publisher.stage(
    chrome,
    { rowActions: props.rowActions, bulkActions: props.bulkActions },
    {
      filterDefs: props.filterDefs,
      filterRegistry: props.filterRegistry,
      editing,
      rowPinning,
      grouping,
      tree,
    }
  );
  const labels = chrome.table.labels;
  usePublishTableRuntime<TRow>({
    rows: () => publisher.visibleRows(),
    labels: () => labels,
    view: () => publisher.view(),
  });
  return children(chrome, props);
}

/** One link of the walk: run this stage, then hand the rest what it grew. */
function ChromeStageChain<TRow, TProps extends StageTableProps<TRow>>({
  stages,
  index,
  chrome,
  props,
  children,
}: {
  readonly stages: readonly LiveStage<ReactNode>[];
  readonly index: number;
  readonly chrome: TableChrome<TRow>;
  readonly props: TProps;
  readonly children: WalkDone<TRow, TProps>;
}): ReactNode {
  const stage = stages[index];
  const rest = (
    next: TableChrome<TRow>,
    nextProps: StageTableProps<TRow> | undefined
  ): ReactNode => (
    // A stage hands on the props it was given, grown: the same shape.
    <ChromeStageChain
      stages={stages}
      index={index + 1}
      chrome={next}
      props={(nextProps ?? props) as TProps}
    >
      {children}
    </ChromeStageChain>
  );
  const run = stage?.render as
    ((props: ChromeExtraSlotProps<TRow>) => ReactNode) | undefined;
  const node: ReactNode = run ? (
    run({ chrome, props, children: rest })
  ) : (
    <RuntimePublisher chrome={chrome} props={props}>
      {children}
    </RuntimePublisher>
  );
  return node;
}

/**
 * Grow base chrome through the composed chrome stages.
 *
 * @public
 */
export function ChromeExtrasGate<
  TRow,
  TProps extends ChromeExtraSlotProps<TRow>["props"],
>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: TProps;
  readonly children: (chrome: TableChrome<TRow>, props: TProps) => ReactNode;
}): ReactNode {
  const stages = useChromeStages();
  return (
    <ChromeStageChain stages={stages} index={0} chrome={chrome} props={props}>
      {children}
    </ChromeStageChain>
  );
}
