import type { ColumnDef, ColumnLayoutState } from "@adapttable/core";
import { shadcnClassNames } from "@adapttable/shadcn";
import type { DataTableProps } from "@adapttable/unstyled";

import { type Locale, type Person } from "../data";
import {
  type DataMode,
  type Density,
  type Failure,
  type FiltersUi,
  type PageMode,
} from "../Demo";
import { UnstyledLike } from "./UnstyledLike";

// shadcn/ui = Tailwind utilities over headless primitives — exactly what the
// unstyled adapter exposes. The class map now lives in `@adapttable/shadcn`
// (single source of truth); this demo mounts the unstyled adapter with that
// preset, the same one-import preset a consumer gets. Real shadcn tokens
// (bg-card, text-muted-foreground, border-border, bg-primary…) come from
// tailwind.css.
export function ShadcnDemo({
  mode,
  locale,
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
  editorShowcase?: boolean;
  /** The toolbar Export button's configuration. */
  exportCsv?: NonNullable<DataTableProps<Person>["exportCsv"]>;
  columnMenu?: boolean;
  filterControls?: boolean;
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
  wide?: boolean;
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  forceMobile?: boolean;
  focused?: boolean;
}>) {
  return (
    <UnstyledLike
      mode={mode}
      locale={locale}
      pageMode={pageMode}
      urlKey={urlKey}
      density={density}
      filtersUi={filtersUi}
      animate={animate}
      grouping={grouping}
      tree={tree}
      nested={nested}
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
      headerFilters={headerFilters}
      filterFields={filterFields}
      columnGroups={columnGroups}
      sparkline={sparkline}
      formulaColumns={formulaColumns}
      derivedFields={derivedFields}
      editorShowcase={editorShowcase}
      exportCsv={exportCsv}
      columnMenu={columnMenu}
      filterControls={filterControls}
      bulkActions={bulkActions}
      wide={wide}
      defaultColumnLayout={defaultColumnLayout}
      forceMobile={forceMobile}
      focused={focused}
      classNames={shadcnClassNames}
    />
  );
}
