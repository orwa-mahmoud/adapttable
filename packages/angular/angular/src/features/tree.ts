import { type AdaptTableFeature, type MaybeSignal } from "@adapttable/angular";
import { coreTree } from "@adapttable/core/binding";

/**
 * Options for {@link tree}.
 *
 * @public
 */
export interface TreeFeatureOptions<TRow> {
  /** A row's nested children, when the rows arrive nested. */
  readonly getChildren?: (row: TRow) => readonly TRow[] | undefined;
  /** A row's parent id, when the rows arrive flat. */
  readonly getParentId?: (row: TRow) => string | undefined;
  /** Whether a row has children, loaded or not — for lazy trees. */
  readonly hasChildren?: (row: TRow) => boolean;
  /** The column that carries the chevron. Defaults to the first one shown. */
  readonly treeColumn?: string;
  /**
   * Fetch a node's children when it opens. Resolve once they are in the rows
   * the table reads.
   */
  readonly onLoadChildren?: (row: TRow) => void | Promise<void>;
  /**
   * The host's open node ids. Pass a signal to follow changes; clear with `[]`.
   */
  readonly expandedIds?: MaybeSignal<readonly string[]>;
  /** Told the next open ids whenever a node opens or closes. */
  readonly onExpandedIdsChange?: (ids: string[]) => void;
}

/**
 * Render rows as an expandable tree.
 *
 * @param options - See {@link TreeFeatureOptions}.
 * @returns The feature.
 *
 * @public
 */
export function tree<TRow>(
  options: TreeFeatureOptions<TRow> = {}
): AdaptTableFeature {
  return coreTree<unknown>({ ...options });
}
