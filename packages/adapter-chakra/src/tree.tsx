import {
  extendFeature,
  slotRender,
  type TableFeature,
  TREE_CELL,
  TREE_TOGGLE,
} from "@adapttable/react/adapter";
import { tree as core } from "@adapttable/react/features";

import { TreeCell, TreeToggle } from "./components/kitControls";

/**
 * Render rows as an expandable tree, with Chakra UI's own chevron.
 *
 * @public
 */
export function tree<TRow>(
  options: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(core(options), [
    slotRender(TREE_CELL, (props) => <TreeCell {...props} />),
    slotRender(TREE_TOGGLE, (props) => <TreeToggle {...props} />),
  ]);
}
