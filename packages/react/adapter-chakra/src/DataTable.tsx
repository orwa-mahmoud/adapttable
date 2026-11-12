import {
  type DataTableShellResult,
  FeatureProviders,
  type KitTable,
  type KitTableFrameProps,
  type KitTableProps,
  TableComposition,
  useLocaleLabels,
  useMountStagger,
  useTableFeatures,
  withKitEnvironment,
} from "@adapttable/react/adapter";
import { Box, Button, Flex, Progress, Stack, Text } from "@chakra-ui/react";
import { createContext, useContext } from "react";

import { AccentColor, useAccentColor } from "./components/accent";
import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { MobileCards } from "./components/MobileCards";
import { Footer } from "./components/PaginationFooter";
import { LoadingState } from "./components/TableSkeleton";
import { Toolbar, ToolbarClassName } from "./components/Toolbar";
import { useChakraLibrary } from "./libraryEnvironment";
import { subtleText } from "./styles";
import type { DataTableProps } from "./types";

/** The table `size` the host chose; absent, the density picks it. */
const TableSize = /* @__PURE__ */ createContext<"sm" | "md" | "lg" | undefined>(
  undefined
);

/** The table's regions in Chakra's bordered box, a stack apart. */
function Frame({
  rootProps,
  rootRef,
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
    <Box ref={rootRef} {...rootProps} borderWidth="1px" borderRadius="md" p={3}>
      {announcers}
      <Stack gap={3}>
        <Box
          ref={toolbarRef}
          style={toolbarStyle}
          bg={toolbarStyle ? "bg" : undefined}
        >
          <ToolbarClassName.Provider value={toolbarClassName}>
            {toolbar}
          </ToolbarClassName.Provider>
        </Box>
        {refreshing && (
          <Progress.Root size="xs" value={null} aria-label={labels.loading}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        )}
        {bars}
        {main}
        {loadMore && (
          <Flex ref={loadMore.ref} justify="center" py={2}>
            <Button
              size="sm"
              variant="outline"
              loading={loadMore.busy}
              onClick={loadMore.onClick}
            >
              {labels.loadMore}
            </Button>
          </Flex>
        )}
        {footers}
      </Stack>
      {overlays}
    </Box>
  );
}

/** The desktop table or the cards, at the host's size or the density's. */
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
  const size =
    useContext(TableSize) ?? (view.density === "compact" ? "sm" : "md");
  const tableProps = { ...view.tableProps, size };
  if (view.chrome.body === "mobile") {
    return <MobileCards {...tableProps} className={props.classNames?.card} />;
  }
  return (
    <DesktopTable
      {...tableProps}
      stickyTop={headerOffset}
      prefetch={props.prefetch}
      className={props.classNames?.table}
    />
  );
}

/** The no-results view's way back: clear every filter. */
function ClearFilters({
  label,
  onClear,
}: Readonly<{ label: string; onClear: () => void }>) {
  return (
    <Button
      size="sm"
      variant="outline"
      colorPalette={useAccentColor()}
      onClick={onClear}
    >
      {label}
    </Button>
  );
}

const kit: KitTable = {
  Frame,
  toolbar: (props) => <Toolbar {...props} />,
  body: (view, headerOffset, props) => (
    <Body view={view} headerOffset={headerOffset} props={props} />
  ),
  skeleton: (rows, columns, labels) => (
    <LoadingState rows={rows} columns={columns} loadingLabel={labels.loading} />
  ),
  empty: (labels, onClear) =>
    onClear ? (
      <Stack
        data-adapttable-part="empty"
        role="status"
        align="center"
        py={10}
        gap={3}
      >
        <Text {...subtleText}>{labels.noResults}</Text>
        <ClearFilters label={labels.clearAll} onClear={onClear} />
      </Stack>
    ) : (
      <Text
        data-adapttable-part="empty"
        role="status"
        {...subtleText}
        textAlign="center"
        py={10}
      >
        {labels.noData}
      </Text>
    ),
  error: (state, labels) => (
    <ErrorState error={state.error} labels={labels} onRetry={state.retry} />
  ),
  footer: ({ table, source, labels, chrome }) => (
    <Footer
      pagination={table.pagination}
      total={source.total}
      limit={source.limit}
      defaultLimit={source.defaultLimit}
      setPage={source.setPage}
      setLimit={source.setLimit}
      labels={labels}
      showRowsPerPage={!chrome.grouping}
    />
  ),
};

/**
 * Batteries-included Chakra UI data table. Drop in `columns`, a `rowKey`,
 * and either raw `data` (frontend tier — add `onQueryChange` for the server
 * tier) or a prebuilt `source`, for a fully styled, sortable, filterable,
 * paginated Chakra table with selection, bulk actions, RTL, and dark mode —
 * on the headless `@adapttable/core` engine.
 *
 * The features it composes mount their providers above the table that reads
 * them.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const library = useChakraLibrary();
  const libraryLabels = useLocaleLabels(
    incoming.labels === undefined ? library.locale : undefined
  );
  const props = useTableFeatures(
    withKitEnvironment(incoming, {
      dir: library.dir,
      locale: library.locale,
      labels: libraryLabels,
    })
  );
  return (
    <FeatureProviders props={props}>
      <AccentColor.Provider value={props.accentColor}>
        <TableSize.Provider value={props.size}>
          <TableComposition<TRow> props={props} kit={kit} />
        </TableSize.Provider>
      </AccentColor.Provider>
    </FeatureProviders>
  );
}
