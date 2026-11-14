/**
 * The demo each Angular feature page mounts under its seam, one component
 * per feature, and the table the kit's landing page shows.
 *
 * Every body mounts the selected kit’s real table and its own factories with that
 * feature composed, over the same people the React pages show. Where the
 * table asks the host to write — an edit, a move, a bulk action — the body
 * writes and says what it did on the line under the table, so what the host
 * received is on the page.
 */
import {
  ADAPTTABLE_URL_ADAPTER,
  type AdaptTableFeature,
  aggregate,
  type CellContext,
  type ColumnDef,
  type ColumnLayoutState,
  injectFrontendData,
  injectQuerySource,
  injectSavedViews,
  injectServerData,
  type NestedTableDefaults,
} from "@adapttable/angular";
import {
  buildFormulaColumns,
  type FormulaColumnSpec,
  injectFormulaUrlState,
} from "@adapttable/angular/formula";
import {
  injectPivotUrlState,
  pivot,
  type PivotRow,
} from "@adapttable/angular/pivot";
import { applyRowPatches, applyRowReorder, updateRow } from "@adapttable/core";
import { xlsxWriter } from "@adapttable/core/xlsx";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  type OnInit,
  type Signal,
  signal,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";
import {
  injectInfiniteQuery,
  provideTanStackQuery,
  QueryClient,
} from "@tanstack/angular-query-experimental";

import { pageLayoutFor, pivotRoster, rosterFor, seedRoster } from "../casts";
import { budget, formatMoney } from "../people";
import {
  attachedNote,
  budgetTotalOf,
  pinnedTotals,
} from "../shared/aggregationScenario";
import {
  EXPORT_GROUP_BY,
  EXPORT_MODES,
  exportGroups,
  type ExportMode,
  exportNavigatesCells,
  exportScenarioOptions,
  exportSelects,
  initialExportMode,
  loadArabicFont,
  printGroupedPeople,
  requestedExportScope,
} from "../shared/exportScenario";
import {
  FILTER_FORMS,
  type FilterForm,
  formShowsFields,
  formShowsHeaderFunnels,
  formShowsTree,
} from "../shared/filterForm";
import {
  cycleReport,
  FORMULA_EXAMPLES,
  FORMULA_START,
  FORMULAS_PARSE,
  NO_FORMULAS,
  withFormulas,
  withoutFormula,
  withTypedFormula,
} from "../shared/formulaScenario";
import {
  GROUPED_XLSX_EXPORT,
  PEOPLE_GROUP_BY,
} from "../shared/groupingScenario";
import { EDITING_DEFAULT_LAYOUT, inWideOrder } from "../shared/peopleTable";
import {
  PIVOT_AGGREGATORS,
  PIVOT_FIELDS,
  PIVOT_PAGE_SIZE,
  PIVOT_START,
  pivotCellFormat,
  pivotRowHeader,
} from "../shared/pivotScenario";
import {
  orderPeopleByTeam,
  teamSpan,
  withAddedPerson,
  withDuplicatedPerson,
  withoutPerson,
} from "../shared/rowsScenario";
import {
  createSeededViewStorage,
  createViewSession,
  reportingMigration,
  SAVED_VIEWS_STORAGE_KEY,
  SAVED_VIEWS_URL_KEY,
  upgradedFooter,
} from "../shared/savedViewsScenario";
import { AiBody } from "./aiBody";
import {
  applyPersonEdit,
  currentDataLocale,
  type DemoOrder,
  demoOrders,
  fetchPeople,
  FILTER_DEFS,
  groupedPeopleColumns,
  largePerson,
  makeLargeDirectory,
  PEOPLE,
  PEOPLE_GROUPING,
  peopleColumns,
  type PeoplePage,
  type PeopleParams,
  peopleRows,
  type Person,
  reportsTo,
  rowKey,
  SHOWCASE_PRESENTATION,
} from "./data";
import { AdaptShowcasePivotPanel, AdaptShowcaseTable } from "./kitComponents";
import { pageChromeFeatures } from "./pageChrome";
import { SHOWCASE_KIT } from "./showcaseKit";

/** The people columns, shared by every page that does not edit them. */
const COLUMNS = peopleColumns();

/** The three ways the filtering page lays its filters out. */
type FilterLayout = "popover" | "drawer" | "header";

/**
 * What the Angular Filters panel can hold: its AND/OR tree is part of every
 * kit's panel, so the choices are the tree alone or the tree with the fields.
 */
const ANGULAR_FILTER_FORMS = FILTER_FORMS.filter(({ value }) =>
  formShowsTree(value)
);

/** Filters: popover, drawer or header funnels, chips, and URL state. */
@Component({
  selector: "adapt-showcase-filtering",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint">Filters opens the popover or the drawer</span>
        <span class="hint">Advanced sits at the top of that panel</span>
        <span class="hint">Header funnels filter one column</span>
        <label class="angular-select">
          Filter layout
          <select [value]="layout()" (change)="changeLayout($event)">
            @for (option of layouts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
        <label class="angular-select">
          Filter form
          <select [value]="form()" (change)="changeForm($event)">
            @for (option of forms; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>
      <div class="mx-demo__body">
        @for (current of mounted(); track current.key) {
          <adapt-showcase-table
            [dir]="presentation.tableDir"
            [labels]="presentation.tableLabels"
            [attr.lang]="presentation.locale"
            tableLabel="People"
            urlKey="flt"
            [data]="rows"
            [columns]="columns"
            [rowKey]="rowKey"
            [defaultColumnLayout]="pageLayout"
            [filtersMode]="current.layout === 'drawer' ? 'drawer' : 'popover'"
            [filterFields]="current.fields"
            [features]="current.features"
          />
        }
      </div>
    </div>
  `,
})
class FilteringBody {
  readonly pageLayout = pageLayoutFor("filtering");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly layouts: readonly { value: FilterLayout; label: string }[] = [
    { value: "popover", label: "Popover" },
    { value: "drawer", label: "Drawer" },
    { value: "header", label: "Header" },
  ];
  readonly layout = signal<FilterLayout>("popover");
  readonly forms = ANGULAR_FILTER_FORMS;
  readonly form = signal<FilterForm>("both");
  changeLayout(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const value = event.target.value;
    const option = this.layouts.find((layout) => layout.value === value);
    if (option) this.layout.set(option.value);
  }
  changeForm(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const value = event.target.value;
    const option = this.forms.find((form) => form.value === value);
    if (option) this.form.set(option.value);
  }

  /**
   * The layout and form the table is mounted for — one entry, replaced when
   * either changes, so switching remounts the table the way React's `key`
   * does.
   */
  readonly mounted = computed(() => {
    const layout = this.layout();
    const form = this.form();
    return [
      {
        key: `${layout}-${form}`,
        layout,
        fields: formShowsFields(form),
        features: this.featuresFor(
          formShowsHeaderFunnels(layout === "header", form)
        ),
      },
    ];
  });
  private readonly chrome = pageChromeFeatures(this.kit, { urlKey: "flt" });
  private readonly panel: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    ...this.chrome,
  ];
  private readonly header: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.headerFilters(),
    ...this.chrome,
  ];

  /** Header funnels join the panel while the form keeps its fields. */
  private featuresFor(funnels: boolean): readonly AdaptTableFeature[] {
    return funnels ? this.header : this.panel;
  }
}

/** Selection: row and page checkboxes, and bulk actions over the set. */
@Component({
  selector: "adapt-showcase-selection",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [selectable]="true"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class SelectionBody {
  readonly pageLayout = pageLayoutFor("selection");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly log = signal("Select rows, then run a bulk action.");
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.bulkActions([
      {
        key: "export",
        label: "Export",
        onClick: (ids) => this.log.set(`Export: ${ids.join(", ")}`),
      },
      {
        key: "archive",
        label: "Archive",
        onClick: (ids) => this.log.set(`Archive: ${ids.join(", ")}`),
      },
    ]),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "sel" }),
  ];
}

/** Row reordering: a grip, keyboard moves, and the host writing each move. */
@Component({
  selector: "adapt-showcase-row-reordering",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint"
          >Space lifts a row, arrows move it, Space drops it</span
        >
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class RowReorderingBody {
  readonly pageLayout = pageLayoutFor("row-reordering");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly log = signal("Drag a grip, or lift a row with Space.");
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.rowReorder<Person>((from, to, row) => {
      this.rows.update((rows) => applyRowReorder(rows, from, to));
      this.log.set(
        `Moved ${row.name} from ${String(from + 1)} to ${String(to + 1)}`
      );
    }),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "reorder" }),
  ];
}

/** Editing: kit-native editors in the cell; the host writes every change. */
@Component({
  selector: "adapt-showcase-editing",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="editingEnabled()"
          (mousedown)="$event.preventDefault()"
          (click)="editingEnabled.set(!editingEnabled())"
        >
          Allow editing
        </button>
        <span class="hint">Double-click a cell to edit it</span>
        <span class="hint">Enter commits, Escape cancels</span>
        <button
          type="button"
          class="seg__btn"
          (mousedown)="$event.preventDefault()"
          (click)="receiveLiveUpdate()"
        >
          Receive live name update
        </button>
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="rejectNext()"
          (click)="rejectNext.set(!rejectNext())"
        >
          Reject next save
        </button>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          editConflictPolicy="ask"
          [urlSync]="false"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 10 }"
          [features]="features()"
          [defaultColumnLayout]="defaultLayout"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class EditingBody {
  readonly defaultLayout = EDITING_DEFAULT_LAYOUT;
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly columns = peopleColumns({ editable: true });
  readonly rowKey = rowKey;
  readonly log = signal("Every change goes through the host.");
  readonly rejectNext = signal(false);
  readonly editingEnabled = signal(true);

  /** Patch the same localized name field an editor reads while its draft stays open. */
  receiveLiveUpdate(): void {
    const row = this.rows()[0];
    if (!row) return;
    this.rows.update((rows) =>
      applyPersonEdit(rows, row, "person", "Ada Live")
    );
    this.log.set("Received live name update: Ada Live");
  }

  private readonly editingFeature = this.kit.editing<Person>(
    (row, key, value) => {
      this.rows.update((rows) => applyPersonEdit(rows, row, key, value));
      if (this.rejectNext()) {
        this.rejectNext.set(false);
        this.log.set(
          `Save rejected for ${row.name}; undo the optimistic change.`
        );
        return Promise.reject(
          new Error("The demo server rejected this change")
        );
      }
      this.log.set(`Saved ${key} for ${row.name}: ${String(value)}`);
      return undefined;
    },
    {
      formatEditError: (error: unknown) =>
        error instanceof Error ? error.message : "The demo save failed",
      onEditRollback: (previous: Person) => {
        this.rows.update((rows) =>
          rows.map((row) => (row.id === previous.id ? previous : row))
        );
        this.log.set(`Restored ${previous.name} after the rejected save.`);
      },
    }
  );
  private readonly persistentFeatures = [
    this.kit.editHistory(),
    this.kit.undoRedoButtons(),
    this.kit.cellNavigation(),
    this.kit.columnSelectionCheckbox(),
  ];
  private readonly pageFeatures = computed<readonly AdaptTableFeature[]>(() => [
    ...(this.editingEnabled() ? [this.editingFeature] : []),
    ...this.persistentFeatures,
  ]);
  private readonly chrome = pageChromeFeatures(this.kit, {
    editing: true,
    urlKey: "edit",
  });
  readonly features = computed<readonly AdaptTableFeature[]>(() => [
    ...this.pageFeatures(),
    ...this.chrome,
  ]);
}

/**
 * Grouping: the panel and its drag or select controls, nested groups with
 * footers and budget subtotals, the column menu, and the grouped sheet
 * exported as a spreadsheet.
 */
@Component({
  selector: "adapt-showcase-grouping",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <div class="seg" role="group" aria-label="Grouping controls">
          <button
            type="button"
            class="seg__btn"
            [class.is-on]="!mobile()"
            [attr.aria-pressed]="!mobile()"
            data-demo-control="grouping-desktop"
            (click)="mobile.set(false)"
          >
            Drag + keyboard
          </button>
          <button
            type="button"
            class="seg__btn"
            [class.is-on]="mobile()"
            [attr.aria-pressed]="mobile()"
            data-demo-control="grouping-mobile"
            (click)="mobile.set(true)"
          >
            Mobile selects
          </button>
        </div>
        <span class="hint">Drag a column header into the grouping strip</span>
        <span class="hint"
          >Focus a chip handle; arrow keys change its level</span
        >
      </div>
      <div class="mx-demo__body">
        <div [class.phone-frame]="mobile()">
          <adapt-showcase-table
            [dir]="presentation.tableDir"
            [labels]="presentation.tableLabels"
            [attr.lang]="presentation.locale"
            tableLabel="People"
            urlKey="grp"
            [data]="rows"
            [columns]="columns"
            [rowKey]="rowKey"
            [defaultColumnLayout]="pageLayout"
            [forceMobile]="mobile() || undefined"
            [features]="features"
          />
        </div>
      </div>
    </div>
  `,
})
class GroupingBody {
  readonly pageLayout = pageLayoutFor("grouping");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  // The toggle forces the phone's selects on a desktop; off, it leaves the
  // breakpoint alone rather than forcing a desktop table onto a phone.
  readonly mobile = signal(false);
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.groupingPanel([...PEOPLE_GROUP_BY], PEOPLE_GROUPING),
    this.kit.columnMenu(),
    this.kit.exportCsv(GROUPED_XLSX_EXPORT),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "grp" }),
  ];
}

/**
 * Export: the grouped sheet as a PDF or through a host-run server job, the
 * same view through the browser's print dialog, and a CSV of the flat view
 * by scope (`?scope=page|selected|range`).
 */
@Component({
  selector: "adapt-showcase-export",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row" role="group" aria-label="Export mode">
        <span class="hint">Grouped by team, then status</span>
        @for (option of modes; track option.value) {
          <button
            type="button"
            class="seg__btn"
            [class.is-on]="mode() === option.value"
            [attr.aria-pressed]="mode() === option.value"
            [attr.data-demo-control]="'export-mode-' + option.value"
            (click)="mode.set(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [features]="features()"
          [selectable]="selects()"
        />
      </div>
    </div>
  `,
})
class ExportBody implements OnInit {
  readonly pageLayout = pageLayoutFor("export");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly modes = EXPORT_MODES;
  private readonly locale = currentDataLocale();
  private readonly scope = requestedExportScope() ?? "page";
  readonly mode = signal<ExportMode>(initialExportMode());
  private readonly font = signal<ArrayBuffer | undefined>(undefined);
  readonly selects = computed(() => exportSelects(this.mode(), this.scope));
  private readonly pageFeatures = computed<readonly AdaptTableFeature[]>(() => {
    const mode = this.mode();
    const font = this.font();
    return [
      ...(exportGroups(mode)
        ? [this.kit.groupingPanel([...EXPORT_GROUP_BY], PEOPLE_GROUPING)]
        : []),
      this.kit.exportCsv(
        exportScenarioOptions(mode, this.locale, font, this.scope)
      ),
      ...(exportNavigatesCells(mode, this.scope)
        ? [this.kit.cellNavigation()]
        : []),
      this.kit.print(() => {
        printGroupedPeople(this.locale, font);
      }, true),
    ];
  });
  private readonly chrome = pageChromeFeatures(this.kit, { urlKey: "pdf" });
  readonly features = computed<readonly AdaptTableFeature[]>(() => [
    ...this.pageFeatures(),
    ...this.chrome,
  ]);

  ngOnInit(): void {
    if (this.locale !== "ar") return;
    loadArabicFont()
      .then((bytes) => {
        this.font.set(bytes);
      })
      .catch((error: unknown) => {
        console.error("the demo font did not load", error);
      });
  }
}

/** How many rows the scale page windows. */
const SCALE_ROWS = 40_000;

/** Where the scale page's rows come from: `?tier=server` or `?tier=query`. */
type ScaleTier = "frontend" | "server" | "query";

/** The tier the page's URL asks for. */
function scaleTier(): ScaleTier {
  const tier = new URLSearchParams(location.search).get("tier");
  return tier === "server" || tier === "query" ? tier : "frontend";
}

/** The frontend tier: every row in memory, windowed. */
@Component({
  selector: "adapt-showcase-scale-frontend",
  imports: [AdaptShowcaseTable],
  template: `
    <adapt-showcase-table
      [dir]="presentation.tableDir"
      [labels]="presentation.tableLabels"
      [attr.lang]="presentation.locale"
      tableLabel="People"
      [urlSync]="false"
      paginationMode="infinite"
      [maxHeight]="480"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [defaults]="{ limit: count }"
      [features]="features"
    />
  `,
})
class ScaleFrontendTable {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly count = SCALE_ROWS;
  readonly rows = makeLargeDirectory(SCALE_ROWS);
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [this.kit.virtualize()];
}

/**
 * The server tier: the table asks for a slice and this answers it, deriving
 * each row from its index, so the browser never holds the set and the total
 * the pager reports is the real one.
 */
@Component({
  selector: "adapt-showcase-scale-server",
  imports: [AdaptShowcaseTable],
  template: `
    <adapt-showcase-table
      [dir]="presentation.tableDir"
      [labels]="presentation.tableLabels"
      [attr.lang]="presentation.locale"
      tableLabel="People"
      [urlSync]="false"
      [maxHeight]="480"
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
class ScaleServerTable {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  private readonly slice = signal({ from: 0, limit: 500 });
  readonly source = injectServerData<Person>({
    rows: computed(() => {
      const { from, limit } = this.slice();
      return Array.from(
        { length: Math.max(0, Math.min(limit, SCALE_ROWS - from)) },
        (_, index) => largePerson(from + index)
      );
    }),
    total: SCALE_ROWS,
    urlSync: false,
    paginationMode: "infinite",
    defaults: { limit: 500 },
    onQueryChange: (query) => {
      this.slice.set({
        from: (query.page - 1) * query.limit,
        limit: query.limit,
      });
    },
  });
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.virtualize({ estimateRowSize: 48 }),
  ];
}

/** The people endpoint as an infinite query, keyed on the table's params. */
function injectPeopleQuery(params: Signal<Partial<PeopleParams>>) {
  return injectInfiniteQuery(() => {
    const current = params();
    return {
      queryKey: ["people", current],
      queryFn: ({ pageParam }: { pageParam: number }) =>
        fetchPeople({ ...current, page: pageParam }),
      initialPageParam: current.page ?? 1,
      getNextPageParam: (last: PeoplePage) => last.nextPage ?? undefined,
    };
  });
}

/**
 * The query-library tier: the table's view becomes the params of an Angular
 * Query infinite query over the people endpoint, and its pages the rows.
 */
@Component({
  selector: "adapt-showcase-scale-query",
  imports: [AdaptShowcaseTable],
  providers: [provideTanStackQuery(new QueryClient())],
  template: `
    <button
      type="button"
      class="seg__btn"
      [attr.aria-pressed]="alternate()"
      (click)="alternate.set(!alternate())"
    >
      Use alternate data
    </button>
    <adapt-showcase-table
      [dir]="presentation.tableDir"
      [labels]="presentation.tableLabels"
      [attr.lang]="presentation.locale"
      tableLabel="People"
      [urlSync]="false"
      [source]="activeSource()"
      [columns]="columns"
      [rowKey]="rowKey"
    />
  `,
})
class ScaleQueryTable {
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly alternate = signal(false);
  private readonly source = injectQuerySource<Person, PeopleParams, PeoplePage>(
    {
      query: injectPeopleQuery,
      urlSync: false,
      paginationMode: "paged",
      defaults: { limit: 10 },
      selectPage: (page) => ({
        rows: page.items,
        total: page.total,
        facets: page.facets,
      }),
    }
  );
  private readonly alternateSource = injectFrontendData<Person>({
    data: peopleRows()
      .slice(0, 2)
      .map((row) => ({
        ...row,
        name: `Alternate ${row.name}`,
      })),
    columns: COLUMNS,
    getRowId: rowKey,
    urlSync: false,
    defaults: { limit: 10 },
  });
  readonly activeSource = computed(() =>
    this.alternate() ? this.alternateSource : this.source
  );
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
}

/** Scale: forty thousand rows, windowed, in a scroll box — or served. */
@Component({
  selector: "adapt-showcase-scale",
  imports: [ScaleFrontendTable, ScaleServerTable, ScaleQueryTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint">{{ hint }}</span>
      </div>
      <div class="mx-demo__body">
        @switch (tier) {
          @case ("server") {
            <adapt-showcase-scale-server />
          }
          @case ("query") {
            <adapt-showcase-scale-query />
          }
          @default {
            <adapt-showcase-scale-frontend />
          }
        }
      </div>
    </div>
  `,
})
class ScaleBody {
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly tier = scaleTier();
  readonly hint = {
    frontend: `${SCALE_ROWS} rows — only the ones in view render`,
    server: `${SCALE_ROWS} rows on the server — each slice fetched as you scroll`,
    query: "Every page comes from an Angular Query infinite query",
  }[this.tier];
}

/** Mobile cards: the same table, every row a card, in a phone-width frame. */
@Component({
  selector: "adapt-showcase-mobile-cards",
  imports: [AdaptShowcaseTable, NgTemplateOutlet],
  template: `
    <div class="mx-demo">
      <div class="hint-row" role="group" aria-label="Layout">
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="mobile() === undefined"
          (click)="mobile.set(undefined)"
        >
          Automatic
        </button>
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="mobile() === true"
          (click)="mobile.set(true)"
        >
          Phone cards
        </button>
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="mobile() === false"
          (click)="mobile.set(false)"
        >
          Scrollable table
        </button>
      </div>
      <div class="hint-row" role="group" aria-label="Card options">
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="customCard()"
          (click)="customCard.set(!customCard())"
        >
          Custom card
        </button>
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="bounded()"
          (click)="bounded.set(!bounded())"
        >
          Bounded scrolling
        </button>
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="paged()"
          (click)="paged.set(!paged())"
        >
          {{ paged() ? "Paged" : "Infinite scroll" }}
        </button>
        @for (state of scenarios; track state) {
          <button
            type="button"
            class="seg__btn"
            [attr.aria-pressed]="scenario() === state"
            (click)="scenario.set(state)"
          >
            {{ state }}
          </button>
        }
      </div>
      <ng-template #cardBody let-fields="fields">
        <div class="mx-custom-card" data-demo-custom-card>
          @for (field of fields; track field.column.key) {
            <div [class.mx-custom-card__identity]="!field.label">
              @if (field.label) {
                <span class="mx-custom-card__label">{{ field.label }}</span>
              }
              <ng-container
                [ngTemplateOutlet]="field.value"
                [ngTemplateOutletContext]="field.context"
              />
            </div>
          }
        </div>
      </ng-template>
      <div class="mx-demo__body" [class.mx-phone]="mobile() === true">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          mode="frontend"
          [urlSync]="false"
          [forceMobile]="mobile()"
          [selectable]="true"
          [features]="features"
          [onRowClick]="activateRow"
          [data]="
            scenario() === 'empty' || scenario() === 'loading' ? [] : rows()
          "
          [renderCard]="customCard() ? cardBody : undefined"
          [maxHeight]="bounded() ? 360 : undefined"
          [paginationMode]="paged() ? 'paged' : 'infinite'"
          [loading]="scenario() === 'loading'"
          [error]="scenario() === 'error' ? demoError : null"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="{ limit: 8 }"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class MobileCardsBody {
  readonly pageLayout = pageLayoutFor("mobile");
  readonly mobile = signal<boolean | undefined>(true);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly log = signal("Activate a person to see the host callback.");
  readonly activateRow = (row: Person): void =>
    this.log.set(`Activated ${row.name}`);
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly customCard = signal(false);
  readonly bounded = signal(false);
  readonly paged = signal(true);
  readonly scenarios = ["ready", "empty", "loading", "error"];
  readonly scenario = signal("ready");
  readonly demoError = new Error(
    "The directory could not be loaded. Try again."
  );
  private readonly kit = inject(SHOWCASE_KIT);
  readonly columns = peopleColumns({ editable: true }).map((column) => {
    if (column.key === "person")
      return { ...column, cell: this.kit.personCell };
    if (column.key === "load") return { ...column, cell: this.kit.loadCell };
    return column;
  });
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.rowEditing<Person>((row, patch) => {
      this.rows.update((rows) =>
        Object.entries(patch).reduce(
          (next, [key, value]) => applyPersonEdit(next, row, key, value),
          rows
        )
      );
      this.log.set(`Saved ${row.name}`);
    }),
    this.kit.filters(FILTER_DEFS),
    this.kit.nestedTable<Person>((row) => ({
      label: `Orders for ${row.name}`,
      table: OrdersTable,
    })),
    this.kit.rowActions<Person>([
      { key: "profile", label: "View profile", onClick: this.activateRow },
    ]),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { editing: true, urlKey: "mob" }),
  ];
}

/**
 * Saved views: the views menu on the table and the kit's management panel
 * beside it, over the shared seeded views — one shared and read-only, one
 * upgraded from an older table.
 */
@Component({
  selector: "adapt-showcase-saved-views",
  imports: [AdaptShowcaseTable, NgComponentOutlet],
  // The list and the table both apply a view by writing params into a store
  // kept for this visit only: refresh starts clean, the URL never changes.
  providers: [
    { provide: ADAPTTABLE_URL_ADAPTER, useFactory: createViewSession },
  ],
  template: `
    <ng-template #migratedNote
      ><span data-testid="migrated">{{ footer() }}</span></ng-template
    >
    <div class="mx-demo">
      <div class="mx-demo__body panel-layout" [attr.dir]="presentation.dir">
        <div>
          <ng-container
            [ngComponentOutlet]="kit.savedViewsPanel"
            [ngComponentOutletInputs]="panelInputs()"
          />
        </div>
        <div>
          <adapt-showcase-table
            [dir]="presentation.tableDir"
            [labels]="presentation.tableLabels"
            [attr.lang]="presentation.locale"
            tableLabel="People"
            [urlKey]="urlKey"
            [data]="rows"
            [columns]="columns"
            [rowKey]="rowKey"
            [defaultColumnLayout]="pageLayout"
            [features]="features"
          />
        </div>
      </div>
    </div>
  `,
})
class SavedViewsBody {
  readonly pageLayout = pageLayoutFor("saved-views");
  protected readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("saved-views");
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly urlKey = SAVED_VIEWS_URL_KEY;
  private readonly migrated = signal<readonly string[]>([]);
  private readonly options = {
    storageKey: SAVED_VIEWS_STORAGE_KEY,
    storage: createSeededViewStorage(),
    urlKey: SAVED_VIEWS_URL_KEY,
    urlAdapter: inject(ADAPTTABLE_URL_ADAPTER),
  };
  readonly views = injectSavedViews({
    ...this.options,
    migrate: reportingMigration((upgraded) => {
      this.migrated.update((seen) =>
        seen.includes(upgraded) ? seen : [...seen, upgraded]
      );
    }),
  });
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.savedViews(this.options),
  ];
  readonly footer = computed(() => upgradedFooter(this.migrated()));
  private readonly migratedNote =
    viewChild<TemplateRef<unknown>>("migratedNote");
  readonly panelInputs = computed(() => ({
    views: this.views.views(),
    onApply: this.views.apply,
    onRename: this.views.rename,
    onMove: this.views.move,
    onSetDefault: this.views.setDefault,
    onRemove: this.views.remove,
    labels: this.presentation.labels,
    footer: this.footer() === undefined ? undefined : this.migratedNote(),
  }));
}

/** The landing page composes the kit's real controls into a useful workspace. */
@Component({
  selector: "adapt-showcase-landing-table",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo mx-demo--overview">
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          urlKey="overview"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [selectable]="true"
          [defaults]="{ limit: 10 }"
          [summaryRow]="summary"
          [features]="features"
        />
      </div>
    </div>
  `,
})
export class AdaptShowcaseLandingTable {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly columns = peopleColumns({ editable: true });
  readonly rowKey = rowKey;
  readonly summary = aggregate<Person>(
    { budget: "sum" },
    {
      columns: this.columns,
      format: (value) =>
        typeof value === "number" ? formatMoney(value) : value,
    }
  );
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.columnMenu(),
    this.kit.resizableColumns(),
    this.kit.savedViews({
      storageKey: `adapttable-angular-${this.kit.key}-overview-views`,
      urlKey: "overview",
    }),
    this.kit.groupingPanel<Person>([], {
      groupAggregates: aggregate<Person>(
        { budget: "sum" },
        { columns: this.columns }
      ),
      groupFooters: true,
    }),
    this.kit.editing<Person>((row, key, value) => {
      this.rows.update((rows) => applyPersonEdit(rows, row, key, value));
    }),
    this.kit.editHistory(),
    this.kit.undoRedoButtons(),
    this.kit.cellNavigation(),
    this.kit.bulkActions([]),
    this.kit.exportCsv<Person>({ filename: "people-workspace.csv" }),
    this.kit.densityChooser(),
    this.kit.fullscreen(),
    this.kit.statusBar(),
  ];
}

/**
 * Tree: the seed's org chart — each team's lead first, everyone else on the
 * team under them — one page of thirty so no branch splits across pages.
 */
@Component({
  selector: "adapt-showcase-tree",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint">Each team lead opens onto their team</span>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="{ limit: 30 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class TreeBody {
  readonly pageLayout = pageLayoutFor("tree");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.tree<Person>({ getParentId: reportsTo, treeColumn: "person" }),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "tree" }),
  ];
}

/** The nested orders table's columns — a different shape from the parent's. */
const ORDER_COLUMNS: ColumnDef<DemoOrder>[] = [
  { key: "item", header: "Item", accessor: (row) => row.item },
  { key: "qty", header: "Qty", accessor: (row) => row.qty, align: "end" },
  {
    key: "amount",
    header: "Amount",
    accessor: (row) => `$${row.amount.toLocaleString("en-US")}`,
    align: "end",
  },
];

/** One person's orders: this kit's own table, mounted with the defaults. */
@Component({
  selector: "adapt-showcase-orders",
  imports: [AdaptShowcaseTable],
  template: `
    @let d = defaults();
    <adapt-showcase-table
      [dir]="presentation.tableDir"
      [labels]="presentation.tableLabels"
      [attr.lang]="presentation.locale"
      [data]="orders()"
      [columns]="columns"
      [rowKey]="orderKey"
      [urlSync]="d.urlSync"
      [searchable]="d.searchable"
      [density]="d.density"
      [tableLabel]="d.tableLabel"
    />
  `,
})
class OrdersTable {
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly row = input.required<Person>();
  readonly defaults = input.required<NestedTableDefaults>();
  readonly orders = computed(() => demoOrders(this.row()));
  readonly columns = ORDER_COLUMNS;
  readonly orderKey = (order: DemoOrder) => order.id;
}

/** Nested tables: each person's recent orders, in a table under the row. */
@Component({
  selector: "adapt-showcase-nested-tables",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint">Open a row to see that person's orders</span>
        <span class="hint">The orders have their own columns and row keys</span>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class NestedTablesBody {
  readonly pageLayout = pageLayoutFor("nested-tables");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.nestedTable<Person>(
      (row) => ({ label: `Orders for ${row.name}`, table: OrdersTable }),
      [PEOPLE[0]!.id]
    ),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "nest" }),
  ];
}

/** Rows: pin from the 3-dot menu, and merge a team that runs down the page. */
@Component({
  selector: "adapt-showcase-rows",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint">Open a row's ⋯ menu to pin it</span>
        <span class="hint">A team that runs down the page is one cell</span>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          urlKey="rows"
          [maxHeight]="420"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="{ limit: 30 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class RowsBody {
  readonly pageLayout = pageLayoutFor("rows");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal(orderPeopleByTeam(PEOPLE));
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.rowPinning(),
    this.kit.cellSpan(teamSpan),
    this.kit.rowActions<Person>([], {
      layout: "menu",
      onAddRow: () => {
        this.rows.update(withAddedPerson);
      },
      onDuplicateRow: (row) => {
        this.rows.update((rows) => withDuplicatedPerson(rows, row));
      },
      onDeleteRow: (row) => {
        this.rows.update((rows) => withoutPerson(rows, row));
      },
    }),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "rows" }),
  ];
}

/** Column groups: three header groups, each collapsing its own way. */
@Component({
  selector: "adapt-showcase-column-groups",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint">Each group header has its own ▼</span>
        <span class="hint">Collapse one to see how it folds</span>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class ColumnGroupsBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = groupedPeopleColumns();
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.collapsibleColumnGroups(),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "cgrp" }),
  ];
}

/** Column management, matching ColumnsDemo.tsx through the selected kit. */
@Component({
  selector: "adapt-showcase-columns",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <p class="hint">
        Pin, resize, rename or hide a column from Columns. Shift+arrow selects a
        range to export.
      </p>
      <div class="mx-demo__body">
        <adapt-showcase-table
          tableLabel="People"
          urlKey="cols"
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [columnLayout]="layout()"
          (columnLayoutChange)="layout.set($event)"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class ColumnsBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly rowKey = rowKey;
  // This deliberately wide demo needs width floors: automatic table layout
  // may shrink preferred widths until there is no overflow to demonstrate.
  readonly columns: readonly ColumnDef<Person>[] = inWideOrder([
    ...COLUMNS.map((column) => ({
      ...column,
      minWidth: typeof column.width === "number" ? column.width : undefined,
    })),
    { key: "role", header: "Role", width: 220, minWidth: 220 },
  ]);
  readonly layout = signal<ColumnLayoutState>({
    hidden: [],
    order: [],
    widths: {},
    pinned: { person: "start" },
  });
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.columnMenu(),
    this.kit.resizableColumns(),
    this.kit.densityChooser(),
    this.kit.cellNavigation(),
    this.kit.exportCsv({
      scope: "range",
      writer: xlsxWriter({ sheetName: "People" }),
      filename: "people.xlsx",
    }),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "cols" }),
  ];
}

/**
 * Totals that are not data rows: pinned team and grand totals, group
 * footers with budget subtotals, the footer grand total, and a full-width
 * note attached to a row. Filter the set and every total follows.
 */
@Component({
  selector: "adapt-showcase-aggregation",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint"
          >Pinned team total and grand total are not data rows</span
        >
        <span class="hint"
          >Group footers close each team; the table footer is the grand
          total</span
        >
        <span class="hint">Filter the set and every total follows</span>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          tableLabel="People budgets"
          urlKey="agg"
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [summaryRow]="summary"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class AggregationBody {
  readonly pageLayout = pageLayoutFor("aggregation");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("aggregation");
  readonly rowKey = rowKey;
  readonly columns = COLUMNS;
  readonly summary = PEOPLE_GROUPING.groupAggregates;
  private readonly anchor = this.rows[0];
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.groupingPanel<Person>([...PEOPLE_GROUP_BY], PEOPLE_GROUPING),
    this.kit.pinnedSummaryRows<Person>(pinnedTotals(budgetTotalOf(this.rows))),
    ...(this.anchor
      ? [this.kit.extraRows([attachedNote(this.anchor.id, this.anchor.name)])]
      : []),
    this.kit.filters(FILTER_DEFS),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "agg" }),
  ];
}

/** Pivot axes, measures and folded groups, matching PivotDemo.tsx. */
@Component({
  selector: "adapt-showcase-pivot",
  imports: [AdaptShowcaseTable, AdaptShowcasePivotPanel],
  templateUrl: "./pivotBody.html",
})
class PivotBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly fields = PIVOT_FIELDS;
  readonly rows = pivotRoster();
  readonly pageSize = PIVOT_PAGE_SIZE;
  readonly state = injectPivotUrlState({
    urlKey: "pivot",
    defaultConfig: PIVOT_START,
  });
  readonly caption =
    viewChild<TemplateRef<CellContext<PivotRow>>>("pivotCaption");
  readonly model = computed(() => {
    const caption = this.caption();
    return this.kit.pivotTableModel(
      pivot(this.rows, this.state.config(), {
        collapsed: this.state.collapsed(),
        aggregators: PIVOT_AGGREGATORS,
        format: pivotCellFormat,
      }),
      {
        fields: this.fields,
        labels: this.presentation.labels,
        rowHeader: pivotRowHeader(
          this.state.config(),
          this.fields,
          this.presentation.labels.pivotTotal
        ),
        renderRowHeader: (row) => caption ?? row.label,
      }
    );
  });

  /** A subtotal's stable key is also the collapse key persisted in the URL. */
  toggleFold(key: string): void {
    const next = new Set(this.state.collapsed());
    if (!next.delete(key)) next.add(key);
    this.state.onCollapsedChange(next);
  }
}

/** Formula input, visible errors and shareable columns, from FormulasDemo.tsx. */
@Component({
  selector: "adapt-showcase-formulas",
  imports: [AdaptShowcaseTable],
  templateUrl: "./formulasBody.html",
})
class FormulasBody {
  readonly pageLayout = pageLayoutFor("formulas");
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = seedRoster("formulas", true);
  readonly rowKey = rowKey;
  private readonly kit = inject(SHOWCASE_KIT);
  readonly features = pageChromeFeatures(this.kit, { urlKey: "fx" });
  readonly examples = FORMULA_EXAMPLES;
  readonly parses = FORMULAS_PARSE;
  readonly noFormulas = NO_FORMULAS;
  readonly name = signal("");
  readonly formula = signal("");
  readonly state = injectFormulaUrlState({
    urlKey: "fx",
    defaultFormulas: FORMULA_START,
  });
  readonly derived = computed(() =>
    buildFormulaColumns<Person>(this.state.formulas())
  );
  readonly columns = computed(() => [...COLUMNS, ...this.derived().columns]);
  readonly errors = computed(() => Object.entries(this.derived().errors));
  readonly cycle = computed(() => cycleReport(this.derived().cycles));

  /** Apply a new list; one that changed nothing writes nothing. */
  private change(next: readonly FormulaColumnSpec[]): void {
    if (next !== this.state.formulas()) this.state.onFormulasChange(next);
  }

  /** Add the typed formula through the binding; evaluation stays in core. */
  add(): void {
    if (this.formula().trim() === "") return;
    this.change(
      withTypedFormula(this.state.formulas(), this.name(), this.formula())
    );
    this.name.set("");
    this.formula.set("");
  }

  /** Add an example's columns, skipping any already on the page. */
  addExample(specs: readonly FormulaColumnSpec[]): void {
    this.change(withFormulas(this.state.formulas(), specs));
  }

  /** Removing a formula also removes it from a copied or reloaded URL. */
  remove(key: string): void {
    this.change(withoutFormula(this.state.formulas(), key));
  }
}

/** Arabic controls and cell data, through the same filters kit as FilteringBody. */
@Component({
  selector: "adapt-showcase-rtl",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="mx-demo__body">
        <adapt-showcase-table
          [tableLabel]="presentation.locale === 'ar' ? 'الأشخاص' : 'People'"
          urlKey="rtl"
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class RtlBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.columnMenu(),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "rtl" }),
  ];
}

/** Timed row patches preserve the reader's view, matching RealtimeDemo.tsx. */
@Component({
  selector: "adapt-showcase-realtime",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="running()"
          (click)="running.set(!running())"
        >
          {{ running() ? "Pause updates" : "Resume updates" }}
        </button>
        <button type="button" class="seg__btn" (click)="patch()">
          Apply next update
        </button>
        <span class="hint"
          >Sort or select a row; its identity survives each patch.</span
        >
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          tableLabel="Live people"
          [urlSync]="false"
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [features]="features"
          [selectable]="true"
          [defaults]="{ limit: 10 }"
        />
      </div>
      <ol data-testid="patch-feed" aria-label="Live updates">
        @for (entry of feed(); track entry.id) {
          <li>{{ entry.text }}</li>
        }
      </ol>
    </div>
  `,
})
class RealtimeBody {
  readonly pageLayout = pageLayoutFor("realtime");
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly kit = inject(SHOWCASE_KIT);
  readonly features = pageChromeFeatures(this.kit, { urlKey: "rt" });
  readonly running = signal(
    new URLSearchParams(location.search).get("live") !== "off"
  );
  readonly feed = signal<readonly { id: number; text: string }[]>([]);
  private sequence = 0;

  constructor() {
    const timer = window.setInterval(() => {
      if (this.running()) this.patch();
    }, 2500);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }

  /** Apply a core row patch, retaining the update journal and stable ids. */
  patch(): void {
    const row = this.rows()[this.sequence % 10];
    if (!row) return;
    const nextBudget = budget(row) + 1000;
    this.rows.update((rows) =>
      applyRowPatches(
        rows,
        [updateRow<Person>(row.id, { budget: nextBudget })],
        rowKey
      )
    );
    this.feed.update((feed) =>
      [
        {
          id: ++this.sequence,
          text: `${row.name}: ${formatMoney(budget(row))} → ${formatMoney(nextBudget)}`,
        },
        ...feed,
      ].slice(0, 6)
    );
  }
}

/** Keyboard focus and a real live-region transcript, from AccessibilityDemo.tsx. */
@Component({
  selector: "adapt-showcase-accessibility",
  imports: [AdaptShowcaseTable],
  templateUrl: "./accessibilityBody.html",
})
class AccessibilityBody {
  readonly pageLayout = pageLayoutFor("accessibility");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.cellNavigation(),
    this.kit.columnSelectionCheckbox(),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: "a11y" }),
  ];
  readonly tableRoot = viewChild<ElementRef<HTMLElement>>("tableRoot");
  readonly announcements = signal<readonly string[]>([]);

  constructor() {
    let observer: MutationObserver | undefined;
    afterNextRender(() => {
      const root = this.tableRoot()?.nativeElement;
      if (!root) return;
      const previous = new WeakMap<Element, string>();
      const read = (): void => {
        for (const region of root.querySelectorAll(
          '[aria-live], [role="status"], [role="alert"]'
        )) {
          const text = region.textContent?.trim() ?? "";
          if (text === previous.get(region)) continue;
          previous.set(region, text);
          if (text)
            this.announcements.update((lines) => [text, ...lines].slice(0, 6));
        }
      };
      observer = new MutationObserver(read);
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
      });
      read();
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}

/** Feature slug to the demo that page shows. */
export const FEATURE_BODIES: Readonly<Record<string, Type<unknown>>> = {
  ai: AiBody,
  "agent-approval": AiBody,
  columns: ColumnsBody,
  aggregation: AggregationBody,
  pivot: PivotBody,
  formulas: FormulasBody,
  rtl: RtlBody,
  realtime: RealtimeBody,
  accessibility: AccessibilityBody,
  filtering: FilteringBody,
  selection: SelectionBody,
  "row-reordering": RowReorderingBody,
  editing: EditingBody,
  grouping: GroupingBody,
  export: ExportBody,
  scale: ScaleBody,
  "mobile-cards": MobileCardsBody,
  "saved-views": SavedViewsBody,
  tree: TreeBody,
  "nested-tables": NestedTablesBody,
  rows: RowsBody,
  "column-groups": ColumnGroupsBody,
};
