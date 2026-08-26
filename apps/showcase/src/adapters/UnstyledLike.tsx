import type { ColumnLayoutState } from "@adapttable/core";
import type { ColumnDef, NestedTableDefaults } from "@adapttable/core";
import { getDirection, getLabels } from "@adapttable/i18n";
import {
  DataTable,
  type DataTableClassNames,
  type DataTableProps,
} from "@adapttable/unstyled";
import type { CSSProperties } from "react";

import {
  type AvatarCellProps,
  DEMO_ORDER_COLUMNS,
  type DemoCells,
  demoConfirm,
  demoFilterTypes,
  type DemoOrder,
  demoOrders,
  demoSavedViews,
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
  Load: ({ value, meta }: LoadCellProps) => (
    <div className="min-w-[90px]">
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
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
  classNames: DataTableClassNames;
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
  exportCsv?: DataTableProps<Person>["exportCsv"];
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
  sidePanel?: DataTableProps<Person>["sidePanel"];
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
  const styled = withDensity(classNames, density);
  return (
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
      columnGroups={columnGroups}
      render={(source, columns) => {
        return (
          <DataTable
            source={source}
            columns={
              wide
                ? makeWideColumns(locale, TAILWIND_CELLS, {
                    editable: Boolean(
                      editing === true ||
                      rowMode === true ||
                      batch === true ||
                      editorShowcase === true
                    ),
                  })
                : makeColumns(locale, TAILWIND_CELLS, {
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
            classNames={styled}
            filters={(filterControls ?? !focused) ? filters : undefined}
            filterTypes={demoFilterTypes()}
          />
        );
      }}
    />
  );
}
