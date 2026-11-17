import type { ColumnLayoutState, TableSource } from "@adapttable/core";
import type {
  ColumnDef,
  FeatureProps,
  NestedTableDefaults,
} from "@adapttable/react";
import { DataTable, type DataTableClassNames } from "@adapttable/unstyled";
import { bulkActions as bulkActions_ } from "@adapttable/unstyled/bulk-actions";
import { cellNavigation as cellNavigation_ } from "@adapttable/unstyled/cell-navigation";
import { collapsibleColumnGroups as columnGroups_ } from "@adapttable/unstyled/column-groups";
import { columnMenu as columnMenu_ } from "@adapttable/unstyled/column-menu";
import { columnSelectionCheckbox as columnSelection_ } from "@adapttable/unstyled/column-selection";
import { commandPalette as commandPalette_ } from "@adapttable/unstyled/command-palette";
import { contextMenu as contextMenu_ } from "@adapttable/unstyled/context-menu";
import { densityChooser as densityChooser_ } from "@adapttable/unstyled/density";
import {
  batchEditing as batchEditing_,
  editHistory as editHistory_,
  editing as editing_,
  rowEditing as rowEditing_,
  undoRedoButtons as undoRedoButtons_,
} from "@adapttable/unstyled/editing";
import { exportCsv as exportCsv_ } from "@adapttable/unstyled/export";
import {
  filters as filters_,
  filterTypes as filterTypes_,
} from "@adapttable/unstyled/filters";
import { findInTable as findInTable_ } from "@adapttable/unstyled/find-in-table";
import { fullscreen as fullscreen_ } from "@adapttable/unstyled/fullscreen";
import { headerFilters as headerFilters_ } from "@adapttable/unstyled/header-filters";
import { nestedTable as nestedTable_ } from "@adapttable/unstyled/nested-table";
import { print as print_ } from "@adapttable/unstyled/print";
import { resizableColumns as resizableColumns_ } from "@adapttable/unstyled/resizable-columns";
import { rowActions as rowActions_ } from "@adapttable/unstyled/row-actions";
import { rowReorder as rowReorder_ } from "@adapttable/unstyled/row-reorder";
import { savedViews as savedViews_ } from "@adapttable/unstyled/saved-views";
import { sidePanel as sidePanel_ } from "@adapttable/unstyled/side-panel";
import {
  selectionStats as selectionStats_,
  statusBar as statusBar_,
} from "@adapttable/unstyled/status-bar";
import { tree as tree_ } from "@adapttable/unstyled/tree";

import { pageTablePresentation } from "../demoPresentation";
import type { MobileDataState } from "../shared/mobileScenario";
import { type KitChromeFactories, kitChromeFeatures } from "./chromeFeatures";

/** This kit's factories, handed to the shared builder. */
const KIT_CHROME = {
  cellNavigation: cellNavigation_,
  columnSelectionCheckbox: columnSelection_,
  densityChooser: densityChooser_,
  batchEditing: batchEditing_,
  editHistory: editHistory_,
  editing: editing_,
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
import { type CSSProperties, useMemo } from "react";

import {
  type AvatarCellProps,
  DEMO_ORDER_COLUMNS,
  type DemoCells,
  demoConfirm,
  demoFilterTypes,
  type DemoOrder,
  demoOrders,
  initials,
  LIVE_DEFAULT_LAYOUT,
  type LoadCellProps,
  type Locale,
  makeActions,
  makeBulkActions,
  makeColumns,
  makeWideColumns,
  nameHue,
  nestedOpenIds,
  type Person,
  type StatusCellProps,
  statusTone,
  strings,
} from "../data";
import {
  type DataMode,
  DemoBody,
  type DemoColumnProps,
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

/** Inline style carrying the avatar's hue as a CSS custom property, so the
 * Tailwind arbitrary values can theme it per light/dark. */
type AvatarStyle = CSSProperties & { "--avatar-h": string };

const avatarStyle = (name: string): AvatarStyle => ({
  "--avatar-h": String(nameHue(name)),
});

const TAILWIND_STATUS = {
  green:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  gray: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-300",
} as const;

/** Class-driven cell visuals (no UI kit) — Tailwind utilities for shadcn/plain. */
const TAILWIND_CELLS: DemoCells = {
  Avatar: ({ name }: AvatarCellProps) => (
    <span
      className="inline-grid h-9 w-9 place-items-center rounded-full text-xs font-bold [background:hsl(var(--avatar-h)_60%_88%)] [color:hsl(var(--avatar-h)_45%_30%)] dark:[background:hsl(var(--avatar-h)_45%_24%)] dark:[color:hsl(var(--avatar-h)_70%_78%)]"
      style={avatarStyle(name)}
    >
      {initials(name)}
    </span>
  ),
  Status: ({ status, label }: StatusCellProps) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TAILWIND_STATUS[statusTone(status)]}`}
    >
      {label}
    </span>
  ),
  Load: ({ value, meta, label }: LoadCellProps) => (
    <div className="min-w-[90px]">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
      >
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {meta}
      </div>
    </div>
  ),
};

/**
 * The unstyled adapter ships no CSS, so "compact" density can't change padding
 * on its own — we tighten the cell/header vertical padding token here so the
 * change is visible.
 */
function withDensity(
  classNames: DataTableClassNames,
  density: Density
): DataTableClassNames {
  if (density !== "compact") return classNames;
  const tighten = (cls?: string) => cls?.replace("py-2.5", "py-1.5");
  return {
    ...classNames,
    cell: tighten(classNames.cell),
    headerCell: tighten(classNames.headerCell),
  };
}

/**
 * Shared renderer for the two class-driven demos (plain Tailwind and
 * shadcn-style). The unstyled adapter ships no CSS — these `classNames`
 * (Tailwind utilities via the Play CDN) are the entire look.
 */
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

export function UnstyledLike({
  mode,
  locale,
  classNames,
  groupingPanelFactory,
  pageMode,
  urlKey,
  density = "comfortable",
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
  dataState,
  onRowActivate,
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
  maxHeight,
  focused,
}: Readonly<{
  mode: DataMode;
  locale: Locale;
  classNames: DataTableClassNames;
  groupingPanelFactory: KitChromeFactories["groupingPanel"];
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
  /** Which data state the table shows. */
  dataState?: MobileDataState;
  /** The host callback when a row or card is activated. */
  onRowActivate?: (row: Person) => void;
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
  /** The column layout the page starts from. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  forceMobile?: boolean;
  maxHeight?: number;
  /** Dedicated pages hide unrelated filter/action/view chrome. */
  focused?: boolean;
}>) {
  const s = strings(locale);
  const filters = useDemoFilterDefs(locale);
  const styled = useMemo(
    () => withDensity(classNames, density),
    [classNames, density]
  );
  const rowActionsShown = showsRowActions({
    rowMutations,
    focused,
    columnGroups,
  });
  const editable =
    editing === true ||
    rowMode === true ||
    batch === true ||
    editorShowcase === true;
  const options = useMemo<UnstyledLikeTableOptions>(
    () => ({
      locale,
      search: s.search,
      filters,
      styled,
      groupingPanelFactory,
      wide,
      editable,
      columnGroups,
      sparkline,
      editorShowcase,
      formulaColumns,
      nested,
      editing,
      cellNavigation,
      columnSelectionCheckbox,
      densityChooser,
      exportCsv,
      focused,
      fullscreen,
      headerFilters,
      onPrint,
      printButton,
      undoRedoButtons,
      urlKey,
      bulkActions,
      columnMenu,
      commandPalette,
      contextMenu,
      filterControls,
      sidePanel,
      statusBar,
      rowActionsShown,
      onDensityChange,
      forceMobile,
      maxHeight,
      density,
      filtersUi,
      rowMutations,
      animate,
      filterFields,
    }),
    [
      locale,
      s.search,
      filters,
      styled,
      groupingPanelFactory,
      wide,
      editable,
      columnGroups,
      sparkline,
      editorShowcase,
      formulaColumns,
      nested,
      editing,
      cellNavigation,
      columnSelectionCheckbox,
      densityChooser,
      exportCsv,
      focused,
      fullscreen,
      headerFilters,
      onPrint,
      printButton,
      undoRedoButtons,
      urlKey,
      bulkActions,
      columnMenu,
      commandPalette,
      contextMenu,
      filterControls,
      sidePanel,
      statusBar,
      rowActionsShown,
      onDensityChange,
      forceMobile,
      maxHeight,
      density,
      filtersUi,
      rowMutations,
      animate,
      filterFields,
    ]
  );
  return (
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
      dataState={dataState}
      onRowActivate={onRowActivate}
      onRecover={onRecover}
      customCard={customCard}
      realtime={realtime}
      editing={editing}
      derivedFields={derivedFields}
      formulaColumns={formulaColumns}
      columnGroups={columnGroups}
      render={(source, demo) => (
        <UnstyledLikeTable source={source} demo={demo} options={options} />
      )}
    />
  );
}

/** What the table half of an unstyled-like demo reads from its page. */
interface UnstyledLikeTableOptions {
  readonly locale: Locale;
  readonly search: string;
  readonly filters: ReturnType<typeof useDemoFilterDefs>;
  readonly styled: DataTableClassNames;
  readonly groupingPanelFactory: KitChromeFactories["groupingPanel"];
  readonly wide?: boolean;
  readonly editable: boolean;
  readonly columnGroups?: boolean;
  readonly sparkline?: boolean;
  readonly editorShowcase?: boolean;
  readonly formulaColumns?: readonly ColumnDef<Person>[];
  readonly nested?: boolean;
  readonly editing?: boolean;
  readonly cellNavigation?: boolean;
  readonly columnSelectionCheckbox?: boolean;
  readonly densityChooser?: boolean;
  readonly exportCsv?: NonNullable<FeatureProps<Person>["exportCsv"]>;
  readonly focused?: boolean;
  readonly fullscreen?: boolean;
  readonly headerFilters?: boolean;
  readonly onPrint?: () => void;
  readonly printButton?: boolean;
  readonly undoRedoButtons?: boolean;
  readonly urlKey?: string;
  readonly bulkActions?: boolean;
  readonly columnMenu?: boolean;
  readonly commandPalette?: boolean;
  readonly contextMenu?: boolean;
  readonly filterControls?: boolean;
  readonly sidePanel?: NonNullable<FeatureProps<Person>["sidePanel"]>;
  readonly statusBar?: boolean;
  readonly rowActionsShown: boolean;
  readonly onDensityChange?: (next: "comfortable" | "compact") => void;
  readonly forceMobile?: boolean;
  readonly maxHeight?: number;
  readonly density?: Density;
  readonly filtersUi?: FiltersUi;
  readonly rowMutations?: boolean;
  readonly animate?: boolean;
  readonly filterFields?: boolean;
}

const personId = (row: Person): string => row.id;

/**
 * The table of an unstyled-like demo. Its columns, features and presentation
 * are built once per change of what they read, so the table keeps them across
 * an edit, a selection or a streamed patch, the way a host's table would.
 */
function UnstyledLikeTable({
  source,
  demo,
  options: o,
}: Readonly<{
  source: TableSource<Person>;
  demo: DemoColumnProps;
  options: UnstyledLikeTableOptions;
}>) {
  const { features: demoFeatures, demoRowHandlers, ...columns } = demo;
  const tableColumns = useMemo(
    () =>
      o.wide
        ? makeWideColumns(o.locale, TAILWIND_CELLS, { editable: o.editable })
        : makeColumns(o.locale, TAILWIND_CELLS, {
            groups: o.columnGroups,
            sparkline: o.sparkline,
            editors: o.editorShowcase,
            formulas: o.formulaColumns,
            editable: o.editable,
          }),
    [o]
  );
  const nestedRows = o.nested ? source.rows : undefined;
  const { kitFeatures, collapsibleColumnGroups } = columns;
  const features = useMemo(
    () => [
      ...(o.nested ? nestedOuterFeatures<Person>() : []),
      ...kitChromeFeatures(
        { ...KIT_CHROME, groupingPanel: o.groupingPanelFactory },
        {
          cellNavigation: o.cellNavigation,
          columnSelectionCheckbox: o.columnSelectionCheckbox,
          densityChooser: o.densityChooser,
          editing: o.editing,
          exportCsv: o.exportCsv,
          focused: o.focused,
          fullscreen: o.fullscreen,
          headerFilters: o.headerFilters,
          nested: o.nested ? nestedOrders : undefined,
          nestedOpenIds: nestedOpenIds(o.nested, nestedRows ?? []),
          onPrint: o.onPrint,
          printButton: o.printButton,
          undoRedoButtons: o.undoRedoButtons,
          urlKey: o.urlKey,
          bulkActions: o.bulkActions,
          bulkActionList: makeBulkActions(o.locale, demoRowHandlers),
          collapsibleColumnGroups,
          columnMenu: o.columnMenu,
          rowActions: o.rowActionsShown
            ? makeActions(o.locale, demoRowHandlers)
            : undefined,
          commandPalette: o.commandPalette,
          contextMenu: o.contextMenu,
          filterControls: o.filterControls,
          filterDefs: o.filters,
          filterTypeSpecs: demoFilterTypes(),
          sidePanel: o.sidePanel,
          statusBar: o.statusBar,
          kitFeatures,
        }
      ),
      ...(demoFeatures ?? []),
    ],
    [
      o,
      nestedRows,
      collapsibleColumnGroups,
      demoRowHandlers,
      kitFeatures,
      demoFeatures,
    ]
  );
  const presentation = useMemo(
    () => pageTablePresentation(o.locale, o.search),
    [o.locale, o.search]
  );
  return (
    <DataTable
      source={source}
      columns={tableColumns}
      rowKey={personId}
      features={features}
      onDensityChange={o.onDensityChange}
      {...columns}
      forceMobile={o.forceMobile}
      maxHeight={o.maxHeight}
      density={o.density}
      filtersMode={o.filtersUi}
      {...presentation}
      rowActionsLayout={o.rowMutations ? "menu" : undefined}
      confirm={demoConfirm}
      animate={o.animate}
      stickyHeader
      filterFields={o.filterFields}
      classNames={o.styled}
    />
  );
}
