/**
 * Edit history — `@adapttable/<kit>/editing`.
 *
 * The undo stack lives on this entry. A table that never imports it never
 * records gestures. The hook mounts in-tree through {@link EDIT_HISTORY_LIVE}.
 */
import type { ReactNode } from "react";

import { useTableEditHistory } from "../editing/editHistory";
import { slotRender } from "./providers";
import { EDIT_HISTORY_LIVE, type EditHistoryLiveSlotProps } from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveEditHistory({
  children,
  editHistory,
  columns,
  onCellEdit,
}: EditHistoryLiveSlotProps<never>): ReactNode {
  const result = useTableEditHistory({
    editHistory,
    columns,
    onCellEdit,
  });
  return children(result);
}

/**
 * Track edits so they can be undone and redone.
 *
 * @public
 */
export function editHistory(
  options: boolean | { depth?: number } = true
): StaticTableFeature {
  return {
    id: "edit-history",
    apply: () => ({ editHistory: options }),
    renders: [
      slotRender(EDIT_HISTORY_LIVE, (props) => <LiveEditHistory {...props} />),
    ],
  };
}
