/**
 * The saved-views and column-menu toolbar entries: each feature builds its
 * control's props from the finished view and the table's props, which the
 * composition publishes, so the toolbar names neither control.
 */
import type { ReactNode } from "react";

import type { KitRegionProps } from "../kit/rootRegion";
import { useFeatureState } from "./featureState";
import { FeatureSlot, slotRender } from "./providers";
import { COLUMN_MENU, SAVED_VIEWS, TOOLBAR_EXTRAS } from "./slotKeys";
import { TABLE_REGION_STATE } from "./stateKeys";

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
        groupingPanel: view.tableProps.groupingPanel,
        dir: props.dir,
      }}
    />
  );
}

/** The saved-views menu's toolbar entry. */
function SavedViewsEntry(): ReactNode {
  "use no memo";
  const region = useFeatureState(TABLE_REGION_STATE);
  return region ? <SavedViewsRegion {...region} /> : null;
}

/** The column menu's toolbar entry; the menu is a desktop control. */
function ColumnMenuEntry(): ReactNode {
  "use no memo";
  const region = useFeatureState(TABLE_REGION_STATE);
  return region && !region.view.chrome.isMobile ? (
    <ColumnMenuRegion {...region} />
  ) : null;
}

/** The toolbar entry the saved-views feature brings. */
export const SAVED_VIEWS_ENTRY = slotRender(TOOLBAR_EXTRAS, () => (
  <SavedViewsEntry />
));

/** The toolbar entry the column-menu feature brings. */
export const COLUMN_MENU_ENTRY = slotRender(TOOLBAR_EXTRAS, () => (
  <ColumnMenuEntry />
));
