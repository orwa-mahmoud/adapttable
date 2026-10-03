/** Real Angular live demo and Feature Lab. Page controls never implement table UI. */
import {
  type AdaptTableFeature,
  aggregate,
  type CellContext,
  type ColumnDef,
  type ColumnInput,
  type FacetMap,
  injectHighlight,
  injectPrefersReducedMotion,
  injectSavedViews,
  injectServerData,
  type NestedTableDefaults,
  type PaginationMode,
  type TableDensity,
} from "@adapttable/angular";
import { buildFormulaColumns } from "@adapttable/angular/formula";
import {
  injectPivotUrlState,
  isPivotReady,
  pivot,
  type PivotField,
  type PivotRow,
} from "@adapttable/angular/pivot";
import { sparklineColumn } from "@adapttable/angular/sparkline";
import { applyRowReorder, formatMultiDraft } from "@adapttable/core";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  InjectionToken,
  input,
  signal,
  type TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";

import { FRAMEWORK_STORAGE_KEY } from "../../../../scripts/framework-navigation.mjs";
import { kitAccent, SHOWCASE_ADAPTERS } from "../matrix/content";
import {
  budget,
  formatMoney,
  isRemote,
  kitchenFilterDefs,
  loadHistory,
  personSkills,
  personStatus,
  SKILLS,
  summaryPerson,
} from "../people";
import {
  applyPersonEdit,
  type DemoOrder,
  demoOrders,
  fetchPeople,
  FILTER_DEFS,
  groupedPeopleColumns,
  makeLargeDirectory,
  peopleColumns,
  peopleRows,
  type Person,
  reportsTo,
  rowKey,
  SHOWCASE_PRESENTATION,
} from "./data";
import {
  canReplaceDemo,
  demoSession,
  demoUrlAdapter,
  navigateDemo,
  refreshDemo,
  registerDemoCapture,
  registerDemoControlRestore,
  replaceDemoUrl,
} from "./demoTransitions.mjs";
import { AdaptShowcasePivotPanel, AdaptShowcaseTable } from "./kitComponents";
import { AdaptShowcaseNav } from "./nav";
import { SHOWCASE_DARK, SHOWCASE_KIT } from "./showcaseKit";

export const SHOWCASE_LAB = new InjectionToken<boolean>("showcase feature lab");
const option = (key: string, fallback: string): string =>
  new URLSearchParams(window.location.search).get(key) ?? fallback;
const enabled = (key: string, fallback = false): boolean =>
  option(key, fallback ? "on" : "off") === "on";

function initialStructure(server: boolean, urlKey: string): string {
  if (server) return "flat";
  let fallback = "flat";
  if (enabled("tree")) fallback = "tree";
  else if (enabled("grouping", Boolean(option(`${urlKey}.groupBy`, ""))))
    fallback = "grouped";
  return option("structure", fallback);
}

function initialEditingMode(canWrite: boolean, lab: boolean): string {
  if (!canWrite) return "off";
  const fallback = enabled("editing", !lab) ? "cell" : "off";
  return option("editing-mode", fallback);
}

function seedRows(dataset: string, large: boolean): Person[] {
  if (large) return makeLargeDirectory();
  if (dataset === "empty") return [];
  return peopleRows();
}

function editorChanges(key: string, value: unknown): Partial<Person> {
  const changes: Partial<Person> = {};
  if (key === "remote") changes.remote = value === true || value === "true";
  else
    changes.skills = Array.isArray(value)
      ? value.map(String)
      : String(value)
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);
  return changes;
}

function controlValue(target: HTMLInputElement | HTMLSelectElement): string {
  if (target instanceof HTMLInputElement && target.type === "checkbox")
    return target.checked ? "on" : "off";
  return target.value;
}

/** A nested table uses the selected kit and receives binding-owned defaults. */
@Component({
  selector: "adapt-showcase-lab-orders",
  imports: [AdaptShowcaseTable],
  template: `<adapt-showcase-table
    [data]="orders()"
    [columns]="columns"
    [rowKey]="rowKey"
    [urlSync]="false"
    [tableLabel]="defaults().tableLabel"
    [searchable]="defaults().searchable"
    [density]="defaults().density"
    [dir]="presentation.dir"
    [labels]="presentation.labels"
  />`,
})
class LabOrders {
  readonly row = input.required<Person>();
  readonly defaults = input.required<NestedTableDefaults>();
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly orders = computed(() => demoOrders(this.row()));
  readonly columns: readonly ColumnDef<DemoOrder>[] = [
    { key: "id", header: "Order" },
    { key: "item", header: "Item" },
    {
      key: "amount",
      header: "Amount",
      accessor: (row) => formatMoney(row.amount),
    },
  ];
  readonly rowKey = (row: DemoOrder) => row.id;
}

@Component({
  selector: "adapt-showcase-demo-page",
  imports: [
    AdaptShowcaseNav,
    AdaptShowcaseTable,
    AdaptShowcasePivotPanel,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  templateUrl: "./demoPage.html",
  styleUrls: ["./matrixPage.css", "./demoPage.css"],
  encapsulation: ViewEncapsulation.None,
})
export class AdaptShowcaseDemoPage {
  readonly kit = inject(SHOWCASE_KIT);
  private readonly mountedOptions = new URLSearchParams(window.location.search);
  readonly lab = inject(SHOWCASE_LAB);
  readonly dark = inject(SHOWCASE_DARK);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly adapters = SHOWCASE_ADAPTERS.filter(
    (adapter) => adapter.framework === "angular" && adapter.built !== false
  );
  readonly adapter = this.adapters.find(
    (adapter) => adapter.key === this.kit.key
  )!;
  readonly urlKey = this.lab ? "lab" : "live";
  readonly server = ["server", "backend"].includes(option("mode", "frontend"));
  readonly dataset =
    this.server && option("dataset", "people") === "large"
      ? "people"
      : option("dataset", "people");
  readonly large = this.dataset === "large";
  readonly canWrite = !this.server && !this.large;
  readonly density = signal<TableDensity>(
    option("density", "comfortable") === "compact" ? "compact" : "comfortable"
  );
  readonly filterMode = option("filters", "popover");
  readonly pagination: PaginationMode =
    this.large || option("pagination", "paged") === "infinite"
      ? "infinite"
      : "paged";
  readonly mobile = enabled("mobile");
  readonly selectable = enabled("selection", this.lab);
  readonly searchable = enabled("search", true);
  readonly requestedStructure = initialStructure(this.server, this.urlKey);
  readonly structure =
    this.large && this.requestedStructure !== "nested"
      ? "flat"
      : this.requestedStructure;
  readonly editingMode = initialEditingMode(this.canWrite, this.lab);
  readonly editing = this.editingMode !== "off";
  readonly grouping = this.structure === "grouped";
  readonly reducedMotion = injectPrefersReducedMotion();
  readonly motion = enabled("motion", true);
  readonly highlight = injectHighlight(
    enabled("highlight") || enabled("cell-flash")
  );
  readonly rows = signal<readonly Person[]>(
    (() => {
      const rows = demoSession.read<readonly Person[]>(
        `rows:${this.dataset}`,
        () => seedRows(this.dataset, this.large)
      );
      return enabled("cell-span")
        ? [...rows].sort((a, b) => a.team.localeCompare(b.team))
        : rows;
    })()
  );
  readonly flashCell = viewChild<TemplateRef<CellContext<Person>>>("flashCell");
  readonly leafColumns = computed<readonly ColumnDef<Person>[]>(() => {
    const flash = this.flashCell();
    return [
      ...peopleColumns({ editable: this.editing }).map((column) => ({
        ...column,
        ...(enabled("cell-flash") && flash ? { cell: flash } : {}),
      })),
      ...(enabled("formula")
        ? buildFormulaColumns<Person>([
            {
              key: "tag",
              header: "Tag",
              formula: '=UPPER(team) & " · " & role',
            },
          ]).columns
        : []),
      ...(enabled("sparkline")
        ? [
            sparklineColumn<Person>({
              key: "trend",
              header: "Trend",
              values: loadHistory,
              kind: "area",
              width: 88,
              height: 28,
              column: { width: 96 },
            }),
          ]
        : []),
      ...(enabled("editors")
        ? [
            {
              key: "remote",
              header: "Remote",
              accessor: (row: Person) => String(isRemote(row)),
              editable: this.editing,
              editor: "boolean" as const,
              editValue: (row: Person) => String(isRemote(row)),
              width: 110,
            },
            {
              key: "skills",
              header: "Skills",
              accessor: (row: Person) => personSkills(row).join(", "),
              editable: this.editing,
              editor: {
                type: "multi-select" as const,
                options: SKILLS.map((value) => ({ value, label: value })),
              },
              editValue: (row: Person) => formatMultiDraft(personSkills(row)),
              width: 180,
            },
          ]
        : []),
    ];
  });
  readonly columns = computed<readonly ColumnInput<Person>[]>(() => {
    const columns = this.leafColumns();
    let result: readonly ColumnInput<Person>[] = columns;
    if (enabled("column-groups")) {
      const byKey = new Map(columns.map((column) => [column.key, column]));
      const replace = (column: ColumnInput<Person>): ColumnInput<Person> => {
        let replacement: ColumnInput<Person>;
        if ("children" in column)
          replacement = { ...column, children: column.children.map(replace) };
        else replacement = byKey.get(column.key) ?? column;
        return replacement;
      };
      result = [
        ...groupedPeopleColumns().map(replace),
        ...columns.filter((column) =>
          ["tag", "trend", "remote", "skills"].includes(column.key)
        ),
      ];
    }
    return result;
  });
  readonly rowKey = rowKey;
  readonly log = signal("Changes are written by this demo's host callbacks.");
  readonly loading = signal(false);
  readonly failure = signal(option("failure", "off"));
  readonly error = signal<Error | null>(
    option("failure", "off") === "off"
      ? null
      : new Error("The demo request failed.")
  );
  readonly retry = (): void => {
    this.failure.set("off");
    this.error.set(null);
    const url = new URL(location.href);
    url.searchParams.set("failure", "off");
    replaceDemoUrl(url);
    void this.serverSource?.().refetch?.();
  };
  readonly serverRows = signal<readonly Person[]>([]);
  readonly total = signal(0);
  readonly facets = signal<FacetMap | undefined>(undefined);
  readonly serverSource = this.server
    ? injectServerData<Person>({
        rows: this.serverRows,
        total: this.total,
        supports: { facets: true, filterTree: true },
        facetKeys: ["team", "status"],
        facets: this.facets,
        loading: this.loading,
        error: this.error,
        urlKey: this.urlKey,
        defaults: { limit: 10 },
        paginationMode: this.pagination,
        onQueryChange: async (params, context) => {
          this.loading.set(true);
          this.error.set(null);
          try {
            if (this.failure() !== "off")
              throw new Error(
                "Demo server failure. Turn Load failure off to retry."
              );
            const page = await fetchPeople(params);
            if (context.signal.aborted) return;
            this.serverRows.set(this.dataset === "empty" ? [] : page.items);
            this.total.set(this.dataset === "empty" ? 0 : page.total);
            this.facets.set(page.facets);
          } catch (error) {
            if (!context.signal.aborted)
              this.error.set(
                error instanceof Error ? error : new Error(String(error))
              );
          } finally {
            if (!context.signal.aborted) this.loading.set(false);
          }
        },
      })
    : undefined;
  readonly source = this.serverSource
    ? computed(() => ({ ...this.serverSource!(), refetch: this.retry }))
    : undefined;
  readonly storageKey = `adapttable-angular-${this.kit.key}-lab-views`;
  readonly savedViews = injectSavedViews({
    storageKey: this.storageKey,
    urlKey: this.urlKey,
    urlAdapter: demoUrlAdapter,
  });
  /** Panel changes remount the independent toolbar controller from storage. */
  private updateViews(action: () => void): void {
    refreshDemo(action);
  }
  readonly savedViewsInputs = computed(() => ({
    views: this.savedViews.views(),
    onApply: (name: string) =>
      this.updateViews(() => this.savedViews.apply(name)),
    onRename: (from: string, to: string) =>
      this.updateViews(() => this.savedViews.rename(from, to)),
    onMove: (name: string, delta: 1 | -1) =>
      this.updateViews(() => this.savedViews.move(name, delta)),
    onSetDefault: (name: string) =>
      this.updateViews(() => this.savedViews.setDefault(name)),
    onRemove: (name: string) =>
      this.updateViews(() => this.savedViews.remove(name)),
    labels: this.presentation.labels,
  }));
  readonly dataLocale: "ar" | "en" = this.presentation.locale.startsWith("ar")
    ? "ar"
    : "en";
  readonly baseFeatures: readonly AdaptTableFeature[] = [
    this.kit.filters(
      option("filter-set", "live") === "kitchen" || this.large
        ? kitchenFilterDefs(this.dataLocale).map((def) =>
            def.type === "personText" ? { ...def, type: "text" } : def
          )
        : FILTER_DEFS
    ),
    ...(this.filterMode === "header" ? [this.kit.headerFilters()] : []),
    ...(this.grouping
      ? [this.kit.groupingPanel<Person>(["team", "status"])]
      : []),
    ...(this.editingMode === "cell"
      ? [
          this.kit.editing<Person>((row, key, value) =>
            this.write(row, { [key]: value })
          ),
        ]
      : []),
    ...(this.editingMode === "row"
      ? [this.kit.rowEditing<Person>((row, patch) => this.write(row, patch))]
      : []),
    ...(this.editingMode === "batch"
      ? [
          this.kit.batchEditing<Person>((edits) => {
            for (const edit of edits) this.write(edit.row, edit.patch);
          }),
        ]
      : []),
    ...(this.editing ? [this.kit.editHistory()] : []),
    ...(this.editing && enabled("undo-redo", !this.lab)
      ? [this.kit.undoRedoButtons()]
      : []),
    ...(enabled("columns", true)
      ? [this.kit.columnMenu(), this.kit.resizableColumns()]
      : []),
    ...(enabled("navigation", this.lab) || this.editing
      ? [this.kit.cellNavigation()]
      : []),
    ...(enabled("export", this.lab) ? [this.kit.exportCsv()] : []),
    ...(enabled("views", this.lab)
      ? [
          this.kit.savedViews({
            storageKey: this.storageKey,
            urlKey: this.urlKey,
          }),
        ]
      : []),
    ...(enabled("row-pinning") &&
    !this.server &&
    !["grouped", "tree"].includes(this.structure)
      ? [this.kit.rowPinning()]
      : []),
    ...(enabled("column-groups") ? [this.kit.collapsibleColumnGroups()] : []),
    ...(this.structure === "tree"
      ? [
          this.kit.tree<Person>({
            getParentId: reportsTo,
            treeColumn: "person",
          }),
        ]
      : []),
    ...(this.structure === "nested"
      ? [
          this.kit.nestedTable<Person>((row) => ({
            label: `Orders for ${row.name}`,
            table: LabOrders,
          })),
        ]
      : []),
    ...(enabled("virtualize") || this.large ? [this.kit.virtualize()] : []),
    ...(enabled("chrome")
      ? [this.kit.densityChooser(), this.kit.fullscreen()]
      : []),
    ...(enabled("status-bar") ? [this.kit.statusBar()] : []),
    ...(enabled("context-menu") ? [this.kit.contextMenu()] : []),
    ...(enabled("palette") ? [this.kit.commandPalette()] : []),
    this.kit.print(() => window.print(), enabled("print")),
    ...(enabled("column-selection") && this.editing
      ? [this.kit.columnSelectionCheckbox()]
      : []),
    ...(enabled("row-mutations") && this.canWrite
      ? [
          this.kit.rowActions<Person>([], {
            layout: "menu",
            onAddRow: () => this.add(),
            onDuplicateRow: (row) => this.add(row),
            onDeleteRow: (row) => {
              this.rows.update((rows) =>
                rows.filter((item) => item.id !== row.id)
              );
              this.log.set(`Deleted ${row.name}`);
            },
          }),
        ]
      : []),
    ...(enabled("row-reorder") && this.canWrite
      ? [
          this.kit.rowReorder<Person>(
            (from, to, row) => {
              this.rows.update((rows) => {
                const sameScope = (item: Person) =>
                  this.sameReorderScope(item, row);
                const siblings = rows.filter(sameScope);
                const source = siblings.findIndex((item) => item.id === row.id);
                const ordered = applyRowReorder(
                  siblings,
                  source < 0 ? from : source,
                  to
                );
                let index = 0;
                return rows.map((item) =>
                  sameScope(item) ? (ordered[index++] ?? item) : item
                );
              });
              this.highlight.flashRow(row.id);
              this.log.set(`Moved ${row.name}`);
            },
            {
              movePolicy: "confirm",
              onGroupMove: (row, _from, group, position) =>
                this.moveRow(
                  row,
                  Object.fromEntries(
                    group.levels.map((level) => [level.key, level.value])
                  ),
                  (item) =>
                    group.levels.every(
                      (level) => Reflect.get(item, level.key) === level.value
                    ),
                  position
                ),
              onTreeMove: (row, _from, parent, position) =>
                this.moveRow(
                  row,
                  { managerId: parent.id },
                  (item) => (reportsTo(item) ?? null) === parent.id,
                  position
                ),
            }
          ),
        ]
      : []),
    ...(enabled("cell-span") && !this.server
      ? [
          this.kit.cellSpan<Person>(
            ({ column, sectionRows, sectionRowIndex }) => {
              if (column.key !== "team") return undefined;
              const current = sectionRows[sectionRowIndex];
              if (
                !current ||
                sectionRows[sectionRowIndex - 1]?.team === current.team
              )
                return undefined;
              let rowSpan = 1;
              while (
                sectionRows[sectionRowIndex + rowSpan]?.team === current.team
              )
                rowSpan++;
              return rowSpan > 1 ? { rowSpan } : undefined;
            }
          ),
        ]
      : []),
    ...(enabled("extra-rows") && !this.server && this.rows()[0]
      ? [
          this.kit.extraRows([
            {
              key: "note",
              kind: "fullWidth",
              beforeRowId: this.rows()[0]!.id,
              render: () =>
                "This note stays attached to the first person when they move.",
            },
          ]),
        ]
      : []),
    ...(enabled("row-style") || enabled("highlight")
      ? [
          this.kit.rowAppearance<Person>({
            rowClassName: (row) =>
              enabled("highlight") && this.highlight.isRowHighlighted(row.id)
                ? "angular-highlight"
                : undefined,
            rowStyle: (row) =>
              enabled("row-style") && row.id === peopleRows()[0]?.id
                ? {
                    backgroundColor:
                      "light-dark(oklch(0.93 0.08 95), oklch(0.38 0.07 85))",
                  }
                : undefined,
          }),
        ]
      : []),
  ];
  readonly panelOpen = signal<string | null>(
    option("panel", "pivot") === "closed" ? null : option("panel", "pivot")
  );
  readonly panelTemplate = viewChild<TemplateRef<unknown>>("pivotPanel");
  readonly viewsTemplate = viewChild<TemplateRef<unknown>>("viewsPanel");
  readonly panelFeatures = computed<readonly AdaptTableFeature[]>(() =>
    enabled("side-panel") && !this.server && !this.large
      ? [
          this.kit.sidePanel({
            open: this.panelOpen(),
            onOpenChange: (key) => {
              this.panelOpen.set(key);
              const url = new URL(location.href);
              url.searchParams.set("panel", key ?? "closed");
              replaceDemoUrl(url);
            },
            panels: [
              { key: "pivot", label: "Pivot", content: this.panelTemplate() },
              { key: "views", label: "Views", content: this.viewsTemplate() },
              {
                key: "keys",
                label: "Keyboard",
                content:
                  "Arrow keys move between tabs. Home and End jump to the first or last tab. Escape closes the panel.",
              },
            ],
          }),
        ]
      : []
  );
  readonly pinnedFeatures = computed<readonly AdaptTableFeature[]>(() =>
    enabled("pinned-summary")
      ? [
          this.kit.pinnedSummaryRows<Person>({
            bottom: [
              {
                ...summaryPerson(
                  "portfolio-total",
                  "Portfolio total",
                  "إجمالي المحفظة"
                ),
                budget: this.rows().reduce(
                  (total, row) => total + budget(row),
                  0
                ),
              },
            ],
          }),
        ]
      : []
  );
  readonly features = computed(() => [
    ...this.pinnedFeatures(),
    ...this.baseFeatures,
    ...this.panelFeatures(),
  ]);
  readonly pivotState = injectPivotUrlState({
    urlKey: this.urlKey,
    defaultConfig: { rows: [], columns: [], measures: [] },
  });
  readonly pivoted = computed(
    () =>
      enabled("side-panel") &&
      !this.server &&
      !this.large &&
      isPivotReady(this.pivotState.config())
  );
  readonly pivotFields: readonly PivotField[] = [
    { key: "team", label: "Team" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "budget", label: "Budget" },
  ];
  readonly pivotCaption =
    viewChild<TemplateRef<CellContext<PivotRow>>>("pivotCaption");
  readonly pivotModel = computed(() =>
    this.kit.pivotTableModel(
      pivot(
        this.rows().map((row) => ({
          ...row,
          budget: budget(row),
          status: personStatus(row),
        })),
        this.pivotState.config(),
        {
          collapsed: this.pivotState.collapsed(),
          format: (value) =>
            typeof value === "number" ? formatMoney(value) : value,
        }
      ),
      {
        fields: this.pivotFields,
        labels: this.presentation.labels,
        renderRowHeader: (row) => this.pivotCaption() ?? row.label,
      }
    )
  );
  toggleFold(key: string): void {
    const next = new Set(this.pivotState.collapsed());
    if (!next.delete(key)) next.add(key);
    this.pivotState.onCollapsedChange(next);
  }
  write(row: Person, patch: Readonly<Record<string, unknown>>): void {
    this.rows.update((rows) => {
      let next = rows;
      for (const [key, value] of Object.entries(patch)) {
        if (key === "remote" || key === "skills") {
          const changes = editorChanges(key, value);
          next = next.map((item) =>
            item.id === row.id ? { ...item, ...changes } : item
          );
        } else next = applyPersonEdit(next, row, key, value);
        this.highlight.flashCell({ rowId: row.id, columnKey: key });
      }
      return next;
    });
    this.highlight.flashRow(row.id);
    this.log.set(`Saved ${Object.keys(patch).join(", ")} for ${row.name}`);
  }
  private sameReorderScope(item: Person, row: Person): boolean {
    if (this.grouping)
      return item.team === row.team && personStatus(item) === personStatus(row);
    if (this.structure === "tree") return reportsTo(item) === reportsTo(row);
    return true;
  }
  private moveRow(
    row: Person,
    changes: Partial<Person>,
    matches: (row: Person) => boolean,
    position: number
  ): void {
    this.rows.update((rows) => {
      const next = rows.filter((item) => item.id !== row.id);
      const destinations = next.flatMap((item, index) =>
        matches(item) ? [index] : []
      );
      const at =
        destinations[position] ?? (destinations.at(-1) ?? next.length - 1) + 1;
      next.splice(at, 0, { ...row, ...changes });
      return next;
    });
    this.highlight.flashRow(row.id);
    this.log.set(`Moved ${row.name} to the requested group or parent`);
  }
  private nextId = demoSession.read("nextId", () => 100000);
  add(original?: Person): void {
    const row = {
      ...(original ?? peopleRows()[0]!),
      id: String(++this.nextId),
      name: original ? `${original.name} (copy)` : "New person",
    };
    this.rows.update((rows) => [row, ...rows]);
    this.highlight.flashRow(row.id);
    this.log.set(`Added ${row.name}`);
  }
  readonly summary = enabled("summary")
    ? aggregate<Person>({ budget: "sum" }, { columns: peopleColumns() })
    : undefined;
  readonly option = option;
  readonly enabled = enabled;
  readonly toggles: readonly (readonly [string, string])[] = [
    ["columns", "Column menu and resizing"],
    ["navigation", "Cell navigation"],
    ["export", "Export CSV"],
    ["views", "Saved views"],
    ["selection", "Row selection"],
    ["search", "Search"],
    ["summary", "Summary totals"],
    ["row-pinning", "Row pinning"],
    ["column-groups", "Collapsible column groups"],

    ["formula", "Formula column"],
    ["sparkline", "Sparkline column"],
    ["editors", "Boolean & multi-select editors"],
    ["status-bar", "Status bar"],
    ["undo-redo", "Undo / Redo"],
    ["side-panel", "Side panel (pivot & views)"],
    ["context-menu", "Right-click menus"],
    ["palette", "Command palette (⌘K)"],
    ["print", "Print button"],
    ["column-selection", "Column checkboxes"],
    ["chrome", "Density & fullscreen"],
    ["highlight", "Highlight changed rows"],
    ["cell-flash", "Flash changed cells"],
    ["row-mutations", "Add / duplicate / delete"],
    ["row-reorder", "Reorder rows"],
    ["pinned-summary", "Pinned summary rows"],
    ["cell-span", "Span cells"],
    ["extra-rows", "Attached extra row"],
    ["row-style", "Row style"],
    ["virtualize", "Virtualization"],
    ["mobile", "Mobile cards"],
  ];
  readonly optionsDialog =
    viewChild<ElementRef<HTMLDialogElement>>("optionsDialog");
  openOptions(): void {
    const url = new URL(location.href);
    url.searchParams.set("options", "open");
    replaceDemoUrl(url);
    this.optionsDialog()?.nativeElement.showModal();
  }
  closeOptions(): void {
    const url = new URL(location.href);
    url.searchParams.delete("options");
    replaceDemoUrl(url);
    this.optionsDialog()?.nativeElement.close();
  }
  readonly recipes = ["baseline", "filters", "structure", "editing", "rows"];
  reason(key: string): string | undefined {
    if (
      this.server &&
      [
        "row-mutations",
        "row-reorder",
        "row-pinning",
        "cell-span",
        "extra-rows",
        "row-style",
        "side-panel",
      ].includes(key)
    )
      return "This option needs the complete frontend row set.";
    if (
      this.large &&
      ["row-mutations", "row-reorder", "side-panel"].includes(key)
    )
      return "This demo rewrites the whole row array; writes and pivot are disabled for 40,000 rows.";
    if (key === "row-pinning" && ["grouped", "tree"].includes(this.structure))
      return "Row pinning is unavailable for grouped or tree rows.";
    if (["undo-redo", "column-selection"].includes(key) && !this.editing)
      return "Turn on an editing mode first.";
    if (
      ["highlight", "cell-flash"].includes(key) &&
      !this.editing &&
      !enabled("row-mutations")
    )
      return "Turn on editing or row mutations first.";
    if (key === "cell-flash" && (!this.motion || this.reducedMotion()))
      return "Cell flash is disabled while motion is off or reduced motion is requested.";
    return undefined;
  }
  applyRecipe(recipe: string): void {
    const url = new URL(location.href);
    const kit = url.searchParams.get("kit");
    url.search = "";
    if (kit) url.searchParams.set("kit", kit);
    url.searchParams.set("recipe", recipe);
    if (recipe === "filters") url.searchParams.set("filter-set", "kitchen");
    if (recipe === "structure") {
      url.searchParams.set("structure", "grouped");
      url.searchParams.set("column-groups", "on");
    }
    if (recipe === "editing") url.searchParams.set("editing-mode", "cell");
    if (recipe === "rows")
      for (const key of [
        "row-mutations",
        "row-reorder",
        "row-pinning",
        "cell-span",
        "extra-rows",
        "row-style",
      ])
        url.searchParams.set(key, "on");
    navigateDemo(url);
  }
  readonly defaultOn = new Set([
    "columns",
    "navigation",
    "export",
    "views",
    "selection",
    "search",
  ]);
  readonly deployed = window.location.pathname.startsWith("/angular/demo");
  readonly mainHref = this.deployed ? "/angular/demo/" : "/angular-main/";
  readonly labHref = this.deployed
    ? "/angular/demo/all-options/"
    : "/angular-all-options/";
  adapterHref(key: string): string {
    return `${this.deployed ? "/angular/demo" : ""}/${key}/`;
  }
  accent(): string {
    return kitAccent(this.adapter, this.dark());
  }

  constructor() {
    inject(DestroyRef).onDestroy(
      registerDemoControlRestore(() => this.restoreControls())
    );
    const unregister = registerDemoCapture(() => {
      demoSession.write(`rows:${this.dataset}`, this.rows());
      demoSession.write("nextId", this.nextId);
      demoSession.write("dark", this.dark());
    });
    inject(DestroyRef).onDestroy(unregister);
    afterNextRender(() => {
      if (this.lab && option("options", "") === "open")
        this.optionsDialog()?.nativeElement.showModal();
    });
    const reloadViews = () => this.savedViews.reload();
    window.addEventListener("storage", reloadViews);
    const refreshOnOpen = effect(() => {
      this.panelOpen();
      this.savedViews.reload();
    });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener("storage", reloadViews);
      refreshOnOpen.destroy();
    });
    try {
      this.dark.set(
        demoSession.read(
          "dark",
          () => localStorage.getItem("adapttable-demo-theme") === "dark"
        )
      );
      localStorage.setItem(FRAMEWORK_STORAGE_KEY, "angular");
    } catch {
      /* Storage is optional. */
    }
    effect(() => {
      document.documentElement.dataset.theme = this.dark() ? "dark" : "light";
      document.documentElement.style.colorScheme = this.dark()
        ? "dark"
        : "light";
      try {
        localStorage.setItem(
          "adapttable-demo-theme",
          this.dark() ? "dark" : "light"
        );
      } catch {
        /* Storage is optional. */
      }
    });
  }
  change(key: string, event: Event): void {
    const target = event.target;
    if (!(
      target instanceof HTMLSelectElement || target instanceof HTMLInputElement
    ))
      return;
    const value = controlValue(target);
    const url = new URL(location.href);
    url.searchParams.set(key, value);
    url.searchParams.delete("recipe");
    this.normalizeOptionChange(url, key, value);
    if (key === "dataset" || key === "mode")
      url.searchParams.delete(`${this.urlKey}.page`);
    // The entry replaces the provider scope in this document. Host rows stay
    // in the demo session, and the binding restores its URL-backed state.
    navigateDemo(url);
  }
  private normalizeOptionChange(url: URL, key: string, value: string): void {
    if (key === "structure" && ["grouped", "tree"].includes(value))
      url.searchParams.set("row-pinning", "off");
    if (key === "dataset" && value === "large") {
      url.searchParams.set("editing-mode", "off");
      url.searchParams.set("row-mutations", "off");
      url.searchParams.set("row-reorder", "off");
      if (url.searchParams.get("structure") !== "nested")
        url.searchParams.set("structure", "flat");
    }

    if (key === "mode" && value === "server") {
      url.searchParams.set("grouping", "off");
      url.searchParams.set("editing", "off");
      url.searchParams.set("editing-mode", "off");
      url.searchParams.set("structure", "flat");
      for (const option of [
        "row-mutations",
        "row-reorder",
        "row-pinning",
        "cell-span",
        "extra-rows",
        "row-style",
        "side-panel",
      ])
        url.searchParams.set(option, "off");
      if (url.searchParams.get("dataset") === "large")
        url.searchParams.set("dataset", "people");
    }
  }

  private checkedControl(key: string): boolean {
    if (key === "grouping") return this.grouping;
    if (key === "editing") return this.editing;
    if (key === "motion") return this.motion;
    const fallback = this.defaultOn.has(key) ? "on" : "off";
    return (this.mountedOptions.get(key) ?? fallback) === "on";
  }
  /** Native form controls may already have changed before a draft guard blocks. */
  private restoreControls(): void {
    const values: Readonly<Record<string, string>> = {
      framework: "angular",
      kit: this.kit.key,
      mode: this.server ? "server" : "frontend",
      locale: this.presentation.locale,
      density: this.density(),
      filters: this.filterMode,
      dataset: this.dataset,
      pagination: this.pagination,
      "filter-set": this.mountedOptions.get("filter-set") ?? "live",
      structure: this.structure,
      "editing-mode": this.editingMode,
      failure: this.failure(),
    };
    for (const element of document.querySelectorAll<HTMLElement>(
      "[data-demo-control]"
    )) {
      const key = element.dataset.demoControl ?? "";
      if (element instanceof HTMLInputElement) {
        element.checked =
          element.type === "radio"
            ? element.value === this.kit.key
            : this.checkedControl(key);
      } else if (element instanceof HTMLSelectElement) {
        element.value = values[key] ?? this.mountedOptions.get(key) ?? "";
      }
    }
  }
  setDensity(density: TableDensity): void {
    this.density.set(density);
    const url = new URL(location.href);
    url.searchParams.set("density", density);
    replaceDemoUrl(url);
  }
  readonly canNavigate = canReplaceDemo;
  readonly kitAccent = kitAccent;
}
