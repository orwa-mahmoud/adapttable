import { clipboardRangeText, writeClipboardText } from "@adapttable/core";
import type { ReactNode } from "react";

import { FeatureSlot, useFeatureSlotFilled } from "../features/providers";
import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  GRID_FOCUS_ANNOUNCER,
  SIDE_PANEL,
} from "../features/slotKeys";

type ContextMenuProps = Omit<ContextMenuLiveSlotProps<never>, "children">;

/**
 * Copy the one cell a context menu was opened over.
 *
 * Without cell navigation there is no grid address and no range, but the
 * target already names the row and the column, which is all a single cell
 * needs. The text is the cell's export value, as a range copy writes it.
 */
function copyTargetCell(
  props: ContextMenuProps,
  target: Parameters<NonNullable<ContextMenuProps["actions"]["onCopy"]>>[0]
): void {
  if (target.kind !== "cell") return;
  const column = props.columns.find((item) => item.key === target.columnKey);
  if (!column) return;
  const text = clipboardRangeText({
    range: { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } },
    rows: [target.row],
    columns: [column],
  });
  // The menu has closed and nothing announces a result without cell
  // navigation; a refused clipboard leaves the clipboard as it was.
  void writeClipboardText(text);
}

/**
 * Mount a composed context-menu feature around an adapter's table region.
 *
 * Copy acts on the grid's selection when `cellNavigation()` is composed, and
 * on the right-clicked cell when it is not.
 *
 * @public
 */
export function ContextMenuLiveGate({
  props,
  children,
}: {
  readonly props: ContextMenuProps;
  readonly children: (regionProps: Record<string, unknown>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CONTEXT_MENU_LIVE);
  const gridNavigation = useFeatureSlotFilled(GRID_FOCUS_ANNOUNCER);
  if (!filled) return children({});
  const onCopy = props.actions.onCopy;
  const menuProps: ContextMenuProps =
    gridNavigation || !onCopy
      ? props
      : {
          ...props,
          actions: {
            ...props.actions,
            onCopy: (target) => {
              copyTargetCell(props, target);
            },
          },
        };
  return (
    <FeatureSlot slot={CONTEXT_MENU_LIVE} props={{ ...menuProps, children }} />
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
