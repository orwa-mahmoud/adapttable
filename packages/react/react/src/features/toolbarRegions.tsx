/**
 * The toolbar controls' regions: each feature builds its control's props from
 * the finished view and the table's props, so the composition passes the
 * position and nothing about the control.
 */
import type { ReactNode } from "react";

import {
  COLUMN_MENU_REGION,
  type KitRegionDraw,
  type KitRegionProps,
  SAVED_VIEWS_REGION,
} from "../kit/rootRegion";
import { FeatureSlot, slotRender } from "./providers";
import { COLUMN_MENU, SAVED_VIEWS } from "./slotKeys";

/** The saved-views menu, on the table's own URL backend and namespace. */
function SavedViewsRegion<TRow>({
  view,
  props,
}: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const savedViews = props.savedViews;
  if (!savedViews) return null;
  // Saved views capture the table's own URL params, so the menu defaults to
  // the table's URL backend and namespace; an explicit option wins.
  return (
    <FeatureSlot
      slot={SAVED_VIEWS}
      props={{
        options: {
          urlAdapter: view.urlAdapter,
          urlKey: props.urlKey,
          ...savedViews,
        },
        labels: view.labels,
      }}
    />
  );
}

/** The column menu, wired to the table's sort, filters and layout. */
function ColumnMenuRegion<TRow>({
  view,
  props,
}: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const { chrome, source } = view;
  return (
    <FeatureSlot
      slot={COLUMN_MENU}
      props={{
        allColumns: chrome.allColumns,
        onAutoSize: view.autoSizeColumns,
        onAutoSizeColumn: view.autoSizeColumn,
        onSortColumn: (key, sortDir) => source.setSort(key, sortDir),
        onFilterColumn: () => {
          view.setFiltersOpen(true);
        },
        onRenameColumn: props.onColumnRename
          ? chrome.columnLayout.setName
          : undefined,
        sortBy: source.sortBy,
        sortDir: source.sortDir,
        layout: chrome.columnLayout,
        labels: view.labels,
        hasRowActions: view.hasRowActions,
        hasRowReorder: view.hasRowReorder,
        groupingPanel: chrome.groupingPanel,
        dir: props.dir,
      }}
    />
  );
}

/** The region render the saved-views feature brings. */
export const SAVED_VIEWS_REGION_RENDER = slotRender<KitRegionDraw>(
  SAVED_VIEWS_REGION,
  (props) => <SavedViewsRegion {...props} />
);

/** The region render the column-menu feature brings. */
export const COLUMN_MENU_REGION_RENDER = slotRender<KitRegionDraw>(
  COLUMN_MENU_REGION,
  (props) => <ColumnMenuRegion {...props} />
);
