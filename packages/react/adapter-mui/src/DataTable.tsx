import {
  FeatureProviders,
  type KitTable,
  type KitTableFrameProps,
  TableComposition,
  useMountStagger,
  useTableFeatures,
  withKitEnvironment,
} from "@adapttable/react/adapter";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { FullscreenPortals } from "./components/FullscreenPortals";
import { MobileCards } from "./components/MobileCards";
import { footer } from "./components/PaginationFooter";
import { LoadingState } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { useMuiLibrary } from "./libraryEnvironment";
import type { DataTableProps } from "./types";

const STICKY_TOOLBAR = {
  position: "sticky",
  zIndex: 3,
  bgcolor: "background.paper",
  pb: 1.5,
} as const;

/** The table's regions on MUI's outlined paper, a stack apart. */
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
  animate,
}: Readonly<KitTableFrameProps>) {
  useMountStagger(rootRef, [rowCount, mobile], { enabled: animate });
  return (
    <FullscreenPortals container={fullscreenContainer}>
      <Paper ref={rootRef} {...rootProps} variant="outlined" sx={{ p: 1.5 }}>
        {announcers}
        <Stack spacing={1.5}>
          <Box
            data-adapttable-part="toolbar"
            ref={toolbarRef}
            className={toolbarClassName}
            sx={
              toolbarStyle
                ? { ...STICKY_TOOLBAR, top: toolbarStyle.top }
                : undefined
            }
          >
            {toolbar}
          </Box>
          {refreshing && <LinearProgress aria-label={labels.loading} />}
          {bars}
          {main}
          {loadMore && (
            <Box
              ref={loadMore.ref}
              sx={{ display: "flex", justifyContent: "center", py: 1 }}
            >
              <Button
                variant="outlined"
                size="small"
                disabled={loadMore.busy}
                onClick={loadMore.onClick}
              >
                {labels.loadMore}
              </Button>
            </Box>
          )}
          {footers}
        </Stack>
        {overlays}
      </Paper>
    </FullscreenPortals>
  );
}

const kit: KitTable = {
  Frame,
  toolbar: (props) => <Toolbar {...props} />,
  body: (view, headerOffset, props) => {
    const tableProps = {
      ...view.tableProps,
      // MUI's table `size` follows the density, independent of pinning.
      size: view.density === "compact" ? "small" : "medium",
      stickyTop: headerOffset,
    } as const;
    if (view.chrome.body === "mobile") {
      return (
        <MobileCards {...tableProps} cardClassName={props.classNames?.card} />
      );
    }
    return (
      <Box
        className={props.classNames?.table}
        data-adapttable-part={view.gridFocus.enabled ? "grid" : undefined}
      >
        <DesktopTable {...tableProps} prefetch={props.prefetch} />
      </Box>
    );
  },
  skeleton: (rows, columns, labels, shape) => (
    <LoadingState
      rows={rows}
      columns={columns}
      loadingLabel={labels.loading}
      mobile={shape.mobile}
    />
  ),
  empty: (labels, onClear) => (
    <Stack
      data-adapttable-part="empty"
      role="status"
      spacing={1.5}
      sx={{ py: 6, alignItems: "center" }}
    >
      <Typography color="text.secondary" align="center">
        {onClear ? labels.noResults : labels.noData}
      </Typography>
      {onClear && (
        <Button variant="outlined" size="small" onClick={onClear}>
          {labels.clearAll}
        </Button>
      )}
    </Stack>
  ),
  error: (state, labels) => (
    <ErrorState error={state.error} labels={labels} onRetry={state.retry} />
  ),
  footer,
};

/**
 * Batteries-included Material UI data table. Drop in `columns`, `data` (or
 * `data` + `onQueryChange` for server fetching, or a full `source`), and a
 * `rowKey` for a fully styled, sortable, filterable, paginated MUI table
 * with selection, bulk actions, RTL, and dark mode — a free DataGrid-style
 * experience on the headless `@adapttable/core` engine. Declarative
 * `filters` (and column `filter` shorthands) render an auto-built form.
 *
 * The features it composes mount their providers above the table that reads
 * them.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const library = useMuiLibrary();
  const props = useTableFeatures(
    withKitEnvironment(incoming, { dir: library.dir })
  );
  return (
    <FeatureProviders props={props}>
      <TableComposition<TRow> props={props} kit={kit} />
    </FeatureProviders>
  );
}
