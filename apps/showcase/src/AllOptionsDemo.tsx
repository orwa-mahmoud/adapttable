import type { ColumnDef, SidePanelEntry } from "@adapttable/core";
import { usePrefersReducedMotion, useSavedViews } from "@adapttable/core";
import { buildFormulaColumns } from "@adapttable/core/formula";
import {
  isPivotReady,
  type PivotConfig,
  usePivotUrlState,
} from "@adapttable/core/pivot";
import { getLabels } from "@adapttable/i18n";
import { type DataTableProps, FilterDrawer } from "@adapttable/mantine";
import { MantineProvider } from "@mantine/core";
import {
  type ReactNode,
  startTransition,
  Suspense,
  useCallback,
  useId,
  useState,
} from "react";

import { cssVars } from "./cssVars";
import {
  demoSavedViews,
  LARGE_ROW_COUNT,
  LARGE_TEAM_COUNT,
  type Locale,
  type Person,
  PIVOT_FIELDS,
  PIVOT_PEOPLE,
} from "./data";
import {
  AdvancedFiltersProvider,
  type DataMode,
  type Density,
  type Failure,
  type FiltersUi,
} from "./Demo";
import { DemoFilterSetProvider } from "./demoFilters";
import {
  ADAPTERS,
  Control,
  ControlPanel,
  DemoFallback,
  KitSwitcher,
  Segmented,
} from "./kitDemos";
import { kitPivotPanel, KitProvider, kitSavedViewsPanel } from "./kitProviders";
import { LabCellFlash } from "./labCellFlash";
import { PivotTableView } from "./PivotTableView";
import { SectionHead } from "./sections";
import { ADAPTER_TOKENS } from "./themeTokens";

type OnOff = "on" | "off";
type Structure = "flat" | "grouped" | "tree" | "nested";
type EditingMode = "off" | "cell" | "row" | "batch";
type Recipe = "baseline" | "filters" | "structure" | "editing" | "rows";

const FEATURE_LAB_DRAWER_LABELS = {
  ...getLabels("en"),
  filters: "Configure Feature Lab",
  clearAll: "Reset",
  filtersDone: "Done",
  cancel: "Close options",
};

const RECIPES: readonly {
  key: Recipe;
  label: string;
  description: string;
}[] = [
  {
    key: "baseline",
    label: "Baseline",
    description: "Plain frontend table with the full toolbar.",
  },
  {
    key: "filters",
    label: "Filters",
    description: "Checklist, operators, facets, and the AND/OR builder.",
  },
  {
    key: "structure",
    label: "Structure",
    description: "Nested row groups and collapsible column groups.",
  },
  {
    key: "editing",
    label: "Editing",
    description: "Cell editor, selection, fill, undo, and conflicts.",
  },
  {
    key: "rows",
    label: "Rows",
    description: "Add, delete, reorder, pin, span, and decorate rows.",
  },
];

/**
 * The Lab's docked pivot builder.
 *
 * `sidePanel` takes content, not a feature flag, and this is the content the
 * docked panel exists for: setting a table up is iterative — change an axis,
 * look at the numbers, change another — which a popover cannot do because it
 * closes when you look away. The panel is the kit's own, so switching the Lab's
 * kit switches the builder with the table.
 */
function LabPivotPanel({
  kit,
  config,
  onChange,
}: Readonly<{
  kit: string;
  config: PivotConfig;
  onChange: (next: PivotConfig) => void;
}>) {
  const Panel = kitPivotPanel(kit);
  return (
    <Suspense fallback={null}>
      <Panel
        fields={PIVOT_FIELDS}
        config={config}
        onChange={onChange}
        labels={getLabels("en")}
      />
    </Suspense>
  );
}

/**
 * The Lab's docked saved views — the same store the toolbar's Views menu
 * reads, so a view saved there is a view this manages.
 */
function LabSavedViewsPanel({ kit }: Readonly<{ kit: string }>) {
  const Panel = kitSavedViewsPanel(kit);
  const views = useSavedViews(demoSavedViews("lab"));
  return (
    <Suspense fallback={null}>
      <Panel
        views={views.views}
        onApply={views.apply}
        onRename={views.rename}
        onMove={views.move}
        onSetDefault={views.setDefault}
        onRemove={views.remove}
        labels={getLabels("en")}
      />
    </Suspense>
  );
}

/**
 * What the Lab docks beside its rows: the pivot builder, the saved views, and
 * a note about the panel's own keyboard.
 *
 * Two of the three are real components from the kit in use — the panel is a
 * place to put a table's controls, so a demo of it that renders prose about
 * what could go there demonstrates nothing.
 */
function labPanels(
  kit: string,
  config: PivotConfig,
  onConfigChange: (next: PivotConfig) => void
): readonly SidePanelEntry[] {
  return [
    {
      key: "pivot",
      label: "Pivot",
      content: (
        <LabPivotPanel kit={kit} config={config} onChange={onConfigChange} />
      ),
    },
    {
      key: "views",
      label: "Views",
      content: <LabSavedViewsPanel kit={kit} />,
    },
    {
      key: "keys",
      label: "Keyboard",
      content: (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          Arrow keys move between tabs and wrap at the ends, Home and End jump
          to them, and Escape closes the panel from anywhere inside it.
        </p>
      ),
    },
  ];
}

/**
 * The Lab's formula column, built once.
 *
 * It reads `team` and `role` — fields every row carries on both tiers — so the
 * toggle holds in every combination the Lab can reach, the server path
 * included. Typing your own formula belongs on the /formulas/ page; here the
 * point is that a computed column composes with grouping, editing, pinning and
 * the rest rather than standing apart from them.
 */
const LAB_FORMULA_COLUMNS = buildFormulaColumns<Person>([
  { key: "tag", header: "Tag", formula: '=UPPER(team) & " · " & role' },
]).columns;

/** The Lab's formula columns while the toggle is on, and none while it is off. */
function labFormulaColumns(
  toggle: OnOff
): readonly ColumnDef<Person>[] | undefined {
  return toggle === "on" ? LAB_FORMULA_COLUMNS : undefined;
}

/**
 * What Print prints.
 *
 * `printTable` opens a browser dialog, which is why it is the host's to call —
 * the table offers the entry and this decides what it prints. Wired
 * unconditionally: the palette lists it when the palette is on, the toolbar
 * draws a button when `printButton` is on, and neither is the other's gate.
 */
function printLabTable(): void {
  window.print();
}

function Toggle({
  label,
  value,
  disabledOn,
  onChange,
}: Readonly<{
  label: string;
  value: OnOff;
  disabledOn?: string;
  onChange: (value: OnOff) => void;
}>) {
  return (
    <Control label={label}>
      <Segmented
        label={label.toLowerCase()}
        value={value}
        onChange={onChange}
        options={[
          { value: "off", label: "Off" },
          {
            value: "on",
            label: "On",
            disabled: Boolean(disabledOn),
            title: disabledOn,
          },
        ]}
      />
    </Control>
  );
}

/**
 * Why a change-mark toggle is unavailable, or `undefined` when it is not:
 * the mark lands on the row or cells a change touched, so with nothing
 * changing there is nothing to see.
 */
function flashReasonFor(
  editingMode: EditingMode,
  rowMutations: OnOff,
  mark: "highlight" | "flash"
): string | undefined {
  if (editingMode !== "off" || rowMutations !== "off") return undefined;
  return mark === "flash"
    ? "Turn on editing or row mutations first — the flash marks the cells a change landed on."
    : "Turn on editing or row mutations first — the highlight marks the row a change landed on.";
}

function changeMarkReasons(
  editingMode: EditingMode,
  rowMutations: OnOff,
  reducedMotion: boolean
): { highlight: string | undefined; cellFlash: string | undefined } {
  return {
    highlight: flashReasonFor(editingMode, rowMutations, "highlight"),
    cellFlash: reducedMotion
      ? "Reduced motion is on — changed-cell flash does not run."
      : flashReasonFor(editingMode, rowMutations, "flash"),
  };
}

/** What the summary line calls each data source. */
const MODE_SUMMARY: Record<DataMode, string> = {
  frontend: "frontend",
  backend: "backend",
  large: `${LARGE_ROW_COUNT.toLocaleString("en")} frontend rows`,
};

/** What the summary line calls the current interaction. */
function interactionSummaryOf(
  editingMode: EditingMode,
  rowFeatures: number
): string {
  if (editingMode !== "off") return `${editingMode} editing`;
  if (rowFeatures > 0) return `${String(rowFeatures)} row features`;
  return "read only";
}

/** What the summary line calls the current row shape. */
function rowsSummaryOf(pivoted: boolean, structure: Structure): string {
  return pivoted ? "pivoted by the panel" : `${structure} rows`;
}

/** The note under the summary when two options cannot both apply. */
function compatibilityNoteFor(
  mode: DataMode,
  clientOnly: boolean,
  structured: boolean
): ReactNode {
  if (mode === "large") {
    return (
      <small>
        Large data loads {LARGE_ROW_COUNT.toLocaleString("en")} generated rows
        over {String(LARGE_TEAM_COUNT)} teams — a hundred at a time through
        infinite scroll, windowed, so the DOM holds a viewport and the team
        checklist windows its options too. The demo owns its rows and rewrites
        the whole list on every write, so the controls that write are disabled,
        and grouping the whole set into subtotals is disabled with it.
      </small>
    );
  }
  if (clientOnly) {
    return (
      <small>
        Backend mode keeps server query, filters, paging, and column state
        active. Client-only row features are disabled.
      </small>
    );
  }
  if (structured) {
    return (
      <small>
        Reorder and pin are disabled because grouped/tree rows do not have one
        stable flat row index.
      </small>
    );
  }
  return null;
}

/** The Lab's pivot state: what the docked builder edits, and the folds. */
function useLabPivot() {
  const { config, onConfigChange, collapsed, onCollapsedChange } =
    usePivotUrlState({ urlKey: "lab", urlSync: false });
  const onToggleFold = (key: string) => {
    const next = new Set(collapsed);
    if (!next.delete(key)) next.add(key);
    onCollapsedChange(next);
  };
  return {
    config,
    collapsed,
    onConfigChange,
    onToggleFold,
    ready: isPivotReady(config),
  };
}

/**
 * The Lab's rows: the pivot the docked builder configured, or the table itself.
 *
 * The panel travels with whichever one is showing — it is what pivoted the
 * table, so a pivot that hid its own builder would be a table with no way back.
 */
function LabRows({
  pivot,
  pivoted,
  kit,
  dark,
  sidePanel,
  children,
}: Readonly<{
  pivot: ReturnType<typeof useLabPivot>;
  pivoted: boolean;
  kit: string;
  dark: boolean;
  sidePanel: DataTableProps<Person>["sidePanel"];
  children: ReactNode;
}>) {
  if (!pivoted) return <>{children}</>;
  return (
    <KitProvider kit={kit} dark={dark}>
      <PivotTableView
        kit={kit}
        rows={PIVOT_PEOPLE}
        fields={PIVOT_FIELDS}
        config={pivot.config}
        collapsed={pivot.collapsed}
        onToggleFold={pivot.onToggleFold}
        sidePanel={sidePanel}
      />
    </KitProvider>
  );
}

export function AllOptionsDemo({ dark }: Readonly<{ dark: boolean }>) {
  const [adapter, setAdapter] = useState("mantine");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>("baseline");
  const [filterSet, setFilterSet] = useState<"live" | "kitchen">("live");
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [mode, setMode] = useState<DataMode>("frontend");
  const [locale, setLocale] = useState<Locale>("en");
  const [density, setDensity] = useState<Density>("comfortable");
  const [filtersUi, setFiltersUi] = useState<FiltersUi>("popover");
  const [motion, setMotion] = useState<OnOff>("on");
  const [structure, setStructure] = useState<Structure>("flat");
  const [columnGroups, setColumnGroups] = useState<OnOff>("off");
  const [sparkline, setSparkline] = useState<OnOff>("off");
  const [formulaColumn, setFormulaColumn] = useState<OnOff>("off");
  const [editorShowcase, setEditorShowcase] = useState<OnOff>("off");
  const [statusBar, setStatusBar] = useState<OnOff>("off");
  const [undoRedo, setUndoRedo] = useState<OnOff>("off");
  const [settingsPanel, setSettingsPanel] = useState<OnOff>("off");
  const [openPanel, setOpenPanel] = useState<string | null>("pivot");
  const [contextMenu, setContextMenu] = useState<OnOff>("off");
  const [palette, setPalette] = useState<OnOff>("off");
  const [printButton, setPrintButton] = useState<OnOff>("off");
  const [columnSelect, setColumnSelect] = useState<OnOff>("off");
  const [chrome, setChrome] = useState<OnOff>("off");
  const [highlight, setHighlight] = useState<OnOff>("off");
  const [cellFlash, setCellFlash] = useState<OnOff>("off");
  const reducedMotion = usePrefersReducedMotion();
  const [failure, setFailure] = useState<Failure>("off");
  const [editingMode, setEditingMode] = useState<EditingMode>("off");
  const [rowMutations, setRowMutations] = useState<OnOff>("off");
  const [rowReorder, setRowReorder] = useState<OnOff>("off");
  const [rowPinning, setRowPinning] = useState<OnOff>("off");
  const [cellSpan, setCellSpan] = useState<OnOff>("off");
  const [extraRows, setExtraRows] = useState<OnOff>("off");
  const [rowStyle, setRowStyle] = useState<OnOff>("off");

  // The pivot the docked builder edits. It travels in the URL with the rest of
  // the Lab's table state, and a saved view captures the same parameter.
  const pivot = useLabPivot();

  const token =
    ADAPTER_TOKENS.find((candidate) => candidate.key === adapter) ??
    ADAPTER_TOKENS[0];
  const accent = dark ? token.accentDark : token.accentLight;
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  /**
   * The panel drives the table it is docked in: put a field on Rows and a
   * measure in the cells and the Lab's rows become that pivot. Guarded by the
   * side-panel toggle like every Lab control — a pivot the reader cannot reach
   * the builder for would be a table with no way back.
   */
  const panelOn = settingsPanel === "on";
  const pivoted = panelOn && pivot.ready;
  const sidePanel = panelOn
    ? {
        panels: labPanels(adapter, pivot.config, pivot.onConfigChange),
        open: openPanel,
        onOpenChange: setOpenPanel,
      }
    : undefined;
  const clientOnlyReason =
    mode === "backend"
      ? "This control needs the complete frontend row set."
      : undefined;
  // Every write in this demo rebuilds the whole array — the honest shape for
  // thirty rows, and the reason a control that writes is off over forty
  // thousand. An app would patch one row; the demo is not pretending to.
  const wholeSetWriteReason =
    mode === "large"
      ? `A write here rewrites all ${LARGE_ROW_COUNT.toLocaleString("en")} rows — the demo owns the list, and at this size that is not a demo of anything.`
      : undefined;
  // The org chart is derived from the seed: the first person on each of the
  // five teams leads it. The generated directory shares no ids with that map,
  // so every row would come back parentless.
  const treeReason =
    clientOnlyReason ??
    (mode === "large"
      ? "The org chart is declared from the thirty-row seed, so the generated rows have no parent to point at."
      : undefined);
  // The Lab groups by team then status. Over the generated directory that is
  // 480 groups, each with a subtotal read from its whole subtree, built from
  // the full set before a single row can paint — and the page stops answering.
  const groupedReason =
    clientOnlyReason ??
    (mode === "large"
      ? "Grouping by team and status over the full set is 480 subtotal groups, and building them locks the page at this size."
      : undefined);
  const editingReason = clientOnlyReason ?? wholeSetWriteReason;
  // Column selection is part of cell navigation, which this page arms with an
  // editing mode — so the checkbox has nothing to select into until one is on.
  const columnSelectReason =
    editingMode === "off"
      ? "Turn on an editing mode first — the checkbox selects into the cell grid."
      : undefined;
  const { highlight: highlightReason, cellFlash: cellFlashReason } =
    changeMarkReasons(editingMode, rowMutations, reducedMotion);
  // The retry the error state offers has to do something, or the demo is
  // showing a button that lies.
  const recoverFromFailure = useCallback(() => {
    setFailure("off");
  }, []);
  const structured = structure === "grouped" || structure === "tree";
  const reorderReason =
    clientOnlyReason ??
    wholeSetWriteReason ??
    (structured
      ? "Row reorder is unavailable while grouped or tree rows are active."
      : undefined);
  const pinReason =
    clientOnlyReason ??
    (structured
      ? "Row pinning is unavailable while grouped or tree rows are active."
      : undefined);
  const enabledRowFeatures = [
    rowMutations,
    rowReorder,
    rowPinning,
    cellSpan,
    extraRows,
    rowStyle,
  ].filter((value) => value === "on").length;
  const optionsHeadingId = useId();
  const interactionSummary = interactionSummaryOf(
    editingMode,
    enabledRowFeatures
  );
  const rowsSummary = rowsSummaryOf(pivoted, structure);
  const configSummary = `${
    RECIPES.find((item) => item.key === recipe)?.label ?? "Custom"
  }: ${MODE_SUMMARY[mode]}, ${filtersUi} filters, ${rowsSummary}, ${interactionSummary}`;
  const compatibilityNote = compatibilityNoteFor(
    mode,
    Boolean(clientOnlyReason),
    structured
  );

  const resetRows = () => {
    setRowMutations("off");
    setRowReorder("off");
    setRowPinning("off");
    setCellSpan("off");
    setExtraRows("off");
    setRowStyle("off");
  };

  const customize = <T,>(setter: (value: T) => void, value: T) => {
    startTransition(() => {
      setRecipe(null);
      setter(value);
    });
  };

  const applyRecipe = (next: Recipe) => {
    startTransition(() => {
      setRecipe(next);
      setMode("frontend");
      setFilterSet(next === "filters" ? "kitchen" : "live");
      setAdvancedFilters(next === "filters");
      setFiltersUi("popover");
      setDensity("comfortable");
      setMotion("on");
      setStructure(next === "structure" ? "grouped" : "flat");
      setColumnGroups(next === "structure" ? "on" : "off");
      setSparkline("off");
      setFormulaColumn("off");
      setEditorShowcase("off");
      setEditingMode(next === "editing" ? "cell" : "off");
      setHighlight("off");
      setCellFlash("off");
      resetRows();
      if (next === "rows") {
        setRowMutations("on");
        setRowReorder("on");
        setRowPinning("on");
        setCellSpan("on");
        setExtraRows("on");
        setRowStyle("on");
      }
    });
  };

  const resetOptions = () => {
    applyRecipe("baseline");
    setLocale("en");
  };

  const changeMode = (next: DataMode) => {
    startTransition(() => {
      setRecipe(null);
      setMode(next);
      if (next === "backend") {
        setStructure("flat");
        setEditingMode("off");
        resetRows();
      }
      if (next === "large") {
        // The checklist comes with the rows. A hundred and twenty teams is
        // what the windowed list exists for, and a `select` over them would
        // be the wrong control shown at the one size that proves the point.
        setFilterSet("kitchen");
        if (structure !== "flat" && structure !== "nested") {
          setStructure("flat");
        }
        setEditingMode("off");
        setRowMutations("off");
        setRowReorder("off");
      }
    });
  };

  const changeStructure = (next: Structure) => {
    startTransition(() => {
      setRecipe(null);
      setStructure(next);
      if (next === "grouped" || next === "tree") {
        setRowReorder("off");
        setRowPinning("off");
      }
    });
  };

  return (
    <section className="sec shell" id="demo">
      <SectionHead title="Feature Lab. Build a valid table configuration.">
        Start from a working recipe, switch kits, then tune the exact props.
        Incompatible controls explain why they are unavailable instead of
        appearing to work while the table silently ignores them.
      </SectionHead>

      <div className="lab-recipes" role="group" aria-label="Feature recipes">
        {RECIPES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`lab-recipe${recipe === item.key ? " is-on" : ""}`}
            aria-pressed={recipe === item.key}
            onClick={() => applyRecipe(item.key)}
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </div>

      <KitSwitcher adapter={adapter} dark={dark} onChange={setAdapter} />

      <div
        className="lab-toolbar"
        role="group"
        aria-labelledby={optionsHeadingId}
      >
        <div>
          <strong id={optionsHeadingId}>Table options</strong>
          <span>Configure data, filters, structure, editing, and rows.</span>
        </div>
        <button
          type="button"
          className="lab-config-trigger"
          aria-haspopup="dialog"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen(true)}
        >
          Configure options
        </button>
      </div>

      <div className="lab-layout">
        <MantineProvider forceColorScheme={dark ? "dark" : "light"}>
          <FilterDrawer
            opened={controlsOpen}
            onClose={() => setControlsOpen(false)}
            filters={
              <>
                <p className="lab-options-drawer__intro">
                  Only compatible combinations can be enabled.
                </p>
                {/* The configuration summary is a live region, and a live
                    region the reader has been moved away from announces
                    nothing useful — so while the drawer holds focus it lives
                    in here, beside the controls that change it. */}
                <div className="visually-hidden" role="status">
                  {configSummary}
                </div>
                <aside
                  className="opt-board lab-options-drawer__controls"
                  aria-label="Feature Lab controls"
                >
                  <ControlPanel title="Data and chrome">
                    <Control label="Data">
                      <Segmented
                        label="data source"
                        value={mode}
                        onChange={changeMode}
                        options={[
                          { value: "frontend", label: "Frontend" },
                          { value: "backend", label: "Backend" },
                          { value: "large", label: "Large data" },
                        ]}
                      />
                    </Control>
                    <Control label="Locale">
                      <Segmented
                        label="locale"
                        value={locale}
                        onChange={(next) => customize(setLocale, next)}
                        options={[
                          { value: "en", label: "EN" },
                          { value: "ar", label: "العربية" },
                        ]}
                      />
                    </Control>
                    <Control label="Filter UI">
                      <Segmented
                        label="filters container"
                        value={filtersUi}
                        onChange={(next) => customize(setFiltersUi, next)}
                        options={[
                          { value: "popover", label: "Popover" },
                          { value: "drawer", label: "Drawer" },
                          { value: "header", label: "Header" },
                        ]}
                      />
                    </Control>
                    <Control label="Density">
                      <Segmented
                        label="density"
                        value={density}
                        onChange={(next) => customize(setDensity, next)}
                        options={[
                          { value: "comfortable", label: "Comfortable" },
                          { value: "compact", label: "Compact" },
                        ]}
                      />
                    </Control>
                    <Toggle
                      label="Motion"
                      value={motion}
                      onChange={(next) => customize(setMotion, next)}
                    />
                  </ControlPanel>

                  <ControlPanel title="Structure">
                    <Control label="Row structure">
                      <Segmented
                        label="row structure"
                        value={structure}
                        onChange={changeStructure}
                        options={[
                          { value: "flat", label: "Flat" },
                          {
                            value: "grouped",
                            label: "Grouped",
                            disabled: Boolean(groupedReason),
                            title: groupedReason,
                          },
                          {
                            value: "tree",
                            label: "Tree",
                            disabled: Boolean(treeReason),
                            title: treeReason,
                          },
                          {
                            value: "nested",
                            label: "Detail",
                            disabled: Boolean(clientOnlyReason),
                            title: clientOnlyReason,
                          },
                        ]}
                      />
                    </Control>
                    <Toggle
                      label="Column groups"
                      value={columnGroups}
                      onChange={(next) => customize(setColumnGroups, next)}
                    />
                    <Toggle
                      label="Sparkline column"
                      value={sparkline}
                      onChange={(next) => customize(setSparkline, next)}
                    />
                    <Toggle
                      label="Formula column"
                      value={formulaColumn}
                      onChange={(next) => customize(setFormulaColumn, next)}
                    />
                    <Toggle
                      label="Boolean & multi-select editors"
                      value={editorShowcase}
                      onChange={(next) => customize(setEditorShowcase, next)}
                    />
                    <Toggle
                      label="Status bar"
                      value={statusBar}
                      onChange={(next) => customize(setStatusBar, next)}
                    />
                    <Toggle
                      label="Undo / Redo buttons"
                      value={undoRedo}
                      disabledOn={
                        editingMode === "off"
                          ? "Turn on an editing mode first — the buttons drive the edit history."
                          : undefined
                      }
                      onChange={(next) => customize(setUndoRedo, next)}
                    />
                    <Toggle
                      label="Side panel"
                      value={settingsPanel}
                      onChange={(next) => customize(setSettingsPanel, next)}
                    />
                    <Toggle
                      label="Right-click menus"
                      value={contextMenu}
                      onChange={(next) => customize(setContextMenu, next)}
                    />
                    <Toggle
                      label="Command palette (⌘K)"
                      value={palette}
                      onChange={(next) => customize(setPalette, next)}
                    />
                    <Toggle
                      label="Print button"
                      value={printButton}
                      onChange={(next) => customize(setPrintButton, next)}
                    />
                    <Toggle
                      label="Column checkboxes"
                      value={columnSelect}
                      disabledOn={columnSelectReason}
                      onChange={(next) => customize(setColumnSelect, next)}
                    />
                    <Toggle
                      label="Density & fullscreen"
                      value={chrome}
                      onChange={(next) => customize(setChrome, next)}
                    />
                    <Control label="Load failure">
                      <Segmented
                        label="load failure"
                        value={failure}
                        onChange={(next) => customize(setFailure, next)}
                        options={[
                          { value: "off", label: "Off" },
                          { value: "builtin", label: "Built-in" },
                          { value: "replaced", label: "Replaced" },
                        ]}
                      />
                    </Control>
                    <Toggle
                      label="Highlight changed rows"
                      value={highlight}
                      disabledOn={highlightReason}
                      onChange={(next) => customize(setHighlight, next)}
                    />
                    <Toggle
                      label="Flash changed cells"
                      value={cellFlash}
                      disabledOn={cellFlashReason}
                      onChange={(next) => customize(setCellFlash, next)}
                    />
                  </ControlPanel>

                  <ControlPanel title="Editing">
                    <Control label="Editing mode">
                      <Segmented
                        label="editing mode"
                        value={editingMode}
                        onChange={(next) => customize(setEditingMode, next)}
                        options={[
                          { value: "off", label: "Off" },
                          {
                            value: "cell",
                            label: "Cell",
                            disabled: Boolean(editingReason),
                            title: editingReason,
                          },
                          {
                            value: "row",
                            label: "Row",
                            disabled: Boolean(editingReason),
                            title: editingReason,
                          },
                          {
                            value: "batch",
                            label: "Batch",
                            disabled: Boolean(editingReason),
                            title: editingReason,
                          },
                        ]}
                      />
                    </Control>
                  </ControlPanel>

                  <ControlPanel title="Rows">
                    <Toggle
                      label="Add / delete"
                      value={rowMutations}
                      disabledOn={clientOnlyReason ?? wholeSetWriteReason}
                      onChange={(next) => customize(setRowMutations, next)}
                    />
                    <Toggle
                      label="Reorder"
                      value={rowReorder}
                      disabledOn={reorderReason}
                      onChange={(next) => customize(setRowReorder, next)}
                    />
                    <Toggle
                      label="Pin rows"
                      value={rowPinning}
                      disabledOn={pinReason}
                      onChange={(next) => customize(setRowPinning, next)}
                    />
                    <Toggle
                      label="Span cells"
                      value={cellSpan}
                      disabledOn={clientOnlyReason}
                      onChange={(next) => customize(setCellSpan, next)}
                    />
                    <Toggle
                      label="Extra attached to a person"
                      value={extraRows}
                      disabledOn={clientOnlyReason}
                      onChange={(next) => customize(setExtraRows, next)}
                    />
                    <Toggle
                      label="Row style"
                      value={rowStyle}
                      disabledOn={clientOnlyReason}
                      onChange={(next) => customize(setRowStyle, next)}
                    />
                  </ControlPanel>
                </aside>
              </>
            }
            activeFilterCount={recipe === "baseline" && locale === "en" ? 0 : 1}
            onClearFilters={resetOptions}
            labels={FEATURE_LAB_DRAWER_LABELS}
          />
        </MantineProvider>

        <div className="lab-preview">
          {!controlsOpen && (
            <div className="visually-hidden" role="status">
              {configSummary}
            </div>
          )}
          <div className="lab-summary">
            <strong>
              {RECIPES.find((item) => item.key === recipe)?.label ?? "Custom"}
            </strong>
            <span>
              {MODE_SUMMARY[mode]} · {filtersUi} filters · {rowsSummary} ·{" "}
              {interactionSummary}
            </span>
            {compatibilityNote}
          </div>

          <div
            className="demo-surface demo-surface--flush"
            style={cssVars({ "--c": accent })}
          >
            <div
              className="demo-surface__body"
              // Remount when span flips so the seed starts clustered by team.
              key={`${adapter}-${cellSpan}`}
              data-adapter={adapter}
            >
              <LabRows
                pivot={pivot}
                pivoted={pivoted}
                kit={adapter}
                dark={dark}
                sidePanel={sidePanel}
              >
                <Suspense fallback={<DemoFallback />}>
                  <DemoFilterSetProvider value={filterSet}>
                    <AdvancedFiltersProvider value={advancedFilters}>
                      <LabCellFlash enabled={cellFlash === "on"}>
                        <Demo
                          mode={mode}
                          locale={locale}
                          dark={dark}
                          density={density}
                          filtersUi={filtersUi}
                          headerFilters={filtersUi === "header"}
                          columnGroups={columnGroups === "on"}
                          sparkline={sparkline === "on"}
                          formulaColumns={labFormulaColumns(formulaColumn)}
                          editorShowcase={editorShowcase === "on"}
                          statusBar={statusBar === "on"}
                          contextMenu={contextMenu === "on"}
                          densityChooser={chrome === "on"}
                          onDensityChange={
                            chrome === "on" ? setDensity : undefined
                          }
                          fullscreen={chrome === "on"}
                          commandPalette={palette === "on"}
                          onPrint={printLabTable}
                          printButton={printButton === "on"}
                          columnSelectionCheckbox={columnSelect === "on"}
                          undoRedoButtons={undoRedo === "on"}
                          sidePanel={sidePanel}
                          animate={motion === "on"}
                          grouping={structure === "grouped"}
                          tree={structure === "tree"}
                          nested={structure === "nested"}
                          editing={editingMode === "cell"}
                          rowMode={editingMode === "row"}
                          batch={editingMode === "batch"}
                          rowMutations={rowMutations === "on"}
                          highlight={highlight === "on"}
                          failure={failure}
                          onRecover={recoverFromFailure}
                          rowReorder={rowReorder === "on"}
                          rowPinning={rowPinning === "on"}
                          cellSpan={cellSpan === "on"}
                          extraRows={extraRows === "on"}
                          rowStyle={rowStyle === "on"}
                          urlKey="lab"
                        />
                      </LabCellFlash>
                    </AdvancedFiltersProvider>
                  </DemoFilterSetProvider>
                </Suspense>
              </LabRows>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
