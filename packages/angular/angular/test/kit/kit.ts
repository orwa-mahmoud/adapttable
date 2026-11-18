/**
 * An Angular kit as the shared kit suites exercise it.
 *
 * Every Angular kit ships the same feature factories, drawn with its own
 * controls, and an `AdaptDataTable` with the same inputs. A kit hands the
 * suites its name, its table, its factories and how a part is found in its
 * markup; the suites assert the behaviour every kit shares, once. The
 * factory types are the reference kit's, which every kit mirrors.
 */
import type { Type } from "@angular/core";
import type { ComponentFixture } from "@angular/core/testing";

import type * as batchEditing from "../../../adapter-angular-unstyled/batch-editing/index";
import type * as bulkActionsModule from "../../../adapter-angular-unstyled/bulk-actions/index";
import type * as cellNavigation from "../../../adapter-angular-unstyled/cell-navigation/index";
import type * as cellSpanModule from "../../../adapter-angular-unstyled/cell-span/index";
import type * as columnGroupsModule from "../../../adapter-angular-unstyled/column-groups/index";
import type * as columnMenu from "../../../adapter-angular-unstyled/column-menu/index";
import type * as columnSelectionModule from "../../../adapter-angular-unstyled/column-selection/index";
import type * as commandPaletteModule from "../../../adapter-angular-unstyled/command-palette/index";
import type * as densityModule from "../../../adapter-angular-unstyled/density/index";
import type * as editing from "../../../adapter-angular-unstyled/editing/index";
import type * as exportModule from "../../../adapter-angular-unstyled/export/index";
import type * as extraRowsModule from "../../../adapter-angular-unstyled/extra-rows/index";
import type * as filters from "../../../adapter-angular-unstyled/filters/index";
import type * as findInTableModule from "../../../adapter-angular-unstyled/find-in-table/index";
import type * as fullscreenModule from "../../../adapter-angular-unstyled/fullscreen/index";
import type * as grouping from "../../../adapter-angular-unstyled/grouping/index";
import type * as groupingPanelModule from "../../../adapter-angular-unstyled/grouping-panel/index";
import type * as headerFiltersModule from "../../../adapter-angular-unstyled/header-filters/index";
import type * as multiSortModule from "../../../adapter-angular-unstyled/multi-sort/index";
import type * as nestedTable from "../../../adapter-angular-unstyled/nested-table/index";
import type * as pinnedSummaryRowsModule from "../../../adapter-angular-unstyled/pinned-summary-rows/index";
import type * as pivotTableModelModule from "../../../adapter-angular-unstyled/pivot/pivotTableModel";
import type * as printModule from "../../../adapter-angular-unstyled/print/index";
import type * as resizableColumnsModule from "../../../adapter-angular-unstyled/resizable-columns/index";
import type * as rowActions from "../../../adapter-angular-unstyled/row-actions/index";
import type * as rowAppearanceModule from "../../../adapter-angular-unstyled/row-appearance/index";
import type * as rowDetail from "../../../adapter-angular-unstyled/row-detail/index";
import type * as rowPinning from "../../../adapter-angular-unstyled/row-pinning/index";
import type * as rowReorderModule from "../../../adapter-angular-unstyled/row-reorder/index";
import type * as savedViewsModule from "../../../adapter-angular-unstyled/saved-views/index";
import type * as selectionStatsModule from "../../../adapter-angular-unstyled/selection-stats/index";
import type * as sidePanelModule from "../../../adapter-angular-unstyled/side-panel/index";
import type * as statusBarModule from "../../../adapter-angular-unstyled/status-bar/index";
import type * as treeModule from "../../../adapter-angular-unstyled/tree/index";
import type * as virtualize from "../../../adapter-angular-unstyled/virtualize/index";

/** The feature factories every Angular kit exports, by their shipped names. */
export interface AngularKitFeatures {
  readonly commandPalette: typeof commandPaletteModule.commandPalette;
  readonly dirtyIndicators: typeof editing.dirtyIndicators;
  readonly filterTypes: typeof filters.filterTypes;
  readonly selectionStats: typeof selectionStatsModule.selectionStats;
  readonly sidePanel: typeof sidePanelModule.sidePanel;
  readonly statusBar: typeof statusBarModule.statusBar;
  readonly bulkActions: typeof bulkActionsModule.bulkActions;
  readonly cellSpan: typeof cellSpanModule.cellSpan;
  readonly collapsibleColumnGroups: typeof columnGroupsModule.collapsibleColumnGroups;
  readonly columnSelectionCheckbox: typeof columnSelectionModule.columnSelectionCheckbox;
  readonly densityChooser: typeof densityModule.densityChooser;
  readonly exportCsv: typeof exportModule.exportCsv;
  readonly exportPdf: typeof exportModule.exportPdf;
  readonly exportXlsx: typeof exportModule.exportXlsx;
  readonly extraRows: typeof extraRowsModule.extraRows;
  readonly findInTable: typeof findInTableModule.findInTable;
  readonly fullscreen: typeof fullscreenModule.fullscreen;
  readonly groupingPanel: typeof groupingPanelModule.groupingPanel;
  readonly AdaptFilterHeaderControl: Type<unknown>;
  readonly AdaptFilterHeaderRow: Type<unknown>;
  readonly headerFilters: typeof headerFiltersModule.headerFilters;
  readonly multiSort: typeof multiSortModule.multiSort;
  readonly pinnedSummaryRows: typeof pinnedSummaryRowsModule.pinnedSummaryRows;
  readonly print: typeof printModule.print;
  readonly resizableColumns: typeof resizableColumnsModule.resizableColumns;
  readonly rowAppearance: typeof rowAppearanceModule.rowAppearance;
  readonly rowReorder: typeof rowReorderModule.rowReorder;
  readonly savedViews: typeof savedViewsModule.savedViews;
  readonly tree: typeof treeModule.tree;
  readonly batchEditing: typeof batchEditing.batchEditing;
  readonly cellNavigation: typeof cellNavigation.cellNavigation;
  readonly columnMenu: typeof columnMenu.columnMenu;
  readonly editHistory: typeof editing.editHistory;
  readonly editing: typeof editing.editing;
  readonly filters: typeof filters.filters;
  readonly filtersWith: typeof filters.filtersWith;
  readonly textFilterWidget: typeof filters.textFilterWidget;
  readonly rangeFilterWidget: typeof filters.rangeFilterWidget;
  readonly grouping: typeof grouping.grouping;
  readonly nestedTable: typeof nestedTable.nestedTable;
  readonly rowActions: typeof rowActions.rowActions;
  readonly rowDetail: typeof rowDetail.rowDetail;
  readonly rowEditing: typeof editing.rowEditing;
  readonly rowPinning: typeof rowPinning.rowPinning;
  readonly undoRedoButtons: typeof editing.undoRedoButtons;
  readonly virtualize: typeof virtualize.virtualize;
}

/** What a kit hands the shared suites. */
export interface AngularKitUnderTest {
  /** The kit's name, as suite titles show it. */
  readonly name: string;
  /** The kit's `AdaptDataTable` component. */
  readonly Table: Type<unknown>;
  /** The kit's feature factories. */
  readonly features: AngularKitFeatures;
  /** The selector that finds a named part in the kit's markup. */
  readonly kitSelector: (part: string) => string;
  /** The kit's own components and helpers a shared suite drives; a kit lists the ones it ships. */
  readonly components?: Partial<AngularKitComponents>;
  /**
   * Picks an option on one of the kit's own select widgets. It resolves
   * `false` for a control that is not one, which a suite then sets as a
   * native input or select.
   */
  readonly chooseOption?: (
    fixture: ComponentFixture<unknown>,
    control: Element,
    value: string
  ) => Promise<boolean>;
}

/** The kit components the shared suites can drive, by their shipped names. */
export interface AngularKitComponents {
  readonly AdaptCommandPaletteButton: Type<unknown>;
  readonly AdaptCheckboxCellEditor: Type<unknown>;
  readonly AdaptEditableCell: Type<unknown>;
  readonly AdaptNativeCellEditor: Type<unknown>;
  readonly AdaptExportButton: Type<unknown>;
  readonly AdaptPrintButton: Type<unknown>;
  readonly AdaptAutoFilterForm: Type<unknown>;
  readonly AdaptFilterPopover: Type<unknown>;
  readonly AdaptGroupingPanel: Type<unknown>;
  readonly AdaptPivotPanel: Type<unknown>;
  readonly AdaptSavedViewsPanel: Type<unknown>;
  readonly AdaptSidePanelFrame: Type<unknown>;
  readonly AdaptStatusBarLive: Type<unknown>;
  readonly AdaptTableSkeleton: Type<unknown>;
  readonly pivotTableModel: typeof pivotTableModelModule.pivotTableModel;
}

/**
 * One of a kit's own components, for a suite that drives it. A suite runs
 * only in kits that ship it; a kit that does not list it fails here, naming
 * the kit and the component.
 *
 * @param kit - The kit under test.
 * @param name - The component's shipped name.
 * @returns The kit's component.
 */
export function kitComponent<TName extends keyof AngularKitComponents>(
  kit: AngularKitUnderTest,
  name: TName
): AngularKitComponents[TName] {
  const component = kit.components?.[name];
  if (component === undefined) {
    throw new Error(
      `The ${kit.name} kit does not list ${name} in its test components.`
    );
  }
  return component;
}

/**
 * The selector for a part by its `data-adapttable-part` name.
 *
 * @param part - The `data-adapttable-part` name.
 * @returns The selector.
 */
export function partSelector(part: string): string {
  return `[data-adapttable-part="${part}"]`;
}

/**
 * A selector for a kit that also names some parts under its own attribute
 * (`data-<prefix>-part`): it finds a part under either name.
 *
 * @param prefix - The kit's attribute prefix, such as `taiga`.
 * @returns The kit's selector.
 */
export function kitPartSelector(prefix: string): (part: string) => string {
  return (part) =>
    `:is([data-adapttable-part="${part}"], [data-${prefix}-part="${part}"])`;
}

/**
 * Whether a kit's checkbox is checked: a native input reports `checked`, a
 * `role="checkbox"` control reports `aria-checked`.
 *
 * @param box - The kit's checkbox element.
 * @returns Whether it is checked.
 */
export function isChecked(box: Element): boolean {
  return box instanceof HTMLInputElement
    ? box.checked
    : box.getAttribute("aria-checked") === "true";
}
