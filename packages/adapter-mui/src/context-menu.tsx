import {
  CONTEXT_MENU,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  contextMenu as core,
  type ContextMenuOptions,
} from "@adapttable/core/features";

import { ContextMenu } from "./components/ContextMenu";

/**
 * A right-click menu on rows and cells, drawn with MUI's own Menu.
 *
 * @public
 */
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  return {
    ...core<TRow>(options),
    renders: [slotRender(CONTEXT_MENU, (props) => <ContextMenu {...props} />)],
  };
}
