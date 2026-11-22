/**
 * The table, composed once for every kit.
 *
 * The binding owns what a table is made of and in which order: the
 * announcers, the toolbar and its menus, the bars under it, the body branch
 * (skeleton, empty, error, cards or grid), the side panel, the footers and
 * the overlays, each wired to the shell. A kit hands over its own pieces
 * ({@link KitTable}) and one frame that lays the finished regions out in its
 * library's surface and spacing.
 */
import { type TableErrorState, type TableLabels } from "@adapttable/core";
import {
  type FiltersFormSlotProps,
  showSimpleFilterFields,
} from "@adapttable/core/binding";
import type { CSSProperties, ReactNode, RefCallback, RefObject } from "react";

import { TableStatusAnnouncer } from "../a11y/TableStatusAnnouncer";
import { OptionalSidePanel } from "../adapterFeatures/featureRoot";
import { DataTableShellView } from "../features/chromeBodyGate";
import { FeatureHostProvider } from "../features/featureHostContext";
import { FeatureStateScope } from "../features/featureState";
import { FeatureSlot } from "../features/providers";
import { FILTERS_FORM } from "../features/slotKeys";
import { TABLE_REGION_STATE } from "../features/stateKeys";
import {
  resolveStickyToolbar,
  useStickyToolbarLayout,
} from "../layout/useStickyToolbarLayout";
import type {
  DataTableShellProps,
  DataTableShellResult,
  DataTableShellToolbarProps,
} from "../shell/shellContract";
import { fillSlot, type Slot } from "../state/slots";
import type { Density } from "../url/useDensityUrlState";
import { useDataTableShell } from "../useDataTableShell";
import {
  ANNOUNCERS_AREA,
  BARS_AREA,
  type KitRegionProps,
  MAIN_AREA,
  OVERLAYS_AREA,
  RootRegion,
  SIDE_PANEL_REGION,
  STATUS_BAR_REGION,
} from "./rootRegion";

/**
 * Content a host puts in place of a kit's own state views.
 *
 * @public
 */
export interface KitTableSlots {
  /** Shown while the first page loads. */
  readonly skeleton?: ReactNode;
  /** Shown when there is no data. */
  readonly empty?: ReactNode;
  /** Shown when filters or search match nothing. */
  readonly noResults?: ReactNode;
  /** Shown when loading failed. */
  readonly error?: Exclude<Slot<TableErrorState>, undefined>;
}

/**
 * Class names a host adds to the table's regions.
 *
 * @public
 */
export interface KitTableClassNames {
  /** The table's surface. */
  readonly root?: string;
  /** The toolbar host. */
  readonly toolbar?: string;
  /** The desktop table's wrapper. */
  readonly table?: string;
  /** Each mobile card. */
  readonly card?: string;
  /** The pager host. */
  readonly footer?: string;
  /** The host's own footer, under the rows. */
  readonly tableFooter?: string;
}

/**
 * The props every kit table takes: the shell's, plus the kit's state slots
 * and region class names.
 *
 * @public
 */
export type KitTableProps<TRow> = DataTableShellProps<TRow> & {
  /** Content in place of the kit's own state views. */
  readonly slots?: KitTableSlots;
  /** A class name on the table's surface. */
  readonly className?: string;
  /** Class names on the table's regions. */
  readonly classNames?: KitTableClassNames;
  /** Stagger the rows in when they mount. */
  readonly animate?: boolean;
};

/**
 * What a kit's toolbar receives: the shell's toolbar bundle, the filter
 * container's state and whether the table loads more as it scrolls.
 *
 * @public
 */
export interface KitToolbarProps<
  TRow,
> extends DataTableShellToolbarProps<TRow> {
  /** Which container the filters open in. */
  readonly filtersMode: "popover" | "drawer" | "header";
  /** Whether the filter container is open. */
  readonly filtersOpen: boolean;
  /** Toggle the filter container. */
  readonly onToggleFilters: () => void;
  /** Pointer-down on the filters trigger, paired with its click. */
  readonly onFiltersTriggerPointerDown: () => void;
  /** Close the filter container. */
  readonly onCloseFilters: () => void;
  /** Whether the table loads its next page as it scrolls, outside a grouped view. */
  readonly loadsMore: boolean;
}

/**
 * The finished regions of one table, for a kit's frame to lay out.
 *
 * @public
 */
export interface KitTableFrameProps {
  /** Attributes for the surface element, context-menu wiring included. */
  readonly rootProps: Readonly<Record<string, unknown>>;
  /** The surface element, measured by the shell. */
  readonly rootRef: RefObject<HTMLDivElement | null>;
  /** Where overlays mount while the table is fullscreen. */
  readonly fullscreenContainer: HTMLElement | undefined;
  /** Live regions and the find bar; first inside the surface. */
  readonly announcers: ReactNode;
  /** The toolbar host element, measured when it sticks. */
  readonly toolbarRef: RefCallback<HTMLElement | null>;
  /** Class name for the toolbar host. */
  readonly toolbarClassName: string | undefined;
  /** The toolbar host's sticky offsets, or nothing when it scrolls away. */
  readonly toolbarStyle: CSSProperties | undefined;
  /** The kit's toolbar. */
  readonly toolbar: ReactNode;
  /** Filter chips, the batch-edit bar, agent approval and bulk actions. */
  readonly bars: ReactNode;
  /** Whether a refresh is in flight over rows already shown. */
  readonly refreshing: boolean;
  /** The command palette, grouping strip, and the body beside its panel. */
  readonly main: ReactNode;
  /** Fetch the next page, or nothing when there is none to fetch. */
  readonly loadMore:
    | {
        /** The sentinel the shell watches. */
        readonly ref: RefObject<HTMLDivElement | null>;
        /** Whether the next page is loading. */
        readonly busy: boolean;
        /** Fetch it. */
        readonly onClick: () => void;
      }
    | undefined;
  /** The host's table footer and the pager, each in its part. */
  readonly footers: ReactNode;
  /** The filter drawer and the status bar; last inside the surface. */
  readonly overlays: ReactNode;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
  /** How many rows the table holds; the stagger replays when it changes. */
  readonly rowCount: number;
  /** Whether the body is the mobile cards. */
  readonly mobile: boolean;
  /** The row density the table is drawn at. */
  readonly density: Density;
  /** Whether the rows stagger in when they mount. */
  readonly animate: boolean;
}

/**
 * What the first-load placeholder stands in for.
 *
 * @public
 */
export interface KitSkeletonShape {
  /** The body will be the mobile cards. */
  readonly mobile: boolean;
  /** Rows will have an actions column. */
  readonly actions: boolean;
}

/**
 * The pieces a kit draws with its own components.
 *
 * @public
 */
export interface KitTable {
  /** Lays the finished regions out in the kit's surface and spacing. */
  readonly Frame: (props: KitTableFrameProps) => ReactNode;
  /** The kit's toolbar. */
  readonly toolbar: <TRow>(props: KitToolbarProps<TRow>) => ReactNode;
  /**
   * The desktop table or the mobile cards, per `view.chrome.body`.
   *
   * @param view - The finished shell.
   * @param headerOffset - How far a sticky header sits below the toolbar.
   * @param props - The table's props.
   */
  readonly body: <TRow>(
    view: DataTableShellResult<TRow>,
    headerOffset: number,
    props: KitTableProps<TRow>
  ) => ReactNode;
  /** The first-load placeholder. */
  readonly skeleton: (
    rows: number,
    columns: number,
    labels: Required<TableLabels>,
    shape: KitSkeletonShape
  ) => ReactNode;
  /** The no-data view; `onClear` is set when filters hid every row. */
  readonly empty: (
    labels: Required<TableLabels>,
    onClear: (() => void) | undefined
  ) => ReactNode;
  /** The load-failure view. */
  readonly error: (
    state: TableErrorState,
    labels: Required<TableLabels>
  ) => ReactNode;
  /** The pager. */
  readonly footer: <TRow>(view: DataTableShellResult<TRow>) => ReactNode;
}

function bodyOf<TRow>(
  kit: KitTable,
  view: DataTableShellResult<TRow>,
  headerOffset: number,
  props: KitTableProps<TRow>
): ReactNode {
  const { chrome, labels } = view;
  const { slots } = props;
  if (chrome.errorState) {
    return (
      fillSlot(slots?.error, chrome.errorState) ??
      kit.error(chrome.errorState, labels)
    );
  }
  if (chrome.body === "skeleton") {
    return (
      slots?.skeleton ??
      kit.skeleton(
        props.skeletonRows ?? view.source.limit,
        view.table.columns.length,
        labels,
        {
          mobile: chrome.isMobile,
          actions: (view.tableProps.rowActions?.length ?? 0) > 0,
        }
      )
    );
  }
  if (chrome.body === "empty") {
    const noResults = chrome.emptyVariant === "noResults";
    return (
      (noResults ? slots?.noResults : undefined) ??
      slots?.empty ??
      kit.empty(labels, noResults ? chrome.clearSearchAndFilters : undefined)
    );
  }
  return kit.body(view, headerOffset, props);
}

function toolbarOf<TRow>(
  kit: KitTable,
  view: DataTableShellResult<TRow>,
  props: KitTableProps<TRow>
): ReactNode {
  const { chrome } = view;
  const toolbar = kit.toolbar<TRow>({
    ...view.toolbarProps,
    filtersMode: props.filtersMode ?? "popover",
    loadsMore: view.canLoadMore && !chrome.grouping,
    filtersOpen: view.filtersOpen,
    onToggleFilters: view.filtersTrigger.onClick,
    onFiltersTriggerPointerDown: view.filtersTrigger.onPointerDown,
    onCloseFilters: () => {
      view.setFiltersOpen(false);
    },
  });
  return (
    <FeatureStateScope
      stateKey={TABLE_REGION_STATE}
      value={{ view, props } as KitRegionProps<unknown>}
    >
      {toolbar}
    </FeatureStateScope>
  );
}

/**
 * One table, drawn with a kit's pieces.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function TableComposition<TRow>({
  props,
  kit,
}: {
  /** The table's props, features resolved. */
  readonly props: KitTableProps<TRow>;
  /** The kit's pieces. */
  readonly kit: KitTable;
}): ReactNode {
  const { classNames, sidePanel } = props;
  const simpleFields = showSimpleFilterFields(
    props.headerFilters === true || props.filtersMode === "header",
    props.filterFields
  );
  const shell = useDataTableShell<TRow>(
    props,
    (defs, source, registry, labels) => {
      // The slot key erases the row; a table source is invariant in it.
      const form: FiltersFormSlotProps<TRow> = {
        defs,
        source,
        registry,
        labels,
        defaultExpanded: !simpleFields,
        showSimpleFields: simpleFields,
      };
      return <FeatureSlot slot={FILTERS_FORM} props={form} />;
    }
  );
  const sticky = useStickyToolbarLayout(
    resolveStickyToolbar(
      props.stickyHeader,
      props.stickyToolbar,
      props.maxHeight != null
    ),
    props.stickyTop ?? 0
  );
  const { Frame } = kit;
  return (
    <DataTableShellView shell={shell}>
      {(view) => {
        const { chrome, labels, source } = view;
        return (
          <FeatureHostProvider host={view.featureHost}>
            <RootRegion view={view} props={props}>
              {(regionProps) => (
                <Frame
                  rootProps={{
                    ...regionProps,
                    dir: props.dir,
                    className:
                      [props.className, classNames?.root]
                        .filter(Boolean)
                        .join(" ") || undefined,
                    "aria-busy": chrome.isRefreshing || undefined,
                  }}
                  rootRef={view.rootRef}
                  fullscreenContainer={view.fullscreen.container}
                  announcers={
                    <>
                      <TableStatusAnnouncer
                        announcement={view.statusAnnouncement}
                      />
                      <FeatureSlot
                        slot={ANNOUNCERS_AREA}
                        props={{ view, props }}
                      />
                    </>
                  }
                  toolbarRef={sticky.toolbarRef}
                  toolbarClassName={classNames?.toolbar}
                  toolbarStyle={sticky.toolbarStyle}
                  toolbar={toolbarOf(kit, view, props)}
                  bars={
                    <FeatureSlot slot={BARS_AREA} props={{ view, props }} />
                  }
                  refreshing={chrome.isRefreshing}
                  main={
                    <>
                      <FeatureSlot slot={MAIN_AREA} props={{ view, props }} />
                      <OptionalSidePanel
                        side={sidePanel?.side}
                        body={bodyOf(kit, view, sticky.headerOffset, props)}
                        panel={
                          sidePanel?.open != null && (
                            <FeatureSlot
                              slot={SIDE_PANEL_REGION}
                              props={{ view, props }}
                            />
                          )
                        }
                      />
                    </>
                  }
                  loadMore={
                    view.canLoadMore && source.hasNextPage
                      ? {
                          ref: view.loadMoreRef,
                          busy: source.isFetchingNextPage,
                          onClick: () => {
                            source.fetchNextPage();
                          },
                        }
                      : undefined
                  }
                  footers={
                    <>
                      {props.tableFooter == null ? null : (
                        <div
                          data-adapttable-part="table-footer"
                          className={classNames?.tableFooter}
                        >
                          {props.tableFooter}
                        </div>
                      )}
                      {chrome.showFooter ? (
                        <div
                          data-adapttable-part="footer"
                          className={classNames?.footer}
                        >
                          {kit.footer(view)}
                        </div>
                      ) : null}
                    </>
                  }
                  overlays={
                    <>
                      <FeatureSlot
                        slot={OVERLAYS_AREA}
                        props={{ view, props }}
                      />
                      <FeatureSlot
                        slot={STATUS_BAR_REGION}
                        props={{ view, props }}
                      />
                    </>
                  }
                  labels={labels}
                  // The rows the table holds, not the body's view of them: a
                  // regroup or a move redraws the body without new rows, and
                  // must not stagger them in again.
                  rowCount={shell.source.rows.length}
                  mobile={chrome.isMobile}
                  density={view.density}
                  animate={props.animate === true}
                />
              )}
            </RootRegion>
          </FeatureHostProvider>
        );
      }}
    </DataTableShellView>
  );
}
