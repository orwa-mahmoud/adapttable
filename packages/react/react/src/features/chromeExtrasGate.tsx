/**
 * Mount optional chrome extras in-tree: grouping, tree, expansion, editing.
 *
 * Each feature fills its live slot with a child that calls the hooks.
 * Empty slots pass chrome through unchanged, so the lean table never
 * imports those modules.
 */
import { TableRuntimePublisher } from "@adapttable/core/binding";
import { type ReactNode, useState } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import type { ComposedTableProps } from "../props";
import {
  FeatureSlot,
  useFeatureSlotFilled,
  usePublishTableRuntime,
} from "./providers";
import {
  type ChromeExtraSlotProps,
  COLUMN_LAYOUT_LIVE,
  EDITING_LIVE,
  EXPANSION_LIVE,
  FILTER_CHIPS_LIVE,
  GROUPING_LIVE,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  SELECTION_LIVE,
  TREE_LIVE,
} from "./slotKeys";

function ExtraGate<TRow>({
  slot,
  chrome,
  props,
  children,
}: {
  readonly slot: typeof COLUMN_LAYOUT_LIVE;
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(slot);
  const slotProps = {
    chrome,
    props,
    children,
  } satisfies ChromeExtraSlotProps<TRow>;
  return filled ? (
    <FeatureSlot slot={slot} props={slotProps} />
  ) : (
    children(chrome)
  );
}

/** Each extra's slot key, by id; core owns the order they nest in. */
/** The extra slots, in core's `CHROME_EXTRA_SLOT_ORDER`; a test holds them. */
export const EXTRA_SLOTS = [
  COLUMN_LAYOUT_LIVE,
  FILTER_CHIPS_LIVE,
  GROUPING_LIVE,
  TREE_LIVE,
  SELECTION_LIVE,
  ROW_ACTIONS_LIVE,
  PINNING_LIVE,
  EXPANSION_LIVE,
  EDITING_LIVE,
] as const;

function RuntimePublisher<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  // One publisher per table: it keeps the neutral table, and hands it a
  // binding that reads the latest published view.
  const [publisher] = useState(() => new TableRuntimePublisher<TRow>());
  const view = publisher.update(chrome, {
    rowActions: props.rowActions,
    bulkActions: props.bulkActions,
  });
  usePublishTableRuntime(
    view.visibleRows ?? view.rows,
    chrome.table.labels,
    view
  );
  return children(chrome);
}

/** One link of the chain: gate on this slot, then hand the rest the result. */
function ExtraGateChain<TRow>({
  index,
  chrome,
  props,
  children,
}: {
  readonly index: number;
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const slot = EXTRA_SLOTS[index];
  return slot === undefined ? (
    <RuntimePublisher chrome={chrome} props={props}>
      {children}
    </RuntimePublisher>
  ) : (
    <ExtraGate slot={slot} chrome={chrome} props={props}>
      {(next) => (
        <ExtraGateChain index={index + 1} chrome={next} props={props}>
          {children}
        </ExtraGateChain>
      )}
    </ExtraGate>
  );
}

/**
 * Overlay grouping, tree, expansion and editing onto base chrome.
 *
 * @public
 */
export function ChromeExtrasGate<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  return (
    <ExtraGateChain index={0} chrome={chrome} props={props}>
      {children}
    </ExtraGateChain>
  );
}
