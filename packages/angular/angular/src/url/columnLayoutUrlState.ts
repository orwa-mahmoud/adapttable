/**
 * The column layout — order, visibility, widths, pins — kept in the URL.
 */
import { columnLayoutSlice, type ColumnLayoutState } from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

import { type MaybeSignalOptional, readMaybe } from "../store";
import { injectUrlSlice, type UrlSliceOptions } from "./urlSlice";

/**
 * Options for {@link injectColumnLayoutUrlState}.
 *
 * @public
 */
export interface ColumnLayoutUrlStateOptions extends UrlSliceOptions {
  /** The layout while the URL says nothing. */
  readonly defaultColumnLayout?: MaybeSignalOptional<
    Partial<ColumnLayoutState>
  >;
}

/**
 * The column layout in the URL.
 *
 * @public
 */
export interface ColumnLayoutUrlState {
  /** The layout, for a table's `columnLayout` input. */
  readonly layout: Signal<ColumnLayoutState>;
  /** Write a layout, for the table's `columnLayoutChange`. */
  readonly onLayoutChange: (layout: ColumnLayoutState) => void;
}

/**
 * Keep a table's column layout in the URL, so an arrangement is a link.
 *
 * @param options - See {@link ColumnLayoutUrlStateOptions}.
 * @returns See {@link ColumnLayoutUrlState}.
 *
 * @public
 */
export function injectColumnLayoutUrlState(
  options: ColumnLayoutUrlStateOptions = {}
): ColumnLayoutUrlState {
  const slice = injectUrlSlice(
    options,
    columnLayoutSlice,
    computed(() => ({
      defaultColumnLayout: readMaybe(options.defaultColumnLayout),
    }))
  );
  return { layout: slice.value, onLayoutChange: slice.set };
}
