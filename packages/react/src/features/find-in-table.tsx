/**
 * Find-in-table — `@adapttable/<kit>/find-in-table`.
 *
 * The factory and the hook live together on this entry, so a table that
 * never imports it never carries the find walk. The hook mounts in-tree
 * through {@link FIND_LIVE}.
 */
import type { ReactNode } from "react";

import { useFindInTable } from "../find/useFindInTable";
import { slotRender } from "./providers";
import { FIND_LIVE, type FindLiveSlotProps } from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveFind({
  children,
  ...options
}: FindLiveSlotProps<never>): ReactNode {
  const find = useFindInTable(options);
  return children(find);
}

/**
 * Add the find bar, opened with Ctrl/Cmd+F.
 *
 * @public
 */
export function findInTable(): StaticTableFeature {
  return {
    id: "find-in-table",
    apply: () => ({ findInTable: true }),
    renders: [slotRender(FIND_LIVE, (props) => <LiveFind {...props} />)],
  };
}
