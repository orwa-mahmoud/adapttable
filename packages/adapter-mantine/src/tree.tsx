import {
  extendFeature,
  slotRender,
  TREE_CELL,
  TREE_TOGGLE,
  type TableFeature,
} from "@adapttable/core/adapter";
import { tree as core } from "@adapttable/core/features";

import { TreeCell, TreeToggle } from "./components/kitControls";

export function tree<TRow>(
  options: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(core(options), [
    slotRender(TREE_CELL, (props) => <TreeCell {...props} />),
    slotRender(TREE_TOGGLE, (props) => <TreeToggle {...props} />),
  ]);
}
