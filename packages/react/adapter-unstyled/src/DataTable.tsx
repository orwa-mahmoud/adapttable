import {
  type DataTableShellResult,
  FeatureProviders,
  type KitSkeletonShape,
  type KitTable,
  type KitTableFrameProps,
  type KitToolbarProps,
  TableComposition,
  type TableErrorState,
  type TableLabels,
  useMountStagger,
  useTableFeatures,
} from "@adapttable/react/adapter";
import type { CSSProperties } from "react";

import {
  ClassNamesProvider,
  useClassNames,
} from "./components/classNamesContext";
import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { MobileCards } from "./components/MobileCards";
import { footer } from "./components/PaginationFooter";
import { PortalContainerProvider } from "./components/portalContainer";
import { LoadingState } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { cx } from "./cx";
import type { DataTableProps } from "./types";

const TOOLBAR: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  rowGap: 8,
};

/**
 * The table's regions in reading order, as semantic markup with class hooks:
 * the root, the toolbar host, the bars, a native refresh progress, the body,
 * the load-more button and the footers, with the overlays last.
 */
function Frame({
  rootProps,
  rootRef,
  fullscreenContainer,
  announcers,
  toolbarRef,
  toolbarClassName,
  toolbarStyle,
  toolbar,
  bars,
  refreshing,
  main,
  loadMore,
  footers,
  overlays,
  labels,
  rowCount,
  mobile,
  density,
  animate,
}: Readonly<KitTableFrameProps>) {
  useMountStagger(rootRef, [rowCount, mobile], { enabled: animate });
  const classNames = useClassNames();
  const { className, ...root } = rootProps;
  return (
    <PortalContainerProvider value={fullscreenContainer}>
      <div
        ref={rootRef}
        {...root}
        data-adapttable-part="root"
        data-mobile={mobile || undefined}
        data-density={density}
        data-refreshing={refreshing || undefined}
        className={cx(
          "adapttable",
          typeof className === "string" ? className : undefined
        )}
      >
        {announcers}
        <div
          ref={toolbarRef}
          data-adapttable-part="toolbar"
          className={toolbarClassName}
          style={{ ...TOOLBAR, ...toolbarStyle }}
        >
          {toolbar}
        </div>
        {bars}
        {refreshing && (
          // Native indeterminate progress (no `value`): an implicit
          // progressbar with the right semantics on every device.
          <progress
            aria-label={labels.loading}
            data-adapttable-part="refresh-indicator"
            className={classNames.refreshIndicator}
          />
        )}
        {main}
        {loadMore && (
          <div
            ref={loadMore.ref}
            data-adapttable-part="load-more"
            className={classNames.loadMore}
          >
            <button
              type="button"
              disabled={loadMore.busy}
              data-adapttable-part="load-more-button"
              className={classNames.loadMoreButton}
              onClick={loadMore.onClick}
            >
              {labels.loadMore}
            </button>
          </div>
        )}
        {footers}
        {overlays}
      </div>
    </PortalContainerProvider>
  );
}

/** The toolbar; infinite scroll keeps its page size there. */
function KitToolbar<TRow>(props: Readonly<KitToolbarProps<TRow>>) {
  "use no memo";
  return <Toolbar {...props} showRowsPerPage={props.loadsMore} />;
}

/** The desktop table or the cards, with the table's class map. */
function Body<TRow>({
  view,
  headerOffset,
}: Readonly<{ view: DataTableShellResult<TRow>; headerOffset: number }>) {
  // Redrawn with the table; the bodies below memoize their own rows.
  "use no memo";
  const classNames = useClassNames();
  if (view.chrome.body === "mobile") {
    return <MobileCards {...view.tableProps} classNames={classNames} />;
  }
  return <DesktopTable {...view.tableProps} stickyTop={headerOffset} />;
}

function Skeleton({
  rows,
  columns,
  labels,
  shape,
}: Readonly<{
  rows: number;
  columns: number;
  labels: Required<TableLabels>;
  shape: KitSkeletonShape;
}>) {
  "use no memo";
  return (
    <LoadingState
      rows={rows}
      columns={columns}
      variant={shape.mobile ? "cards" : "table"}
      labels={labels}
      classNames={useClassNames()}
      hasActions={shape.actions}
    />
  );
}

/**
 * The empty view: "no results" when a search or filter matched nothing, with
 * a way back; otherwise the source itself is empty.
 */
function Empty({
  labels,
  onClear,
}: Readonly<{ labels: Required<TableLabels>; onClear?: () => void }>) {
  "use no memo";
  const classNames = useClassNames();
  return (
    <output data-adapttable-part="empty" className={classNames.empty}>
      {onClear ? labels.noResults : labels.noData}
      {onClear && (
        <button
          type="button"
          data-adapttable-part="empty-clear"
          className={classNames.emptyClear}
          onClick={onClear}
        >
          {labels.clearAll}
        </button>
      )}
    </output>
  );
}

function Failure({
  state,
  labels,
}: Readonly<{ state: TableErrorState; labels: Required<TableLabels> }>) {
  "use no memo";
  return (
    <ErrorState
      error={state.error}
      labels={labels}
      onRetry={state.retry}
      classNames={useClassNames()}
    />
  );
}

const kit: KitTable = {
  Frame,
  toolbar: (props) => <KitToolbar {...props} />,
  body: (view, headerOffset) => (
    <Body view={view} headerOffset={headerOffset} />
  ),
  skeleton: (rows, columns, labels, shape) => (
    <Skeleton rows={rows} columns={columns} labels={labels} shape={shape} />
  ),
  empty: (labels, onClear) => <Empty labels={labels} onClear={onClear} />,
  error: (state, labels) => <Failure state={state} labels={labels} />,
  footer,
};

/**
 * Headless, unstyled AdaptTable for Tailwind / shadcn / custom CSS. Renders
 * semantic HTML with `data-adapttable-part` hooks and `className` overrides;
 * ships no styles of its own. Built on the `@adapttable/core` prop-getters.
 *
 * The features it composes mount their providers above the table that reads
 * them.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  return (
    <ClassNamesProvider classNames={incoming.classNames}>
      <FeatureProviders props={props}>
        <TableComposition<TRow> props={props} kit={kit} />
      </FeatureProviders>
    </ClassNamesProvider>
  );
}
