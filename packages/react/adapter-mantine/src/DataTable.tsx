import {
  type DataTableShellResult,
  FeatureProviders,
  type KitTable,
  type KitTableFrameProps,
  type KitTableProps,
  TableComposition,
  useTableFeatures,
  withKitEnvironment,
} from "@adapttable/react/adapter";
import { Box, Button, Group, Paper, Progress, Stack } from "@mantine/core";
import { useRef } from "react";

import { useMountStagger } from "./animation/useMountStagger";
import { DesktopTable } from "./components/DesktopTable";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { FullscreenPortals } from "./components/FullscreenPortals";
import { MobileCards } from "./components/MobileCards";
import { PaginationFooter } from "./components/PaginationFooter";
import { TableSkeleton } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { useMantineLibrary } from "./libraryEnvironment";
import { SURFACE } from "./surface";
import type { DataTableProps } from "./types";

const STICKY_TOOLBAR = {
  background: SURFACE,
  paddingBottom: "var(--mantine-spacing-xs)",
} as const;

/**
 * The table's regions on Mantine's bordered paper. The toolbar host holds the
 * bars under the toolbar too, so they stay with it when it sticks.
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
}: Readonly<KitTableFrameProps>) {
  // Lays out regions that are new on every table render; a cache would miss.
  "use no memo";
  return (
    <FullscreenPortals container={fullscreenContainer}>
      <Paper {...rootProps} ref={rootRef} p="xs" radius="md" withBorder>
        {announcers}
        <Stack gap="xs">
          <Box
            data-adapttable-part="toolbar"
            ref={toolbarRef}
            style={
              toolbarStyle ? { ...toolbarStyle, ...STICKY_TOOLBAR } : undefined
            }
            className={toolbarClassName}
          >
            <Stack gap="xs">
              {toolbar}
              {bars}
            </Stack>
          </Box>
          {refreshing && (
            <Progress
              size="xs"
              animated
              value={100}
              aria-label={labels.loading}
            />
          )}
          {main}
          {loadMore && (
            <Group ref={loadMore.ref} justify="center" py="xs">
              <Button
                variant="default"
                size="sm"
                loading={loadMore.busy}
                onClick={loadMore.onClick}
              >
                {labels.loadMore}
              </Button>
            </Group>
          )}
          {footers}
        </Stack>
        {overlays}
      </Paper>
    </FullscreenPortals>
  );
}

/**
 * The desktop table or the mobile cards. A component so the entrance stagger
 * can hold a ref on whichever body is drawn.
 */
function Body<TRow>({
  view,
  headerOffset,
  props,
}: Readonly<{
  view: DataTableShellResult<TRow>;
  headerOffset: number;
  props: KitTableProps<TRow>;
}>) {
  // Redrawn with the table; the bodies below memoize their own rows.
  "use no memo";
  const desktopBodyRef = useRef<HTMLTableSectionElement>(null);
  const mobileBodyRef = useRef<HTMLDivElement>(null);
  const mobile = view.chrome.body === "mobile";
  const tableProps = { ...view.tableProps, density: view.density };
  useMountStagger(
    mobile ? mobileBodyRef : desktopBodyRef,
    [tableProps.rows.length, mobile],
    { enabled: props.animate === true }
  );
  if (mobile) {
    return (
      <MobileCards
        {...tableProps}
        bodyRef={mobileBodyRef}
        className={props.classNames?.card}
      />
    );
  }
  return (
    <DesktopTable
      {...tableProps}
      prefetch={props.prefetch}
      bodyRef={desktopBodyRef}
      className={props.classNames?.table}
      stickyHeader={props.stickyHeader ?? false}
      stickyHeaderOffset={headerOffset}
    />
  );
}

const kit: KitTable = {
  Frame,
  toolbar: (props) => <Toolbar {...props} />,
  body: (view, headerOffset, props) => (
    <Body view={view} headerOffset={headerOffset} props={props} />
  ),
  skeleton: (rows, columns, labels) => (
    <TableSkeleton
      columns={columns || 1}
      rows={rows}
      loadingLabel={labels.loading}
    />
  ),
  empty: (labels, onClear) =>
    onClear ? (
      <EmptyState
        title={labels.noResults}
        action={
          <Button variant="light" size="sm" onClick={onClear}>
            {labels.clearAll}
          </Button>
        }
      />
    ) : (
      <EmptyState title={labels.noData} />
    ),
  error: (state, labels) => (
    <ErrorState
      error={state.error}
      title={labels.errorTitle}
      message={labels.errorMessage}
      retryLabel={labels.retry}
      onRetry={state.retry}
      isRetrying={state.retrying}
    />
  ),
  footer: ({ table, source, labels, chrome }) => (
    <PaginationFooter
      page={table.pagination.safePage}
      totalPages={table.pagination.totalPages}
      limit={source.limit}
      defaultLimit={source.defaultLimit}
      total={source.total}
      fromIndex={table.pagination.fromIndex}
      toIndex={table.pagination.toIndex}
      onPageChange={source.setPage}
      onLimitChange={source.setLimit}
      labels={labels}
      showRowsPerPage={!chrome.grouping}
    />
  ),
};

/**
 * Batteries-included Mantine data table. Drop in `columns`, a `rowKey`,
 * and a data tier — raw `data` (frontend), `data` + `onQueryChange`
 * (server), or a prebuilt `source` — to get a fully styled, sortable,
 * filterable, paginated table with selection, bulk actions, RTL, dark
 * mode, and optional entrance animation.
 *
 * The features it composes mount their providers above the table that reads
 * them.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const library = useMantineLibrary();
  const props = useTableFeatures(
    withKitEnvironment(incoming, { dir: library.dir })
  );
  return (
    <FeatureProviders props={props}>
      <TableComposition<TRow> props={props} kit={kit} />
    </FeatureProviders>
  );
}
