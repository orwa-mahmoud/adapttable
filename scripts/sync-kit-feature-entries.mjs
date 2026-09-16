#!/usr/bin/env node
/**
 * Create the classified kit subpaths and package exports for every
 * published adapter. Run from the repo root.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SUBPATHS = [
  "row-reorder",
  "row-pinning",
  "pinned-summary-rows",
  "cell-span",
  "extra-rows",
  "row-appearance",
  "row-detail",
  "nested-table",
  "editing",
  "grouping",
  "tree",
  "virtualize",
  "column-menu",
  "resizable-columns",
  "column-groups",
  "export",
  "cell-navigation",
  "find-in-table",
  "fullscreen",
  "command-palette",
  "context-menu",
  "side-panel",
  "bulk-actions",
  "filters",
  "header-filters",
  "saved-views",
  "selection-stats",
  "density",
  "print",
  "status-bar",
  "multi-sort",
  "fit-columns",
  "row-actions",
  "column-selection",
];

const HEADLESS = {
  "cell-span": "cellSpan",
  "extra-rows": "extraRows",
  "row-appearance": "rowAppearance",
  "resizable-columns": "resizableColumns",
  "multi-sort": "multiSort",
  "fit-columns": "fitColumns",
  "row-actions": "rowActions",
  "row-pinning": "rowPinning",
  "pinned-summary-rows": "pinnedSummaryRows",
  virtualize: "virtualize",
};

const KITS = [
  {
    dir: "adapter-unstyled",
    drawer: "FilterPanel",
    bulk: "BulkBar",
    classes: true,
  },
  {
    dir: "adapter-antd",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
    classes: false,
  },
  {
    dir: "adapter-chakra",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
    classes: false,
  },
  {
    dir: "adapter-mantine",
    drawer: "FilterDrawer",
    bulk: "BulkActionBar",
    classes: false,
  },
  {
    dir: "adapter-radix",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
    classes: false,
  },
  {
    dir: "adapter-base-ui",
    drawer: "FilterDrawer",
    bulk: "BulkBar",
    classes: false,
  },
];

function ensureExports(pkgPath) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.exports ??= {};
  for (const subpath of SUBPATHS) {
    if (!pkg.exports[`./${subpath}`]) {
      pkg.exports[`./${subpath}`] = {
        import: {
          types: `./dist/${subpath}.d.ts`,
          default: `./dist/${subpath}.js`,
        },
        require: {
          types: `./dist/${subpath}.d.cts`,
          default: `./dist/${subpath}.cjs`,
        },
      };
    }
  }
  const ordered = {};
  for (const key of [".", "./features", ...SUBPATHS.map((s) => `./${s}`)]) {
    if (pkg.exports[key]) ordered[key] = pkg.exports[key];
  }
  for (const [key, value] of Object.entries(pkg.exports)) {
    if (!(key in ordered)) ordered[key] = value;
  }
  pkg.exports = ordered;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function ensureTsdown(configPath, files) {
  let text = readFileSync(configPath, "utf8");
  const match = text.match(/entry:\s*\[([\s\S]*?)\]/);
  if (!match) throw new Error(`no entry array in ${configPath}`);
  const have = new Set([...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const extra = files.filter((file) => !have.has(file));
  if (extra.length === 0) return;
  const insert = extra.map((file) => `    "${file}",`).join("\n");
  text = text.replace(/entry:\s*\[/, `entry: [\n${insert}\n    `);
  writeFileSync(configPath, text);
}

function writeIfMissing(path, contents) {
  if (existsSync(path)) return;
  writeFileSync(path, contents);
}

function headlessFile(name) {
  return `export { ${name} } from "@adapttable/core/features";\n`;
}

function kitFiles(kit) {
  const cn = kit.classes ? "\n        classNames={useClassNames()}" : "";
  const cnImport = kit.classes
    ? `import { useClassNames } from "./components/classNamesContext";\n`
    : "";

  return {
    "filters.tsx": `import {
  ACTIVE_FILTER_CHIPS,
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
${cnImport}
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

export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow> {
  return extendFeature(coreFilters(defs), [
    slotRender(FILTERS_FORM, (props) => <FiltersForm {...props} />),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => (
      <Chips {...props}${cn} />
    )),
    slotRender(FILTER_DRAWER, (props) => (
      <${kit.drawer} {...props}${cn} />
    )),
    slotRender(FILTER_POPOVER, (props) => (
      <FilterPopover {...props} anchorEl={props.anchorEl ?? null}${cn} />
    )),
  ]);
}

export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return coreFilterTypes(specs);
}
`,
    "command-palette.tsx": `import {
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
${cnImport}
import { CommandPalette } from "./components/CommandPalette";

function LiveCommandPalette(props: UseCommandPaletteOptions) {
  const palette = useCommandPalette(props);
${kit.classes ? "  const classNames = useClassNames();\n" : ""}  return (
    <CommandPalette
      commands={palette.commands}
      open={palette.open}
      onClose={palette.close}
      labels={props.labels}${cn}
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
`,
    "context-menu.tsx": `import {
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
${cnImport}
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
        labels={hookOptions.labels}${cn}
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
`,
    "column-menu.tsx": `import {
  COLUMN_MENU,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";
${cnImport}
import { ColumnMenu } from "./components/ColumnMenu";

export function columnMenu<TRow>(): TableFeature<TRow> {
${kit.classes ? "  useClassNames;\n" : ""}  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenu {...props}${cn} />),
  ]);
}
`,
    "bulk-actions.tsx": `import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { bulkActions as core, type BulkAction } from "@adapttable/core/features";
${cnImport}
import { ${kit.bulk} } from "./components/BulkActionBar";

export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(actions), [
    slotRender(BULK_BAR, (props) => <${kit.bulk} {...props}${cn} />),
  ]);
}
`,
    "saved-views.tsx": `import {
  extendFeature,
  SAVED_VIEWS,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  savedViews as core,
  type UseSavedViewsOptions,
} from "@adapttable/core/features";
${cnImport}
import { SavedViewsMenu } from "./components/SavedViewsMenu";

export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SAVED_VIEWS, (props) => (
      <SavedViewsMenu {...props}${cn} />
    )),
  ]);
}
`,
    "status-bar.tsx": `import {
  extendFeature,
  slotRender,
  STATUS_BAR,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  selectionStats as coreSelectionStats,
  statusBar as coreStatusBar,
} from "@adapttable/core/features";
${cnImport}
import { StatusBar } from "./components/StatusBar";

const draws = [
  slotRender(STATUS_BAR, (props) => <StatusBar {...props}${cn} />),
];

export function statusBar<TRow>(): TableFeature<TRow> {
  return extendFeature(coreStatusBar<TRow>(), draws);
}

export function selectionStats<TRow>(): TableFeature<TRow> {
  return extendFeature(coreSelectionStats<TRow>(), draws);
}
`,
    "side-panel.tsx": `import {
  extendFeature,
  SIDE_PANEL,
  SidePanelLayout,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  sidePanel as core,
  type SidePanelOptions,
} from "@adapttable/core/features";
${cnImport}
import { SidePanel } from "./components/SidePanel";

export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanel {...props}${cn} />),
  ]);
}

export { SidePanelLayout };
`,
    "find-in-table.tsx": `import {
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
`,
    "selection-stats.ts": `export { selectionStats } from "./status-bar";\n`,
  };
}

for (const kit of KITS) {
  const src = join(ROOT, "packages", kit.dir, "src");
  for (const [file, name] of Object.entries(HEADLESS)) {
    const ts = join(src, `${file}.ts`);
    const tsx = join(src, `${file}.tsx`);
    if (!existsSync(ts) && !existsSync(tsx)) {
      writeFileSync(ts, headlessFile(name));
    }
  }
  for (const [file, contents] of Object.entries(kitFiles(kit))) {
    const path = join(src, file);
    const stem = file.replace(/\.(tsx|ts)$/, "");
    const other = file.endsWith(".tsx")
      ? join(src, `${stem}.ts`)
      : join(src, `${stem}.tsx`);
    writeFileSync(path, contents);
    if (existsSync(other) && other !== path) unlinkSync(other);
  }

  writeIfMissing(
    join(src, "components", "DisplayCell.tsx"),
    `import type { ColumnDef } from "@adapttable/core";
import type { ReactNode } from "react";

export function DisplayCell<TRow>({
  column,
  row,
  rowIndex,
}: {
  readonly column: ColumnDef<TRow>;
  readonly row: TRow;
  readonly rowIndex: number;
}): ReactNode {
  return column.Cell ? (
    <column.Cell row={row} rowIndex={rowIndex} />
  ) : (
    column.accessor?.(row)
  );
}
`
  );

  ensureExports(join(ROOT, "packages", kit.dir, "package.json"));

  const entries = [];
  for (const subpath of SUBPATHS) {
    for (const ext of [".tsx", ".ts"]) {
      const file = `src/${subpath}${ext}`;
      if (existsSync(join(ROOT, "packages", kit.dir, file))) {
        entries.push(file);
        break;
      }
    }
  }
  ensureTsdown(join(ROOT, "packages", kit.dir, "tsdown.config.ts"), entries);
}

const shadcnPkg = join(ROOT, "packages", "adapter-shadcn", "package.json");
ensureExports(shadcnPkg);
const shadcnSrc = join(ROOT, "packages", "adapter-shadcn", "src");
for (const subpath of SUBPATHS) {
  const ts = join(shadcnSrc, `${subpath}.ts`);
  if (!existsSync(ts) && !existsSync(join(shadcnSrc, `${subpath}.tsx`))) {
    writeFileSync(ts, `export * from "@adapttable/unstyled/${subpath}";\n`);
  }
}
const shadcnEntries = SUBPATHS.filter((subpath) =>
  existsSync(join(shadcnSrc, `${subpath}.ts`))
).map((subpath) => `src/${subpath}.ts`);
ensureTsdown(
  join(ROOT, "packages", "adapter-shadcn", "tsdown.config.ts"),
  shadcnEntries
);

const muiSrc = join(ROOT, "packages", "adapter-mui", "src");
for (const [file, name] of Object.entries(HEADLESS)) {
  const ts = join(muiSrc, `${file}.ts`);
  const tsx = join(muiSrc, `${file}.tsx`);
  if (!existsSync(ts) && !existsSync(tsx)) {
    writeFileSync(ts, headlessFile(name));
  }
}
if (!existsSync(join(muiSrc, "selection-stats.ts"))) {
  writeFileSync(
    join(muiSrc, "selection-stats.ts"),
    `export { selectionStats } from "./status-bar";\n`
  );
}
if (!existsSync(join(muiSrc, "row-actions.ts"))) {
  writeFileSync(join(muiSrc, "row-actions.ts"), headlessFile("rowActions"));
}
ensureExports(join(ROOT, "packages", "adapter-mui", "package.json"));
const muiEntries = [];
for (const subpath of SUBPATHS) {
  for (const ext of [".tsx", ".ts"]) {
    const file = `src/${subpath}${ext}`;
    if (existsSync(join(ROOT, "packages", "adapter-mui", file))) {
      muiEntries.push(file);
      break;
    }
  }
}
ensureTsdown(
  join(ROOT, "packages", "adapter-mui", "tsdown.config.ts"),
  muiEntries
);

console.log("synced kit feature entries");
