import { DataTable } from "@adapttable/chakra";
import { bulkActions as bulkActions_ } from "@adapttable/chakra/bulk-actions";
import { cellNavigation as cellNavigation_ } from "@adapttable/chakra/cell-navigation";
import { collapsibleColumnGroups as columnGroups_ } from "@adapttable/chakra/column-groups";
import { columnMenu as columnMenu_ } from "@adapttable/chakra/column-menu";
import { columnSelectionCheckbox as columnSelection_ } from "@adapttable/chakra/column-selection";
import { commandPalette as commandPalette_ } from "@adapttable/chakra/command-palette";
import { contextMenu as contextMenu_ } from "@adapttable/chakra/context-menu";
import { densityChooser as densityChooser_ } from "@adapttable/chakra/density";
import {
  batchEditing as batchEditing_,
  editHistory as editHistory_,
  editing as editing_,
  rowEditing as rowEditing_,
  undoRedoButtons as undoRedoButtons_,
} from "@adapttable/chakra/editing";
import { exportCsv as exportCsv_ } from "@adapttable/chakra/export";
import {
  filters as filters_,
  filterTypes as filterTypes_,
} from "@adapttable/chakra/filters";
import { findInTable as findInTable_ } from "@adapttable/chakra/find-in-table";
import { fullscreen as fullscreen_ } from "@adapttable/chakra/fullscreen";
import { groupingPanel as groupingPanel_ } from "@adapttable/chakra/grouping-panel";
import { headerFilters as headerFilters_ } from "@adapttable/chakra/header-filters";
import { nestedTable as nestedTable_ } from "@adapttable/chakra/nested-table";
import { print as print_ } from "@adapttable/chakra/print";
import { resizableColumns as resizableColumns_ } from "@adapttable/chakra/resizable-columns";
import { rowActions as rowActions_ } from "@adapttable/chakra/row-actions";
import { rowReorder as rowReorder_ } from "@adapttable/chakra/row-reorder";
import { savedViews as savedViews_ } from "@adapttable/chakra/saved-views";
import { sidePanel as sidePanel_ } from "@adapttable/chakra/side-panel";
import {
  selectionStats as selectionStats_,
  statusBar as statusBar_,
} from "@adapttable/chakra/status-bar";
import { tree as tree_ } from "@adapttable/chakra/tree";
import type { ColumnLayoutState } from "@adapttable/core";
import { getDirection, getLabels } from "@adapttable/i18n";
import type {
  ColumnDef,
  FeatureProps,
  NestedTableDefaults,
} from "@adapttable/react";

import { kitChromeFeatures } from "./chromeFeatures";

/** This kit's factories, handed to the shared builder. */
const KIT_CHROME = {
  cellNavigation: cellNavigation_,
  columnSelectionCheckbox: columnSelection_,
  densityChooser: densityChooser_,
  batchEditing: batchEditing_,
  editHistory: editHistory_,
  editing: editing_,
  groupingPanel: groupingPanel_,
  rowEditing: rowEditing_,
  rowReorder: rowReorder_,
  tree: tree_,
  exportCsv: exportCsv_,
  fullscreen: fullscreen_,
  headerFilters: headerFilters_,
  nestedTable: nestedTable_,
  print: print_,
  resizableColumns: resizableColumns_,
  rowActions: rowActions_,
  savedViews: savedViews_,
  undoRedoButtons: undoRedoButtons_,
  bulkActions: bulkActions_,
  collapsibleColumnGroups: columnGroups_,
  columnMenu: columnMenu_,
  commandPalette: commandPalette_,
  contextMenu: contextMenu_,
  filters: filters_,
  filterTypes: filterTypes_,
  findInTable: findInTable_,
  selectionStats: selectionStats_,
  sidePanel: sidePanel_,
  statusBar: statusBar_,
};
import {
  Avatar,
  Badge,
  Box,
  ChakraProvider,
  defaultSystem,
  Progress,
  Text,
} from "@chakra-ui/react";

import {
  type AvatarCellProps,
  DEMO_ORDER_COLUMNS,
  type DemoCells,
  demoConfirm,
  demoFilterTypes,
  type DemoOrder,
  demoOrders,
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
  showsRowActions,
} from "../Demo";
import { useDemoFilterDefs } from "../demoFilters";
import {
  nestedInnerFeatures,
  nestedOuterFeatures,
} from "../nestedTablePlugins";

/** Chakra-native cell visuals (Avatar · Badge · Progress). */
const CHAKRA_CELLS: DemoCells = {
  Avatar: ({ name }: AvatarCellProps) => (
    <Avatar.Root size="sm">
      <Avatar.Fallback name={name} />
    </Avatar.Root>
  ),
  Status: ({ status, label }: StatusCellProps) => (
    <Badge
      colorPalette={statusTone(status)}
      borderRadius="full"
      px={2}
      py={0.5}
      textTransform="none"
    >
      {label}
    </Badge>
  ),
  Load: ({ value, meta }: LoadCellProps) => (
    <Box minW="90px">
      <Progress.Root value={value} size="sm" colorPalette="blue">
        <Progress.Track borderRadius="full">
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
      <Text fontSize="xs" color="gray.500" mt={1}>
        {meta}
      </Text>
    </Box>
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

export function ChakraDemo({
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
  pinnedSummaryRows,
  summaryRow,
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
  headerFilters,
  filterFields,
  columnGroups,
  sparkline,
  formulaColumns,
  derivedFields,
  editorShowcase,
  exportCsv,
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
  forceMobile,
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
  pinnedSummaryRows?: boolean;
  summaryRow?: boolean;
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
  /** The toolbar Export button's configuration. */
  exportCsv?: NonNullable<FeatureProps<Person>["exportCsv"]>;
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
  sidePanel?: NonNullable<FeatureProps<Person>["sidePanel"]>;
  /** Use the wide, horizontally-scrolling column set with Person pinned. */
  wide?: boolean;
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  forceMobile?: boolean;
  /** Dedicated pages hide unrelated filter/action/view chrome. */
  focused?: boolean;
}>) {
  const s = strings(locale);
  const filters = useDemoFilterDefs(locale);
  const rowActionsShown = showsRowActions({
    rowMutations,
    focused,
    columnGroups,
  });
  return (
    <ChakraProvider value={defaultSystem}>
      {/* Chakra v3 resolves `_dark` tokens under a `.dark` ancestor, so forcing
          the class here tracks the page theme without next-themes/persistence. */}
      <Box className={dark ? "dark" : "light"} bg="bg" color="fg">
        <DemoBody
          rowActionsShown={rowActionsShown}
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
          pinnedSummaryRows={pinnedSummaryRows}
          summaryRow={summaryRow}
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
          render={(
            source,
            { features: demoFeatures, demoRowHandlers, ...columns }
          ) => (
            <DataTable
              source={source}
              columns={
                wide
                  ? makeWideColumns(locale, CHAKRA_CELLS, {
                      editable: Boolean(
                        editing === true ||
                        rowMode === true ||
                        batch === true ||
                        editorShowcase === true
                      ),
                    })
                  : makeColumns(locale, CHAKRA_CELLS, {
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
              features={[
                ...(nested ? nestedOuterFeatures<Person>() : []),
                ...kitChromeFeatures(KIT_CHROME, {
                  cellNavigation,
                  columnSelectionCheckbox,
                  densityChooser,
                  editing,
                  exportCsv,
                  focused,
                  fullscreen,
                  headerFilters,
                  nested: nested ? nestedOrders : undefined,
                  nestedOpenIds: nestedOpenIds(nested, source.rows),
                  onPrint,
                  printButton,
                  undoRedoButtons,
                  urlKey,
                  bulkActions,
                  bulkActionList: makeBulkActions(locale),
                  collapsibleColumnGroups: columns.collapsibleColumnGroups,
                  columnMenu,
                  rowActions: rowActionsShown
                    ? makeActions(locale, demoRowHandlers)
                    : undefined,
                  commandPalette,
                  contextMenu,
                  filterControls,
                  filterDefs: filters,
                  filterTypeSpecs: demoFilterTypes(),
                  sidePanel,
                  statusBar,
                  kitFeatures: columns.kitFeatures,
                }),
                ...(demoFeatures ?? []),
              ]}
              onDensityChange={onDensityChange}
              {...columns}
              forceMobile={forceMobile}
              density={density}
              filtersMode={filtersUi}
              labels={getLabels(locale)}
              locale={locale}
              dir={getDirection(locale)}
              searchPlaceholder={s.search}
              rowActionsLayout={rowMutations ? "menu" : undefined}
              confirm={demoConfirm}
              animate={animate}
              stickyHeader
              filterFields={filterFields}
            />
          )}
        />
      </Box>
    </ChakraProvider>
  );
}
