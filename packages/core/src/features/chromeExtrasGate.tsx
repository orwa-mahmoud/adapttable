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
  readonly slot:
    | typeof COLUMN_LAYOUT_LIVE
    | typeof FILTER_CHIPS_LIVE
    | typeof GROUPING_LIVE
    | typeof TREE_LIVE
    | typeof SELECTION_LIVE
    | typeof ROW_ACTIONS_LIVE
    | typeof PINNING_LIVE
    | typeof EXPANSION_LIVE
    | typeof EDITING_LIVE;
  readonly chrome: TableChrome<TRow>;
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(slot);
  if (!filled) return children(chrome);
  const slotProps = {
    chrome,
    props,
    children,
  } as unknown as ChromeExtraSlotProps<never>;
  return <FeatureSlot slot={slot} props={slotProps} />;
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
    <ExtraGate slot={COLUMN_LAYOUT_LIVE} chrome={chrome} props={props}>
      {(withLayout) => (
        <ExtraGate slot={FILTER_CHIPS_LIVE} chrome={withLayout} props={props}>
          {(withChips) => (
            <ExtraGate slot={GROUPING_LIVE} chrome={withChips} props={props}>
              {(withGroups) => (
                <ExtraGate slot={TREE_LIVE} chrome={withGroups} props={props}>
                  {(withTree) => (
                    <ExtraGate
                      slot={SELECTION_LIVE}
                      chrome={withTree}
                      props={props}
                    >
                      {(withSelection) => (
                        <ExtraGate
                          slot={ROW_ACTIONS_LIVE}
                          chrome={withSelection}
                          props={props}
                        >
                          {(withActions) => (
                            <ExtraGate
                              slot={PINNING_LIVE}
                              chrome={withActions}
                              props={props}
                            >
                              {(withPins) => (
                                <ExtraGate
                                  slot={EXPANSION_LIVE}
                                  chrome={withPins}
                                  props={props}
                                >
                                  {(withDetail) => (
                                    <ExtraGate
                                      slot={EDITING_LIVE}
                                      chrome={withDetail}
                                      props={props}
                                    >
                                      {children}
                                    </ExtraGate>
                                  )}
                                </ExtraGate>
                              )}
                            </ExtraGate>
                          )}
                        </ExtraGate>
                      )}
                    </ExtraGate>
                  )}
                </ExtraGate>
              )}
            </ExtraGate>
          )}
        </ExtraGate>
      )}
    </ExtraGate>
  );
}
