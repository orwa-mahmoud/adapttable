import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
  tree as bindingTree,
  TREE_CELL,
  TREE_TOGGLE,
  type TreeFeatureOptions,
} from "@adapttable/angular";
import { AdaptTreeCell, AdaptTreeToggle } from "@adapttable/taiga-ui";

/**
 * Tree rows — `@adapttable/taiga-ui/tree`.
 *
 * @packageDocumentation
 */

export type { TreeFeatureOptions } from "@adapttable/angular";

/**
 * Render rows as an expandable tree, with a native chevron in the tree
 * column on desktop and at the head of each card on phones.
 *
 * ```ts
 * features: [tree({ getChildren: (row) => row.reports })]
 * ```
 *
 * @param options - Where the hierarchy comes from, which column carries the
 *   chevron, lazy children and the open state.
 * @returns The feature.
 *
 * @public
 */
export function tree<TRow>(
  options: TreeFeatureOptions<TRow> = {}
): AdaptTableFeature {
  return extendFeature(bindingTree(options), [
    slotRender(TREE_CELL, () => AdaptTreeCell),
    slotRender(TREE_TOGGLE, () => AdaptTreeToggle),
  ]);
}
