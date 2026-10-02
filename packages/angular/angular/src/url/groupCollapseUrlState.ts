/**
 * Which groups are folded, kept in the URL.
 */
import { groupCollapseSlice } from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

import { type MaybeSignalOptional, readMaybe } from "../store";
import { injectUrlSlice, type UrlSliceOptions } from "./urlSlice";

/**
 * Options for {@link injectGroupCollapseUrlState}.
 *
 * @public
 */
export interface GroupCollapseUrlStateOptions extends UrlSliceOptions {
  /** The groups folded while the URL says nothing. */
  readonly defaultCollapsedGroupIds?: MaybeSignalOptional<readonly string[]>;
}

/**
 * The folded groups in the URL.
 *
 * @public
 */
export interface GroupCollapseUrlState {
  /** The ids of the folded groups. */
  readonly collapsedGroupIds: Signal<string[]>;
  /** Write the folded groups. */
  readonly onCollapsedGroupIdsChange: (ids: string[]) => void;
}

/**
 * Keep a grouped table's folded groups in the URL.
 *
 * @param options - See {@link GroupCollapseUrlStateOptions}.
 * @returns See {@link GroupCollapseUrlState}.
 *
 * @public
 */
export function injectGroupCollapseUrlState(
  options: GroupCollapseUrlStateOptions = {}
): GroupCollapseUrlState {
  const slice = injectUrlSlice(
    options,
    groupCollapseSlice,
    computed(() => ({
      defaultCollapsedGroupIds: readMaybe(options.defaultCollapsedGroupIds),
    }))
  );
  return {
    collapsedGroupIds: slice.value,
    onCollapsedGroupIdsChange: slice.set,
  };
}
