import "@radix-ui/themes/styles.css";

import type {
  ColumnDef,
  ColumnLayoutState,
  NestedTableDefaults,
} from "@adapttable/core";
import { getDirection, getLabels } from "@adapttable/i18n";
import { DataTable, type DataTableProps } from "@adapttable/radix";
import { bulkActions as bulkActions_ } from "@adapttable/radix/bulk-actions";
import { cellNavigation as cellNavigation_ } from "@adapttable/radix/cell-navigation";
import { collapsibleColumnGroups as columnGroups_ } from "@adapttable/radix/column-groups";
import { columnMenu as columnMenu_ } from "@adapttable/radix/column-menu";
import { columnSelectionCheckbox as columnSelection_ } from "@adapttable/radix/column-selection";
import { commandPalette as commandPalette_ } from "@adapttable/radix/command-palette";
import { contextMenu as contextMenu_ } from "@adapttable/radix/context-menu";
import { densityChooser as densityChooser_ } from "@adapttable/radix/density";
import {
  batchEditing as batchEditing_,
  editHistory as editHistory_,
  editing as editing_,
  rowEditing as rowEditing_,
  undoRedoButtons as undoRedoButtons_,
} from "@adapttable/radix/editing";
import { exportCsv as exportCsv_ } from "@adapttable/radix/export";
import {
  filters as filters_,
  filterTypes as filterTypes_,
} from "@adapttable/radix/filters";
import { findInTable as findInTable_ } from "@adapttable/radix/find-in-table";
import { fullscreen as fullscreen_ } from "@adapttable/radix/fullscreen";
import { grouping as grouping_ } from "@adapttable/radix/grouping";
import { headerFilters as headerFilters_ } from "@adapttable/radix/header-filters";
import { nestedTable as nestedTable_ } from "@adapttable/radix/nested-table";
import { print as print_ } from "@adapttable/radix/print";
import { resizableColumns as resizableColumns_ } from "@adapttable/radix/resizable-columns";
import { rowActions as rowActions_ } from "@adapttable/radix/row-actions";
import { rowReorder as rowReorder_ } from "@adapttable/radix/row-reorder";
import { savedViews as savedViews_ } from "@adapttable/radix/saved-views";
import { sidePanel as sidePanel_ } from "@adapttable/radix/side-panel";
import {
  selectionStats as selectionStats_,
  statusBar as statusBar_,
} from "@adapttable/radix/status-bar";
import { tree as tree_ } from "@adapttable/radix/tree";

import { kitChromeFeatures } from "./chromeFeatures";

/** This kit's factories, handed to the shared builder. */
const KIT_CHROME = {
  cellNavigation: cellNavigation_,
  columnSelectionCheckbox: columnSelection_,
  densityChooser: densityChooser_,
  batchEditing: batchEditing_,
  editHistory: editHistory_,
  editing: editing_,
  grouping: grouping_,
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
import { Avatar, Badge, Box, Progress, Text, Theme } from "@radix-ui/themes";

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

/** Two-letter initials for the avatar fallback. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Radix-native cell visuals (Avatar · Badge · Progress). */
const RADIX_CELLS: DemoCells = {
  Avatar: ({ name }: AvatarCellProps) => (
    <Avatar size="2" radius="full" fallback={initials(name)} />
  ),
  Status: ({ status, label }: StatusCellProps) => (
    <Badge color={statusTone(status)} radius="full" variant="soft">
      {label}
    </Badge>
  ),
  Load: ({ value, meta }: LoadCellProps) => (
    <Box style={{ minWidth: "90px" }}>
      <Progress value={value} size="1" />
      <Text as="div" size="1" color="gray" mt="1">
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

export function RadixDemo({
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
  exportCsv?: NonNullable<DataTableProps<Person>["exportCsv"]>;
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
}>) {
  const s = strings(locale);
  const filters = useDemoFilterDefs(locale);
  return (
    <Theme
      appearance={dark ? "dark" : "light"}
      accentColor="iris"
      grayColor="slate"
      radius="medium"
      hasBackground={false}
      // Radix's <Theme> defaults to `min-height: 100vh` to fill a page; this
      // one is embedded in the demo card, so let it size to its content.
      style={{ minHeight: 0 }}
    >
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
        render={(source, { features: demoFeatures, ...columns }) => (
          <DataTable
            source={source}
            columns={
              wide
                ? makeWideColumns(locale, RADIX_CELLS, {
                    editable: Boolean(
                      editing === true ||
                      rowMode === true ||
                      batch === true ||
                      editorShowcase === true
                    ),
                  })
                : makeColumns(locale, RADIX_CELLS, {
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
                onPrint,
                printButton,
                undoRedoButtons,
                urlKey,
                bulkActions,
                bulkActionList: makeBulkActions(locale),
                collapsibleColumnGroups: columns.collapsibleColumnGroups,
                columnMenu,
                rowActions: !(rowMutations ?? (focused && !columnGroups)),
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
            forceMobile={forceMobile}
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
            filters={(filterControls ?? !focused) ? filters : undefined}
            filterTypes={demoFilterTypes()}
          />
        )}
      />
    </Theme>
  );
}
