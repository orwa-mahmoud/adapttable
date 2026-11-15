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
import {
  injectChangedCellFlash,
  injectRowPatchStream,
} from "@adapttable/angular/stream";
import {
  applyRowPatchesWithLog,
  type RowPatchEvent,
  rowPatchLog,
} from "@adapttable/core";
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

import {
  pageDefaultsFor,
  pageLayoutFor,
  pivotRoster,
  rosterFor,
  seedRoster,
} from "../casts";
import { formatMoney } from "../people";
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
import {
  LANDING_ARRANGEMENTS,
  LANDING_URL_KEY,
  type LandingArrangement,
  landingArrangement,
} from "../shared/landingScenario";
import {
  forceMobileFor,
  MOBILE_BOUNDED_HEIGHT,
  MOBILE_CARDS,
  MOBILE_DATA_STATES,
  MOBILE_LAYOUTS,
  MOBILE_LOAD_ERROR,
  MOBILE_PAGING,
  MOBILE_START,
  MOBILE_TEXT,
  type MobileDataState,
  type MobileLayout,
  type MobilePaging,
  rowsFor,
} from "../shared/mobileScenario";
import {
  ACCESSIBILITY_HINTS,
  COLUMN_GROUP_HINTS,
  NESTED_HINTS,
  readAnnouncements,
  ROWS_HINTS,
  SELECTION_HINTS,
  TRANSCRIPT_LENGTH,
  TRANSCRIPT_TEXT,
} from "../shared/pageHints";
import { peopleBulkActions, peopleRowActions } from "../shared/peopleActions";
import {
  applyPersonRowEdit,
  EDITING_DEFAULT_LAYOUT,
  inWideOrder,
  liveNameUpdate,
} from "../shared/peopleTable";
import {
  PIVOT_AGGREGATORS,
  PIVOT_FIELDS,
  PIVOT_PAGE_SIZE,
  PIVOT_START,
  pivotCellFormat,
  pivotRowHeader,
} from "../shared/pivotScenario";
import {
  createDemoPatchSource,
  nextRealtimePatch,
  PATCH_STREAM_URL,
  personCellFlashing,
  REALTIME_FEED_LENGTH,
  REALTIME_HINTS,
  REALTIME_TEXT,
  realtimeStartsLive,
  streamStatusLabel,
} from "../shared/realtimeScenario";
import {
  orderPeopleByTeam,
  REORDER_HINTS,
  REORDER_SHAPES,
  reorderPeople,
  type ReorderShape,
  ROWS_PAGE_HEIGHT,
  teamSpan,
  withAddedPerson,
  withDuplicatedPerson,
  withoutPerson,
  withPersonMovedToGroup,
  withPersonMovedUnder,
} from "../shared/rowsScenario";
import {
  createSeededViewStorage,
  createViewSession,
  reportingMigration,
  SAVED_VIEWS_STORAGE_KEY,
  SAVED_VIEWS_URL_KEY,
  upgradedFooter,
} from "../shared/savedViewsScenario";
import {
  type BigPerson,
  makeBigList,
  SCALE_SLICE,
  scaleParams,
  scaleRowKey,
  serverSlice,
} from "../shared/scaleScenario";
import { TREE_HINTS, TREE_URL_KEY } from "../shared/treeScenario";
import { AiBody } from "./aiBody";
import {
  applyPersonEdit,
  currentDataLocale,
  type DemoOrder,
  demoOrders,
  fetchPeople,
  FILTER_DEFS,
  groupedPeopleColumns,
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
import { scaleColumns } from "./scaleColumns";
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
            [defaults]="pageDefaults"
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
  readonly pageDefaults = pageDefaultsFor("filtering");
  readonly pageLayout = pageLayoutFor("filtering");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("filtering");
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
      <div class="hint-row">
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
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
          [selectable]="true"
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class SelectionBody {
  readonly hints = SELECTION_HINTS;
  readonly pageDefaults = pageDefaultsFor("selection");
  readonly pageLayout = pageLayoutFor("selection");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("selection");
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
        <div class="seg" role="group" aria-label="Row shape">
          @for (option of shapes; track option.value) {
            <button
              type="button"
              class="seg__btn"
              [class.is-on]="shape() === option.value"
              [attr.aria-pressed]="shape() === option.value"
              (click)="shape.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
        }
        <button
          type="button"
          class="seg__btn"
          [class.is-on]="rtl"
          [attr.aria-pressed]="rtl"
          (click)="toggleDirection()"
        >
          RTL
        </button>
      </div>
      <div class="mx-demo__body">
        @for (current of mounted(); track current.shape) {
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
            [defaults]="pageDefaults"
            [features]="current.features"
          />
        }
      </div>
    </div>
  `,
})
class RowReorderingBody {
  readonly pageDefaults = pageDefaultsFor("row-reordering");
  readonly pageLayout = pageLayoutFor("row-reordering");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly shapes = REORDER_SHAPES;
  readonly hints = REORDER_HINTS;
  readonly rtl = SHOWCASE_PRESENTATION.dir === "rtl";
  readonly shape = signal<ReorderShape>("flat");
  readonly rows = signal<readonly Person[]>(rosterFor("row-reordering"));
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly chrome = pageChromeFeatures(this.kit, {
    urlKey: "reorder",
  });

  /**
   * The shape the table is mounted for — one entry, replaced when the shape
   * changes, so switching remounts the table the way React's `key` does.
   */
  readonly mounted = computed(() => {
    const shape = this.shape();
    return [{ shape, features: this.featuresFor(shape) }];
  });

  private featuresFor(shape: ReorderShape): readonly AdaptTableFeature[] {
    return [
      ...(shape === "grouped"
        ? [this.kit.groupingPanel([...PEOPLE_GROUP_BY], PEOPLE_GROUPING)]
        : []),
      ...(shape === "tree"
        ? [
            this.kit.tree<Person>({
              getParentId: reportsTo,
              treeColumn: "person",
            }),
          ]
        : []),
      this.kit.rowReorder<Person>(
        (from, to, row) => {
          this.rows.update((rows) => reorderPeople(rows, from, to, row, shape));
        },
        {
          movePolicy: "confirm",
          onGroupMove: (row, _fromGroup, toGroup, position) => {
            this.rows.update((rows) =>
              withPersonMovedToGroup(rows, row, toGroup, position)
            );
          },
          onTreeMove: (row, _fromParent, toParent, position) => {
            this.rows.update((rows) =>
              withPersonMovedUnder(rows, row, toParent.id, position)
            );
          },
        }
      ),
      ...this.chrome,
    ];
  }

  /** The page in the other direction: the same page, re-read in that language. */
  toggleDirection(): void {
    const url = new URL(location.href);
    url.searchParams.set("locale", this.rtl ? "en" : "ar");
    location.assign(url);
  }
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
          [defaults]="pageDefaults"
          [features]="features()"
          [defaultColumnLayout]="defaultLayout"
          [selectable]="true"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class EditingBody {
  readonly pageDefaults = pageDefaultsFor("editing");
  readonly defaultLayout = EDITING_DEFAULT_LAYOUT;
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(seedRoster("editing", false));
  readonly columns = peopleColumns({ editable: true });
  readonly rowKey = rowKey;
  readonly log = signal("Every change goes through the host.");
  readonly rejectNext = signal(false);
  readonly editingEnabled = signal(true);

  /** Patch the same localized name field an editor reads while its draft stays open. */
  receiveLiveUpdate(): void {
    const row = this.rows()[0];
    if (!row) return;
    const name = liveNameUpdate(row);
    this.rows.update((rows) => applyPersonEdit(rows, row, "person", name));
    this.log.set(`Received live name update: ${name}`);
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
            [defaults]="pageDefaults"
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
  readonly pageDefaults = pageDefaultsFor("grouping");
  readonly pageLayout = pageLayoutFor("grouping");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("grouping");
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
          [defaults]="pageDefaults"
          [defaultColumnLayout]="pageLayout"
          [features]="features()"
          [selectable]="selects()"
        />
      </div>
    </div>
  `,
})
class ExportBody implements OnInit {
  readonly pageDefaults = pageDefaultsFor("export");
  readonly pageLayout = pageLayoutFor("export");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("export");
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
      [defaults]="{ limit: limit }"
      [features]="features"
    />
  `,
})
class ScaleFrontendTable {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  private readonly params = scaleParams();
  readonly limit = this.params.all ? this.params.total : SCALE_SLICE;
  readonly rows = makeBigList(this.params.total);
  readonly columns = scaleColumns(this.params.cols);
  readonly rowKey = scaleRowKey;
  readonly features: readonly AdaptTableFeature[] = this.params.virtual
    ? [
        this.kit.virtualize({
          estimateRowSize: 48,
          virtualizeColumns: this.params.virtualCols,
        }),
      ]
    : [];
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
  private readonly params = scaleParams();
  private readonly slice = signal({ from: 0, limit: SCALE_SLICE });
  readonly source = injectServerData<BigPerson>({
    rows: computed(() =>
      serverSlice(this.slice().from, this.slice().limit, this.params.total)
    ),
    total: this.params.total,
    urlSync: false,
    paginationMode: "infinite",
    defaults: { limit: SCALE_SLICE },
    onQueryChange: (query) => {
      this.slice.set({
        from: (query.page - 1) * query.limit,
        limit: query.limit,
      });
    },
  });
  readonly columns = scaleColumns(this.params.cols);
  readonly rowKey = scaleRowKey;
  readonly features: readonly AdaptTableFeature[] = this.params.virtual
    ? [
        this.kit.virtualize({
          estimateRowSize: 48,
          virtualizeColumns: this.params.virtualCols,
        }),
      ]
    : [];
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
  private readonly total = scaleParams().total.toLocaleString("en-US");
  readonly hint = {
    frontend: `${this.total} rows — only the ones in view render`,
    server: `${this.total} rows on the server — each slice fetched as you scroll`,
    query: "Every page comes from an Angular Query infinite query",
  }[this.tier];
}

/**
 * Mobile cards: the same table flipped between its desktop layout and phone
 * cards, both pagination styles, the built-in or a custom card, a bounded
 * list, the table's data states, and a host callback on activation.
 */
@Component({
  selector: "adapt-showcase-mobile-cards",
  imports: [AdaptShowcaseTable, NgTemplateOutlet],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <div class="seg" role="group" [attr.aria-label]="text.layout">
          @for (option of layouts; track option.value) {
            <button
              type="button"
              class="seg__btn"
              [class.is-on]="layout() === option.value"
              [attr.aria-pressed]="layout() === option.value"
              (click)="layout.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <div class="seg" role="group" [attr.aria-label]="text.paging">
          @for (option of pagingOptions; track option.value) {
            <button
              type="button"
              class="seg__btn"
              [class.is-on]="paging() === option.value"
              [attr.aria-pressed]="paging() === option.value"
              (click)="paging.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <div class="seg" role="group" [attr.aria-label]="text.card">
          @for (option of cards; track option.label) {
            <button
              type="button"
              class="seg__btn"
              [class.is-on]="customCard() === option.value"
              [attr.aria-pressed]="customCard() === option.value"
              (click)="customCard.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <button
          type="button"
          class="seg__btn"
          [class.is-on]="bounded()"
          [attr.aria-pressed]="bounded()"
          (click)="bounded.set(!bounded())"
        >
          {{ text.bounded }}
        </button>
        <div class="seg" role="group" [attr.aria-label]="text.data">
          @for (option of dataStates; track option.value) {
            <button
              type="button"
              class="seg__btn"
              [class.is-on]="dataState() === option.value"
              [attr.aria-pressed]="dataState() === option.value"
              (click)="dataState.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <span class="hint">{{ text.hint }}</span>
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
      <div class="mx-demo__body">
        <div [class.phone-frame]="forceMobile() === true">
          <adapt-showcase-table
            [dir]="presentation.tableDir"
            [labels]="presentation.tableLabels"
            [attr.lang]="presentation.locale"
            tableLabel="People"
            mode="frontend"
            [urlSync]="false"
            [forceMobile]="forceMobile()"
            [features]="features"
            [onRowClick]="activate"
            [data]="shownRows()"
            [renderCard]="customCard() ? cardBody : undefined"
            [maxHeight]="bounded() ? boundedHeight : undefined"
            [paginationMode]="paging()"
            [loading]="dataState() === 'loading'"
            [error]="dataState() === 'error' ? loadError : null"
            [columns]="columns"
            [rowKey]="rowKey"
            [defaultColumnLayout]="pageLayout"
            [defaults]="pageDefaults"
          />
        </div>
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class MobileCardsBody {
  readonly text = MOBILE_TEXT;
  readonly layouts = MOBILE_LAYOUTS;
  readonly pagingOptions = MOBILE_PAGING;
  readonly cards = MOBILE_CARDS;
  readonly dataStates = MOBILE_DATA_STATES;
  readonly boundedHeight = MOBILE_BOUNDED_HEIGHT;
  readonly loadError = MOBILE_LOAD_ERROR;
  readonly pageDefaults = pageDefaultsFor("mobile");
  readonly pageLayout = pageLayoutFor("mobile");
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly layout = signal<MobileLayout>(MOBILE_START.layout);
  readonly paging = signal<MobilePaging>(MOBILE_START.paging);
  readonly customCard = signal(MOBILE_START.customCard);
  readonly bounded = signal(MOBILE_START.bounded);
  readonly dataState = signal<MobileDataState>(MOBILE_START.dataState);
  readonly forceMobile = computed(() => forceMobileFor(this.layout()));
  readonly rows = signal<readonly Person[]>(seedRoster("mobile", false));
  readonly shownRows = computed(() => rowsFor(this.rows(), this.dataState()));
  readonly log = signal<string>(MOBILE_TEXT.waiting);
  readonly activate = (row: Person): void => {
    this.log.set(MOBILE_TEXT.activated(row.name));
  };
  private readonly kit = inject(SHOWCASE_KIT);
  readonly columns = peopleColumns({ editable: true }).map((column) => {
    if (column.key === "person")
      return { ...column, cell: this.kit.personCell };
    if (column.key === "load") return { ...column, cell: this.kit.loadCell };
    return column;
  });
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.editing<Person>((row, key, value) => {
      this.rows.update((rows) => applyPersonEdit(rows, row, key, value));
    }),
    this.kit.rowEditing<Person>((row, patch) => {
      this.rows.update((rows) =>
        applyPersonRowEdit(rows, row, patch, currentDataLocale())
      );
    }),
    // Selection and the shared bulk bar over it, as on every page that selects.
    this.kit.bulkActions(peopleBulkActions(currentDataLocale())),
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
      <div class="hint-row">
        <div class="seg" role="group" aria-label="Row arrangement">
          @for (option of arrangements; track option.value) {
            <button
              type="button"
              class="seg__btn"
              [class.is-on]="arrangement() === option.value"
              [attr.aria-pressed]="arrangement() === option.value"
              (click)="arrangement.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlKey]="urlKey"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [selectable]="true"
          [defaults]="pageDefaults"
          [summaryRow]="summary"
          [features]="features()"
        />
      </div>
    </div>
  `,
})
export class AdaptShowcaseLandingTable {
  readonly pageDefaults = pageDefaultsFor("landing");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(seedRoster("landing", false));
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
  readonly urlKey = LANDING_URL_KEY;
  readonly arrangements = LANDING_ARRANGEMENTS;
  readonly arrangement = signal<LandingArrangement>(landingArrangement());
  private readonly chrome = pageChromeFeatures(this.kit, {
    editing: true,
    statusBar: true,
    urlKey: LANDING_URL_KEY,
  });
  private readonly grouping = this.kit.groupingPanel<Person>(
    [...PEOPLE_GROUP_BY],
    PEOPLE_GROUPING
  );
  readonly features = computed((): readonly AdaptTableFeature[] => [
    ...this.baseFeatures,
    ...(this.arrangement() === "grouped" ? [this.grouping] : []),
    ...this.chrome,
  ]);
  private readonly baseFeatures: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.columnMenu(),
    this.kit.savedViews({
      storageKey: `adapttable-angular-${this.kit.key}-${LANDING_URL_KEY}-views`,
      urlKey: LANDING_URL_KEY,
    }),
    this.kit.editing<Person>((row, key, value) => {
      this.rows.update((rows) => applyPersonEdit(rows, row, key, value));
    }),
    // The row actions' pencil opens the row's own form beside cell editing.
    this.kit.rowEditing<Person>((row, patch) => {
      this.rows.update((rows) =>
        applyPersonRowEdit(rows, row, patch, currentDataLocale())
      );
    }),
    this.kit.editHistory(),
    this.kit.undoRedoButtons(),
    this.kit.cellNavigation(),
    this.kit.bulkActions(peopleBulkActions(currentDataLocale())),
    this.kit.rowActions<Person>(
      peopleRowActions(currentDataLocale(), {
        onDelete: (row) => {
          this.rows.update((rows) => withoutPerson(rows, row));
        },
      })
    ),
    this.kit.exportCsv<Person>({ filename: "people-workspace.csv" }),
    this.kit.densityChooser(),
    this.kit.fullscreen(),
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
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
        }
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlKey]="urlKey"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class TreeBody {
  readonly pageDefaults = pageDefaultsFor("tree");
  readonly pageLayout = pageLayoutFor("tree");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly hints = TREE_HINTS;
  readonly urlKey = TREE_URL_KEY;
  readonly rows = rosterFor("tree");
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.tree<Person>({ getParentId: reportsTo, treeColumn: "person" }),
  ];
  readonly features: readonly AdaptTableFeature[] = [
    ...this.pageFeatures,
    ...pageChromeFeatures(this.kit, { urlKey: TREE_URL_KEY }),
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
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
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
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class NestedTablesBody {
  readonly hints = NESTED_HINTS;
  readonly pageDefaults = pageDefaultsFor("nested-tables");
  readonly pageLayout = pageLayoutFor("nested-tables");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("nested-tables");
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.nestedTable<Person>(
      (row) => ({ label: `Orders for ${row.name}`, table: OrdersTable }),
      [this.rows[0]!.id]
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
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
        }
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          urlKey="rows"
          [maxHeight]="maxHeight"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class RowsBody {
  readonly hints = ROWS_HINTS;
  readonly maxHeight = ROWS_PAGE_HEIGHT;
  readonly pageDefaults = pageDefaultsFor("rows");
  readonly pageLayout = pageLayoutFor("rows");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal(orderPeopleByTeam(seedRoster("rows", false)));
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
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
        }
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
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class ColumnGroupsBody {
  readonly hints = COLUMN_GROUP_HINTS;
  readonly pageDefaults = pageDefaultsFor("column-groups");
  readonly pageLayout = pageLayoutFor("column-groups");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(rosterFor("column-groups"));
  readonly columns = groupedPeopleColumns();
  readonly rowKey = rowKey;
  private readonly pageFeatures: readonly AdaptTableFeature[] = [
    this.kit.collapsibleColumnGroups(),
    this.kit.rowActions<Person>(
      peopleRowActions(currentDataLocale(), {
        onDelete: (row) => {
          this.rows.update((rows) => withoutPerson(rows, row));
        },
      })
    ),
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
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class ColumnsBody {
  readonly pageDefaults = pageDefaultsFor("columns");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("columns");
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
          [defaults]="pageDefaults"
          [defaultColumnLayout]="pageLayout"
          [summaryRow]="summary"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class AggregationBody {
  readonly pageDefaults = pageDefaultsFor("aggregation");
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
  readonly pageDefaults = pageDefaultsFor("formulas");
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
          [defaultColumnLayout]="pageLayout"
          [defaults]="pageDefaults"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class RtlBody {
  readonly pageDefaults = pageDefaultsFor("rtl");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly pageLayout = pageLayoutFor("rtl");
  readonly rows = rosterFor("rtl");
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
        @for (hint of hints; track hint) {
          <span class="hint">{{ hint }}</span>
        }
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          tableLabel="Live people"
          [urlSync]="false"
          mode="frontend"
          [onQueryChange]="followSort"
          [dir]="presentation.tableDir"
          [labels]="presentation.tableLabels"
          [attr.lang]="presentation.locale"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaultColumnLayout]="pageLayout"
          [features]="features"
          [isCellFlashing]="isCellFlashing"
          density="compact"
          [selectable]="true"
          [defaults]="pageDefaults"
        />
      </div>
      <div
        class="demo-live-update demo-live-update--feed"
        data-testid="realtime-feed"
        [attr.data-stream-status]="stream.status()"
      >
        <span>{{ text.feed }}</span>
        <button
          type="button"
          class="seg__btn"
          [attr.aria-pressed]="running()"
          (click)="running.set(!running())"
        >
          {{ running() ? text.pause : text.resume }}
        </button>
        <button type="button" class="seg__btn" (click)="applyNext()">
          {{ text.applyNext }}
        </button>
        <span class="visually-hidden" aria-live="polite">{{
          statusLabel(stream.status())
        }}</span>
        <span class="visually-hidden" aria-live="polite">{{
          feed()[0] ?? ""
        }}</span>
        @if (feed().length === 0) {
          <span>{{ text.waiting }}</span>
        } @else {
          <ol>
            @for (line of feed(); track $index) {
              <li>{{ line }}</li>
            }
          </ol>
        }
      </div>
    </div>
  `,
})
class RealtimeBody {
  readonly pageDefaults = pageDefaultsFor("realtime");
  readonly pageLayout = pageLayoutFor("realtime");
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly hints = REALTIME_HINTS;
  readonly text = REALTIME_TEXT;
  readonly statusLabel = streamStatusLabel;
  readonly rows = signal<readonly Person[]>(rosterFor("realtime"));
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  private readonly kit = inject(SHOWCASE_KIT);
  readonly features = pageChromeFeatures(this.kit, { urlKey: "rt" });
  readonly running = signal(realtimeStartsLive());
  readonly feed = signal<readonly string[]>([]);
  private readonly flash = injectChangedCellFlash({ enabled: true });
  readonly isCellFlashing = personCellFlashing(this.flash.isFlashing);
  private tick = 0;
  // The direction the table sorts in now: a patch lands where the reader is
  // looking, whichever way they have turned the sort.
  private sortDir: "asc" | "desc" = "desc";
  private pending: string | undefined;
  private pendingEvents: readonly RowPatchEvent<Person>[] | undefined;
  readonly stream = injectRowPatchStream<Person>({
    eventSource: computed(() =>
      this.running() ? PATCH_STREAM_URL : undefined
    ),
    enabled: this.running,
    getRowId: rowKey,
    createEventSource: createDemoPatchSource,
    onPatch: (update) => {
      const next = update(this.rows());
      this.pendingEvents = rowPatchLog(next)?.events;
      this.rows.set(next);
    },
    parse: () => {
      const next = nextRealtimePatch(this.rows(), this.tick, this.sortDir);
      if (!next) return [];
      this.tick += 1;
      this.pending = next.line;
      return [next.patch];
    },
    onPatches: () => {
      if (this.pending === undefined) return;
      this.landed(this.pending, this.pendingEvents ?? []);
      this.pending = undefined;
      this.pendingEvents = undefined;
    },
  });

  /** Keep the patcher's direction the table's own. */
  readonly followSort = (query: { readonly sortDir?: string }): void => {
    this.sortDir = query.sortDir === "asc" ? "asc" : "desc";
  };

  /** The same update the stream applies, applied once by hand. */
  applyNext(): void {
    const next = nextRealtimePatch(this.rows(), this.tick, this.sortDir);
    if (!next) return;
    this.tick += 1;
    const log = applyRowPatchesWithLog(this.rows(), [next.patch], rowKey);
    this.rows.set(log.rows);
    this.landed(next.line, log.events);
  }

  /** Record what was applied: the feed's newest line and the cells to flash. */
  private landed(line: string, events: readonly RowPatchEvent<Person>[]): void {
    this.feed.update((lines) =>
      [line, ...lines].slice(0, REALTIME_FEED_LENGTH)
    );
    this.flash.mark(events);
  }
}

/** Keyboard focus and a real live-region transcript, from AccessibilityDemo.tsx. */
@Component({
  selector: "adapt-showcase-accessibility",
  imports: [AdaptShowcaseTable],
  templateUrl: "./accessibilityBody.html",
})
class AccessibilityBody {
  readonly hints = ACCESSIBILITY_HINTS;
  readonly transcript = TRANSCRIPT_TEXT;
  readonly pageDefaults = pageDefaultsFor("accessibility");
  readonly pageLayout = pageLayoutFor("accessibility");
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = rosterFor("accessibility");
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
      let last = "";
      const read = (): void => {
        const next = readAnnouncements(root, last);
        last = next.last;
        if (next.lines.length === 0) return;
        this.announcements.update((lines) =>
          [...next.lines, ...lines].slice(0, TRANSCRIPT_LENGTH)
        );
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
