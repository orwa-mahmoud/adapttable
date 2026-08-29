import type {
  ColumnDef,
  ColumnLayoutState,
  NestedTableDefaults,
} from "@adapttable/core";
import { getDirection, getLabels } from "@adapttable/i18n";
import { DataTable, type DataTableProps } from "@adapttable/mantine";
import {
  Avatar,
  Badge,
  MantineProvider,
  Progress,
  Stack,
  Text,
} from "@mantine/core";

import {
  type AvatarCellProps,
  DEMO_ORDER_COLUMNS,
  type DemoCells,
  demoConfirm,
  demoFilterTypes,
  type DemoOrder,
  demoOrders,
  demoSavedViews,
  LIVE_DEFAULT_LAYOUT,
  type LoadCellProps,
  type Locale,
  makeActions,
  makeBulkActions,
  makeColumns,
  makeWideColumns,
  nestedOpenIds,
  type Person,
  type StatusCellProps,
  statusTone,
  strings,
} from "../data";
import {
  type DataMode,
  DemoBody,
  type Density,
  type Failure,
  type FiltersUi,
  type PageMode,
} from "../Demo";
import { useDemoFilterDefs } from "../demoFilters";
import {
  nestedInnerFeatures,
  nestedOuterFeatures,
} from "../nestedTablePlugins";

/** Mantine-native cell visuals (Avatar · Badge · Progress). */
const MANTINE_CELLS: DemoCells = {
  Avatar: ({ name }: AvatarCellProps) => (
    <Avatar name={name} color="initials" radius="xl" size={36} />
  ),
  Status: ({ status, label }: StatusCellProps) => (
    <Badge color={statusTone(status)} variant="light" radius="sm">
      {label}
    </Badge>
  ),
  Load: ({ value, meta }: LoadCellProps) => (
    <Stack gap={4} miw={90}>
      <Progress value={value} size="sm" radius="xl" />
      <Text size="xs" c="dimmed">
        {meta}
      </Text>
    </Stack>
  ),
};

/**
 * The orders under one person, as a nested table — the kit's own `<DataTable>`
 * inside a row, so the reader gets the same table twice over.
 */
const nestedOrders = (row: Person) => ({
  label: `${row.name} — recent orders`,
  table: (defaults: NestedTableDefaults) => (
    <DataTable<DemoOrder>
      {...defaults}
      data={demoOrders(row)}
      columns={DEMO_ORDER_COLUMNS}
      rowKey={(order) => order.id}
      features={nestedInnerFeatures<DemoOrder>()}
    />
  ),
});

export function MantineDemo({
  mode,
  locale,
  dark,
  pageMode,
  urlKey,
  density,
  filtersUi,
  animate,
  grouping,
  tree,
  nested,
  rowMode,
  batch,
  rowMutations,
  rowReorder,
  rowPinning,
  cellSpan,
  extraRows,
  rowStyle,
  highlight,
  failure,
  onRecover,
  customCard,
  realtime,
  editing,
  cellNavigation,
  columnSelectionCheckbox,
  forceMobile,
  exportCsv,
  headerFilters,
  filterFields,
  columnGroups,
  sparkline,
  formulaColumns,
  derivedFields,
  editorShowcase,
  columnMenu,
  filterControls,
  bulkActions,
  statusBar,
  contextMenu,
  densityChooser,
  onDensityChange,
  fullscreen,
  commandPalette,
  onPrint,
  printButton,
  undoRedoButtons,
  sidePanel,
  wide,
  defaultColumnLayout,
  focused,
}: Readonly<{
  mode: DataMode;
  locale: Locale;
  dark?: boolean;
  pageMode?: PageMode;
  urlKey?: string;
  density?: Density;
  filtersUi?: FiltersUi;
  animate?: boolean;
  grouping?: boolean;
  tree?: boolean;
  nested?: boolean;
  rowMode?: boolean;
  batch?: boolean;
  rowMutations?: boolean;
  rowReorder?: boolean;
  rowPinning?: boolean;
  cellSpan?: boolean;
  extraRows?: boolean;
  rowStyle?: boolean;
  highlight?: boolean;
  failure?: Failure;
  onRecover?: () => void;
  customCard?: boolean;
  /** Apply live row patches on a timer, the way a socket feed would. */
  realtime?: boolean;
  editing?: boolean;
  cellNavigation?: boolean;
  columnSelectionCheckbox?: boolean;
  headerFilters?: boolean;
  filterFields?: boolean;
  columnGroups?: boolean;
  sparkline?: boolean;
  /** Columns built from user-typed formulas, appended after the declared set. */
  formulaColumns?: readonly ColumnDef<Person>[];
  /** Write the id-derived fields onto the rows, so a formula can read them. */
  derivedFields?: boolean;
  /** Add the boolean and multi-select editor columns. */
  editorShowcase?: boolean;
  /** Show the Columns menu. Defaults to on unless the page is focused. */
  columnMenu?: boolean;
  /** Show the Filters control. Defaults to on unless the page is focused. */
  filterControls?: boolean;
  /** Bulk actions, which are what turn row selection on. Defaults to on
   *  unless the page is focused. */
  bulkActions?: boolean;
  statusBar?: boolean;
  contextMenu?: boolean;
  densityChooser?: boolean;
  onDensityChange?: (next: "comfortable" | "compact") => void;
  fullscreen?: boolean;
  commandPalette?: boolean;
  onPrint?: () => void;
  printButton?: boolean;
  undoRedoButtons?: boolean;
  sidePanel?: NonNullable<DataTableProps<Person>["sidePanel"]>;
  /** Use the wide, horizontally-scrolling column set with Person pinned. */
  wide?: boolean;
  /** The column layout the page starts from. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  forceMobile?: boolean;
  /** Dedicated pages hide unrelated filter/action/view chrome. */
  focused?: boolean;
  /**
   * Export configuration for the toolbar button. Defaults to a plain CSV of
   * the current page; the grouping demo overrides it to write the grouped
   * sheet as a spreadsheet.
   */
  exportCsv?: NonNullable<DataTableProps<Person>["exportCsv"]>;
}>) {
  const s = strings(locale);
  const filters = useDemoFilterDefs(locale);
  return (
    <MantineProvider forceColorScheme={dark ? "dark" : "light"}>
      <DemoBody
        mode={mode}
        pageMode={pageMode}
        urlKey={urlKey}
        defaultColumnLayout={
          // The wide showcase pins BOTH edges by default: person at the
          // start, the actions column at the end (it pins like any column).
          wide
            ? {
                pinned: focused
                  ? { person: "start" }
                  : { person: "start", actions: "end" },
              }
            : (defaultColumnLayout ?? LIVE_DEFAULT_LAYOUT)
        }
        grouping={grouping}
        tree={tree}
        rowMode={rowMode}
        batch={batch}
        rowMutations={rowMutations}
        rowReorder={rowReorder}
        rowPinning={rowPinning}
        cellSpan={cellSpan}
        extraRows={extraRows}
        rowStyle={rowStyle}
        highlight={highlight}
        failure={failure}
        onRecover={onRecover}
        customCard={customCard}
        realtime={realtime}
        editing={editing}
        derivedFields={derivedFields}
        formulaColumns={formulaColumns}
        render={(source, columns) => (
          <DataTable
            source={source}
            columns={
              wide
                ? makeWideColumns(locale, MANTINE_CELLS, {
                    editable: Boolean(
                      editing === true ||
                      rowMode === true ||
                      batch === true ||
                      editorShowcase === true
                    ),
                  })
                : makeColumns(locale, MANTINE_CELLS, {
                    groups: columnGroups,
                    sparkline,
                    editors: editorShowcase,
                    formulas: formulaColumns,
                    editable: Boolean(
                      editing === true ||
                      rowMode === true ||
                      batch === true ||
                      editorShowcase === true
                    ),
                  })
            }
            rowKey={(r) => r.id}
            features={nested ? nestedOuterFeatures<Person>() : undefined}
            nestedTable={nested ? nestedOrders : undefined}
            defaultExpandedRowIds={nestedOpenIds(nested, source.rows)}
            cellNavigation={cellNavigation ?? editing}
            columnSelectionCheckbox={columnSelectionCheckbox}
            statusBar={statusBar}
            contextMenu={contextMenu}
            densityChooser={densityChooser}
            onDensityChange={onDensityChange}
            fullscreen={fullscreen}
            commandPalette={commandPalette}
            onPrint={onPrint}
            printButton={printButton}
            undoRedoButtons={undoRedoButtons}
            sidePanel={sidePanel}
            selectionStats={editing}
            editHistory={editing}
            findInTable={editing}
            {...columns}
            density={density}
            filtersMode={filtersUi}
            labels={getLabels(locale)}
            locale={locale}
            dir={getDirection(locale)}
            searchPlaceholder={s.search}
            rowActions={
              rowMutations || (focused && !columnGroups)
                ? undefined
                : makeActions(locale)
            }
            rowActionsLayout={rowMutations ? "menu" : undefined}
            bulkActions={
              (bulkActions ?? !focused) ? makeBulkActions(locale) : undefined
            }
            confirm={demoConfirm}
            enableColumnMenu={columnMenu ?? !focused}
            exportCsv={exportCsv ?? !focused}
            savedViews={focused ? undefined : demoSavedViews(urlKey)}
            animate={animate}
            resizableColumns
            stickyHeader
            headerFilters={headerFilters}
            filterFields={filterFields}
            stickyTop={8}
            filters={(filterControls ?? !focused) ? filters : undefined}
            filterTypes={demoFilterTypes()}
            forceMobile={forceMobile}
          />
        )}
      />
    </MantineProvider>
  );
}
