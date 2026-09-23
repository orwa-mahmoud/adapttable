/**
 * Find-in-table — `@adapttable/<kit>/find-in-table`.
 *
 * The factory and the hook live together on this entry, so a table that
 * never imports it never carries the find walk. The hook mounts in-tree
 * through {@link FIND_LIVE}.
 */
import type { ReactNode } from "react";

import {
  FindStateContext,
  useFindScroll,
  useFindShortcut,
} from "../find/findMarks";
import { useFindInTable } from "../find/useFindInTable";
import { slotRender, useFeatureSlotFilled } from "./providers";
import { CELL_NAV_LIVE, FIND_LIVE, type FindLiveSlotProps } from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveFind({
  children,
  root,
  ...options
}: Readonly<FindLiveSlotProps<never>>): ReactNode {
  const find = useFindInTable(options);
  // With cell navigation the grid owns the walk's focus; without it, find
  // brings the current match into view itself.
  const gridNavigation = useFeatureSlotFilled(CELL_NAV_LIVE);
  useFindShortcut(root, find.openBar);
  useFindScroll(root, find.current, !gridNavigation);
  return (
    <FindStateContext.Provider value={find}>
      {children(find)}
    </FindStateContext.Provider>
  );
}

/**
 * Add the find bar, opened with Ctrl/Cmd+F with focus anywhere in the table,
 * from a `?find=` link, or from a kit's toolbar control
 * (`findInTable({ button: true })` from a kit subpath).
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
