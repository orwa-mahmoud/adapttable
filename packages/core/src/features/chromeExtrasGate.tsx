/**
 * Mount optional chrome extras in-tree: grouping, tree, expansion, editing.
 *
 * Each feature fills its live slot with a child that calls the hooks.
 * Empty slots pass chrome through unchanged, so the lean table never
 * imports those modules.
 */
import type { ReactNode } from "react";

import type { BaseDataTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import { FeatureSlot, useFeatureSlotFilled } from "./providers";
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
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(slot);
  const slotProps = {
    chrome,
    props,
    children,
  } as unknown as ChromeExtraSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={slot} props={slotProps} />
  ) : (
    children(chrome)
  );
}

/**
 * The order the gates nest in, outermost first.
 *
 * Each one may replace fields the next reads — the layout decides which
 * columns exist before grouping buckets them, and grouping decides the row set
 * before editing addresses a row — so the sequence is the contract, not a
 * detail of how it is written.
 */
const EXTRA_SLOTS = [
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

/** One link of the chain: gate on this slot, then hand the rest the result. */
function ExtraGateChain<TRow>({
  index,
  chrome,
  props,
  children,
}: {
  readonly index: number;
  readonly chrome: TableChrome<TRow>;
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const slot = EXTRA_SLOTS[index];
  return slot === undefined ? (
    children(chrome)
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
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  return (
    <ExtraGateChain index={0} chrome={chrome} props={props}>
      {children}
    </ExtraGateChain>
  );
}
