/**
 * The composition's areas, each part built by the feature that draws it from
 * the finished view and the table's props.
 */
import type { ReactNode } from "react";

import type { GroupingPanelSlotProps } from "../grouping/GroupingPanelChrome";
import {
  ANNOUNCERS_AREA,
  type KitRegionDraw,
  type KitRegionProps,
  MAIN_AREA,
  OVERLAYS_AREA,
  SIDE_PANEL_REGION,
  STATUS_BAR_REGION,
} from "../kit/rootRegion";
import { FeatureSlot, slotRender } from "./providers";
import {
  COMMAND_PALETTE_LIVE,
  FILTER_DRAWER,
  FIND_BAR,
  GRID_FOCUS_ANNOUNCER,
  GROUPING_PANEL,
  ROW_REORDER_ANNOUNCER,
  SIDE_PANEL,
  STATUS_BAR,
} from "./slotKeys";

function GridFocusAnnouncer<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  return (
    <FeatureSlot
      slot={GRID_FOCUS_ANNOUNCER}
      props={{ focus: view.gridFocus }}
    />
  );
}

function RowReorderAnnouncer<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  const reorder = view.tableProps.rowReorder;
  if (!reorder) return null;
  return (
    <FeatureSlot
      slot={ROW_REORDER_ANNOUNCER}
      props={{ announcement: reorder.announcement }}
    />
  );
}

function FindBar<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  return (
    <FeatureSlot
      slot={FIND_BAR}
      props={{ find: view.find, labels: view.labels }}
    />
  );
}

function CommandPalette<TRow>({
  view,
  props,
}: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const { chrome } = view;
  return (
    <FeatureSlot
      slot={COMMAND_PALETTE_LIVE}
      props={{
        commandPalette: props.commandPalette,
        labels: view.labels,
        onPrint: props.onPrint,
        onExport: view.toolbarProps.onExportCsv,
        exportLabel: view.toolbarProps.exportLabel,
        onClearFilters: chrome.clearFilters,
        hasFilters: chrome.activeFilterCount > 0,
        featureHost: view.featureHost,
      }}
    />
  );
}

function GroupingPanel<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  const panel = view.groupingPanelProps;
  if (!panel) return null;
  return (
    <FeatureSlot
      slot={GROUPING_PANEL}
      props={panel as GroupingPanelSlotProps<unknown>}
    />
  );
}

function SidePanel<TRow>({ view, props }: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const sidePanel = props.sidePanel;
  if (sidePanel?.open == null) return null;
  return (
    <FeatureSlot
      slot={SIDE_PANEL}
      props={{
        panels: sidePanel.panels,
        openPanel: sidePanel.open,
        onOpenPanel: sidePanel.onOpenChange,
        onClose: () => {
          sidePanel.onOpenChange(null);
        },
        side: sidePanel.side,
        labels: view.labels,
      }}
    />
  );
}

function FilterDrawer<TRow>({ view, props }: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  if (!view.filtersNode || props.filtersMode !== "drawer") return null;
  const { chrome } = view;
  return (
    <FeatureSlot
      slot={FILTER_DRAWER}
      props={{
        open: view.filtersOpen,
        onClose: () => {
          view.setFiltersOpen(false);
        },
        filters: view.filtersNode,
        activeFilterCount: chrome.activeFilterCount,
        onClearFilters: chrome.clearFilters,
        labels: view.labels,
        dir: props.dir,
      }}
    />
  );
}

function StatusBar<TRow>({ view, props }: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const { chrome, source, table } = view;
  return (
    <FeatureSlot
      slot={STATUS_BAR}
      props={{
        enabled: props.statusBar === true,
        notices: chrome.featureNotices,
        shown: source.rows.length,
        page: source.page,
        limit: source.limit,
        total: source.total,
        selected: table.selection?.selectedCount ?? 0,
        stats: view.selectionStats,
        labels: view.labels,
        locale: props.locale,
      }}
    />
  );
}

/** The grid-focus announcer cell navigation brings. */
export const GRID_FOCUS_ANNOUNCER_RENDER = slotRender<KitRegionDraw>(
  ANNOUNCERS_AREA,
  (props) => <GridFocusAnnouncer {...props} />
);

/** The move announcer row reorder brings. */
export const ROW_REORDER_ANNOUNCER_RENDER = slotRender<KitRegionDraw>(
  ANNOUNCERS_AREA,
  (props) => <RowReorderAnnouncer {...props} />
);

/** The find bar find in table brings. */
export const FIND_BAR_RENDER = slotRender<KitRegionDraw>(
  ANNOUNCERS_AREA,
  (props) => <FindBar {...props} />
);

/** The palette the command-palette feature brings. */
export const COMMAND_PALETTE_RENDER = slotRender<KitRegionDraw>(
  MAIN_AREA,
  (props) => <CommandPalette {...props} />
);

/** The grouping strip the grouping panel brings. */
export const GROUPING_PANEL_RENDER = slotRender<KitRegionDraw>(
  MAIN_AREA,
  (props) => <GroupingPanel {...props} />
);

/** The settings panel the side-panel feature brings. */
export const SIDE_PANEL_RENDER = slotRender<KitRegionDraw>(
  SIDE_PANEL_REGION,
  (props) => <SidePanel {...props} />
);

/** The drawer the filters feature brings. */
export const FILTER_DRAWER_RENDER = slotRender<KitRegionDraw>(
  OVERLAYS_AREA,
  (props) => <FilterDrawer {...props} />
);

/** The strip the status-bar and selection-stats features bring. */
export const STATUS_BAR_RENDER = slotRender<KitRegionDraw>(
  STATUS_BAR_REGION,
  (props) => <StatusBar {...props} />
);
