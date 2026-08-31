#!/usr/bin/env node
/**
 * Write kit feature files that fill Chrome slots. Run from the repo root.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const KITS = [
  {
    dir: "adapter-unstyled",
    classes: true,
    expand: "unstyled",
    drawer: "FilterPanel",
    bulk: "BulkBar",
  },
  {
    dir: "adapter-antd",
    classes: false,
    expand: "antd",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
  },
  {
    dir: "adapter-chakra",
    classes: false,
    expand: "open",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
  },
  {
    dir: "adapter-mantine",
    classes: false,
    expand: "mantine",
    drawer: "FilterDrawer",
    bulk: "BulkActionBar",
  },
  {
    dir: "adapter-radix",
    classes: false,
    expand: "open",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
  },
  {
    dir: "adapter-base-ui",
    classes: false,
    expand: "open",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
  },
];

function expandRender(kit) {
  if (kit.expand === "unstyled") {
    return `function ExpandSlot(props: ExpandToggleSlotProps) {
  const classNames = useClassNames();
  return (
    <ExpandButton
      expanded={props.expanded}
      classNames={classNames}
      labels={{
        expandRow: props.expandLabel,
        collapseRow: props.collapseLabel,
      } as Required<TableLabels>}
      onToggle={() => props.onToggle(props.id)}
    />
  );
}`;
  }
  if (kit.expand === "antd") {
    return `function ExpandSlot(props: ExpandToggleSlotProps) {
  return (
    <ExpandToggle
      expanded={props.expanded}
      labels={{
        expandRow: props.expandLabel,
        collapseRow: props.collapseLabel,
      }}
      onClick={() => props.onToggle(props.id)}
    />
  );
}`;
  }
  if (kit.expand === "mantine") {
    return `function ExpandSlot(props: ExpandToggleSlotProps) {
  return (
    <ExpandToggle
      expanded={props.expanded}
      expandLabel={props.expandLabel}
      collapseLabel={props.collapseLabel}
      onToggle={() => props.onToggle(props.id)}
    />
  );
}`;
  }
  return `function ExpandSlot(props: ExpandToggleSlotProps) {
  return (
    <ExpandToggle
      open={props.expanded}
      dir={props.dir}
      labels={{
        expandRow: props.expandLabel,
        collapseRow: props.collapseLabel,
      }}
      onToggle={() => props.onToggle(props.id)}
    />
  );
}`;
}

function expandImport(kit) {
  if (kit.expand === "unstyled") {
    return `import type { TableLabels } from "@adapttable/core";
import { useClassNames } from "./components/classNamesContext";
import { ExpandButton } from "./components/ExpandToggle";`;
  }
  return `import { ExpandToggle } from "./components/ExpandToggle";`;
}

function cnImport(kit) {
  return kit.classes
    ? `import { useClassNames } from "./components/classNamesContext";\n`
    : "";
}

function wrapClassNames(kit, jsx) {
  if (!kit.classes) return jsx;
  return `(
      <ClassNamesBox>
        ${jsx}
      </ClassNamesBox>
    )`;
}

function classNamesBox(kit) {
  if (!kit.classes) return "";
  return `
function ClassNamesBox({ children }: { children: ReactNode }) {
  return children;
}

function withClassNames<P extends object>(
  Render: (props: P & { classNames: ReturnType<typeof useClassNames> }) => ReactNode
) {
  return function Slotted(props: P): ReactNode {
    return <Render {...props} classNames={useClassNames()} />;
  };
}
`;
}

function write(path, contents) {
  writeFileSync(path, contents);
  const stem = path.replace(/\.(tsx|ts)$/, "");
  const other = path.endsWith(".tsx") ? `${stem}.ts` : `${stem}.tsx`;
  if (existsSync(other) && other !== path) unlinkSync(other);
}

for (const kit of KITS) {
  const src = join(ROOT, "packages", kit.dir, "src");
  const cn = cnImport(kit);

  write(
    join(src, "editing.tsx"),
    `import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  extendFeature,
  ROW_EDIT_ACTIONS,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  batchEditing as coreBatch,
  dirtyIndicators as coreDirty,
  editHistory as coreHistory,
  editing as coreEditing,
  rowEditing as coreRowEditing,
  undoRedoButtons as coreButtons,
  type FeaturePatch,
} from "@adapttable/core/features";

import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";

function EditableSlot(props: EditableCellSlotProps<never>) {
  return (
    <EditableDataCell
      {...props}
      display={
        props.column.Cell ? (
          <props.column.Cell row={props.row} rowIndex={props.rowIndex} />
        ) : (
          props.column.accessor?.(props.row)
        )
      }
    />
  );
}

const cellChrome = [
  slotRender(EDITABLE_CELL, (props) => <EditableSlot {...props} />),
  slotRender(ROW_EDIT_ACTIONS, (props) => <RowEditActions {...props} />),
];

export function editing<TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return extendFeature(coreEditing(onCellEdit, extras), cellChrome);
}

export function rowEditing<TRow>(
  onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return extendFeature(coreRowEditing(onRowEdit, extras), cellChrome);
}

export function dirtyIndicators<TRow>(): TableFeature<TRow> {
  return extendFeature(coreDirty<TRow>(), cellChrome);
}

export function editHistory<TRow>(
  options: boolean | { depth?: number } = true
): TableFeature<TRow> {
  return extendFeature(coreHistory(options), []);
}

export function undoRedoButtons<TRow>(): TableFeature<TRow> {
  return extendFeature(coreButtons<TRow>(), []);
}

export function batchEditing<TRow>(
  onBatchEdit: Parameters<typeof coreBatch<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(coreBatch<TRow>(onBatchEdit), [
    ...cellChrome,
    slotRender(BATCH_EDIT_BAR, (props) => <BatchEditBar {...props} />),
  ]);
}
`
  );

  write(
    join(src, "grouping.tsx"),
    `import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { grouping as core, type GroupSort } from "@adapttable/core/features";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: Parameters<typeof core<TRow>>[1]
): TableFeature<TRow> {
  return extendFeature(core(groupBy, extras), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupHeaderRow {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupHeaderCard {...props} />),
  ]);
}

export type { GroupSort };
`
  );

  write(
    join(src, "tree.tsx"),
    `import {
  extendFeature,
  slotRender,
  TREE_CELL,
  TREE_TOGGLE,
  type TableFeature,
} from "@adapttable/core/adapter";
import { tree as core } from "@adapttable/core/features";

import { TreeCell, TreeToggle } from "./components/kitControls";

export function tree<TRow>(
  options: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(core(options), [
    slotRender(TREE_CELL, (props) => <TreeCell {...props} />),
    slotRender(TREE_TOGGLE, (props) => <TreeToggle {...props} />),
  ]);
}
`
  );

  write(
    join(src, "header-filters.tsx"),
    `import {
  extendFeature,
  FILTER_HEADER,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { headerFilters as core } from "@adapttable/core/features";

import { FilterHeaderTrigger } from "./components/kitControls";

export function headerFilters<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FILTER_HEADER, (props) => <FilterHeaderTrigger {...props} />),
  ]);
}
`
  );

  write(
    join(src, "row-detail.tsx"),
    `import {
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  nestedTable as coreNested,
  rowDetail as coreDetail,
  type NestedTableFor,
} from "@adapttable/core/features";
${expandImport(kit)}

${expandRender(kit)}

const expandChrome = [
  slotRender(EXPAND_TOGGLE, (props) => <ExpandSlot {...props} />),
];

export function rowDetail<TRow>(
  renderRowDetail: (row: TRow) => unknown,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return extendFeature(
    coreDetail(renderRowDetail, defaultExpandedRowIds),
    expandChrome
  );
}

export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>
): TableFeature<TRow> {
  return extendFeature(coreNested(nested), expandChrome);
}
`
  );

  write(
    join(src, "column-selection.tsx"),
    `import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnSelectionCheckbox as core } from "@adapttable/core/features";

import { ColumnSelectCheckbox } from "./components/ColumnSelectCheckbox";

export function columnSelectionCheckbox<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_SELECT, (props) => <ColumnSelectCheckbox {...props} />),
  ]);
}
`
  );

  write(
    join(src, "column-groups.tsx"),
    `import {
  COLUMN_GROUP_TOGGLE,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { collapsibleColumnGroups as core } from "@adapttable/core/features";

import { ColumnGroupToggle } from "./components/kitControls";

export function collapsibleColumnGroups<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_GROUP_TOGGLE, (props) => (
      <ColumnGroupToggle {...props} />
    )),
  ]);
}
`
  );

  write(
    join(src, "row-reorder.tsx"),
    `import {
  extendFeature,
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  RowReorderAnnouncer,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { rowReorder as core } from "@adapttable/core/features";

import { RowReorderButtons, RowReorderHandle } from "./components/kitControls";

export function rowReorder<TRow>(
  onRowReorder: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(core(onRowReorder), [
    slotRender(ROW_REORDER_HANDLE, (props) => <RowReorderHandle {...props} />),
    slotRender(ROW_REORDER_BUTTONS, (props) => (
      <RowReorderButtons {...props} />
    )),
    slotRender(ROW_REORDER_ANNOUNCER, (props) => (
      <RowReorderAnnouncer announcement={props.announcement} />
    )),
  ]);
}
`
  );

  write(
    join(src, "cell-navigation.tsx"),
    `import {
  extendFeature,
  FILL_HANDLE,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { cellNavigation as core } from "@adapttable/core/features";

import { FillHandle } from "./components/FillHandle";

export function cellNavigation<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FILL_HANDLE, (props) => <FillHandle {...props} />),
  ]);
}
`
  );

  write(
    join(src, "batch-editing.tsx"),
    `export { batchEditing } from "./editing";\n`
  );

  write(
    join(src, "nested-table.tsx"),
    `export { nestedTable } from "./row-detail";\n`
  );

  // Fix generated chrome files so hooks live in components.
  const filters = `import {
  ACTIVE_FILTER_CHIPS,
  type FilterOverlaySlotProps,
  extendFeature,
  FILTER_DRAWER,
  FILTER_POPOVER,
  FILTERS_FORM,
  type FiltersFormSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  filters as coreFilters,
  filterTypes as coreFilterTypes,
  type FilterDef,
  type FilterTypeSpec,
} from "@adapttable/core/features";
${cn}
import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { ${kit.drawer} } from "./components/${kit.drawer}";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

function FiltersForm(props: Readonly<FiltersFormSlotProps<never>>) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return (
    <div data-adapttable-part="filters-form" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <FilterTreeBuilder
        defs={props.defs}
        source={props.source}
        labels={props.labels}
        registry={props.registry}
        defaultExpanded={props.defaultExpanded}
        ${kit.classes ? "classNames={classNames}" : ""}
      />
      {props.showSimpleFields ? (
        <AutoFilterForm
          defs={props.defs}
          source={props.source}
          labels={props.labels}
          registry={props.registry}
          ${kit.classes ? "classNames={classNames}" : ""}
        />
      ) : null}
    </div>
  );
}

function ChipsSlot(props: Parameters<typeof Chips>[0]) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <Chips {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

function DrawerSlot(props: FilterOverlaySlotProps) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <${kit.drawer} {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

function PopoverSlot(props: FilterOverlaySlotProps) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return (
    <FilterPopover
      {...props}
      anchorEl={props.anchorEl ?? null}
      ${kit.classes ? "classNames={classNames}" : ""}
    />
  );
}

export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow> {
  return extendFeature(coreFilters(defs), [
    slotRender(FILTERS_FORM, (props) => <FiltersForm {...props} />),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => <ChipsSlot {...props} />),
    slotRender(FILTER_DRAWER, (props) => <DrawerSlot {...props} />),
    slotRender(FILTER_POPOVER, (props) => <PopoverSlot {...props} />),
  ]);
}

export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return coreFilterTypes(specs);
}
`;
  write(join(src, "filters.tsx"), filters);

  write(
    join(src, "column-menu.tsx"),
    `import {
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";
${cn}
import { ColumnMenu } from "./components/ColumnMenu";

function ColumnMenuSlot(props: ColumnMenuSlotProps<never>) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <ColumnMenu {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

export function columnMenu<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenuSlot {...props} />),
  ]);
}
`
  );

  write(
    join(src, "bulk-actions.tsx"),
    `import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { bulkActions as core, type BulkAction } from "@adapttable/core/features";
${cn}
import { ${kit.bulk} } from "./components/BulkActionBar";

function BulkSlot(props: Parameters<typeof ${kit.bulk}>[0]) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <${kit.bulk} {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
`
  );

  write(
    join(src, "saved-views.tsx"),
    `import {
  extendFeature,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  savedViews as core,
  type UseSavedViewsOptions,
} from "@adapttable/core/features";
${cn}
import { SavedViewsMenu } from "./components/SavedViewsMenu";

function SavedViewsSlot(props: SavedViewsSlotProps) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <SavedViewsMenu {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsSlot {...props} />),
  ]);
}
`
  );

  write(
    join(src, "status-bar.tsx"),
    `import {
  extendFeature,
  slotRender,
  STATUS_BAR,
  type StatusBarChromeProps,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  selectionStats as coreSelectionStats,
  statusBar as coreStatusBar,
} from "@adapttable/core/features";
${cn}
import { StatusBar } from "./components/StatusBar";

function StatusSlot(props: StatusBarChromeProps) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <StatusBar {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

const draws = [slotRender(STATUS_BAR, (props) => <StatusSlot {...props} />)];

export function statusBar<TRow>(): TableFeature<TRow> {
  return extendFeature(coreStatusBar<TRow>(), draws);
}

export function selectionStats<TRow>(): TableFeature<TRow> {
  return extendFeature(coreSelectionStats<TRow>(), draws);
}
`
  );

  write(
    join(src, "side-panel.tsx"),
    `import {
  extendFeature,
  SIDE_PANEL,
  type SidePanelChromeProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  sidePanel as core,
  type SidePanelOptions,
} from "@adapttable/core/features";
${cn}
import { SidePanel } from "./components/SidePanel";

function SidePanelSlot(props: SidePanelChromeProps) {
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return <SidePanel {...props}${kit.classes ? " classNames={classNames}" : ""} />;
}

export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanelSlot {...props} />),
  ]);
}
`
  );

  write(
    join(src, "command-palette.tsx"),
    `import {
  COMMAND_PALETTE_LIVE,
  extendFeature,
  slotRender,
  type TableFeature,
  useCommandPalette,
  type UseCommandPaletteOptions,
} from "@adapttable/core/adapter";
import {
  commandPalette as core,
  type CommandPaletteOptions,
} from "@adapttable/core/features";
${cn}
import { CommandPalette } from "./components/CommandPalette";

function LiveCommandPalette(props: UseCommandPaletteOptions) {
  const palette = useCommandPalette(props);
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return (
    <CommandPalette
      commands={palette.commands}
      open={palette.open}
      onClose={palette.close}
      labels={props.labels}
      ${kit.classes ? "classNames={classNames}" : ""}
    />
  );
}

export function commandPalette<TRow>(
  options: boolean | CommandPaletteOptions = true
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(COMMAND_PALETTE_LIVE, (props) => (
      <LiveCommandPalette {...props} />
    )),
  ]);
}
`
  );

  write(
    join(src, "context-menu.tsx"),
    `import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  extendFeature,
  slotRender,
  type TableFeature,
  useTableContextMenu,
} from "@adapttable/core/adapter";
import {
  contextMenu as core,
  type ContextMenuOptions,
} from "@adapttable/core/features";
import type { ReactNode } from "react";
${cn}
import { ContextMenu } from "./components/ContextMenu";

function LiveContextMenu({
  children,
  container,
  ...hookOptions
}: ContextMenuLiveSlotProps<never>): ReactNode {
  const menu = useTableContextMenu(hookOptions);
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return (
    <>
      {children(menu.regionProps)}
      <ContextMenu
        items={menu.items}
        at={menu.at}
        onClose={menu.close}
        container={container ?? undefined}
        labels={hookOptions.labels}
        ${kit.classes ? "classNames={classNames}" : ""}
      />
    </>
  );
}

export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(CONTEXT_MENU_LIVE, (props) => <LiveContextMenu {...props} />),
  ]);
}
`
  );

  write(
    join(src, "find-in-table.tsx"),
    `import {
  extendFeature,
  FIND_BAR,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { findInTable as core } from "@adapttable/core/features";

import { FindBar } from "./components/kitControls";

export function findInTable<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FIND_BAR, (props) => <FindBar {...props} />),
  ]);
}
`
  );

  const unused = [classNamesBox, wrapClassNames, readFileSync];
  void unused;
}

console.log("generated kit slot features");
