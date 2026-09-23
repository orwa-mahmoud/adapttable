import type { ReactNode } from "react";

import { FeatureSlot, useFeatureSlotFilled } from "../features/providers";
import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  SIDE_PANEL,
} from "../features/slotKeys";

/**
 * Mount a composed context-menu feature around an adapter's table region.
 *
 * @public
 */
export function ContextMenuLiveGate({
  props,
  children,
}: {
  readonly props: Omit<ContextMenuLiveSlotProps<never>, "children">;
  readonly children: (regionProps: Record<string, unknown>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CONTEXT_MENU_LIVE);
  return filled ? (
    <FeatureSlot slot={CONTEXT_MENU_LIVE} props={{ ...props, children }} />
  ) : (
    children({})
  );
}

/**
 * Place a composed side panel beside an adapter's table region.
 *
 * The helper owns only invariant flex structure. The panel itself, including
 * its portal, controls, focus behavior and pixels, remains kit-owned.
 *
 * @public
 */
export function OptionalSidePanel({
  side,
  body,
  panel,
}: {
  readonly side?: "start" | "end";
  readonly body: ReactNode;
  readonly panel: ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(SIDE_PANEL);
  const alongside = filled && panel != null && panel !== false;
  return !alongside ? (
    body
  ) : (
    <div
      data-adapttable-part="table-region"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        flexDirection: side === "start" ? "row-reverse" : "row",
      }}
    >
      <div
        data-adapttable-part="table-region-main"
        style={{ flex: 1, minWidth: 0 }}
      >
        {body}
      </div>
      {panel}
    </div>
  );
}
