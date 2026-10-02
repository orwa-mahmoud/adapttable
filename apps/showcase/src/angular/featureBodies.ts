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
  type AdaptTableFeature,
  aggregate,
  type CellContext,
  type ColumnDef,
  type ColumnLayoutState,
  injectFrontendData,
  injectQuerySource,
  injectServerData,
  type NestedTableDefaults,
} from "@adapttable/angular";
import {
  buildFormulaColumns,
  injectFormulaUrlState,
} from "@adapttable/angular/formula";
import {
  injectPivotUrlState,
  pivot,
  type PivotField,
  type PivotRow,
} from "@adapttable/angular/pivot";
import { applyRowPatches, applyRowReorder, updateRow } from "@adapttable/core";
import { xlsxWriter } from "@adapttable/core/xlsx";
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
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

import { budget, formatMoney, personStatus, utilization } from "../people";
import { AiBody } from "./aiBody";
import {
  applyPersonEdit,
  type DemoOrder,
  demoOrders,
  fetchPeople,
  FILTER_DEFS,
  groupedPeopleColumns,
  largePerson,
  makeLargeDirectory,
  PEOPLE,
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
import { SHOWCASE_KIT } from "./showcaseKit";

/** The people columns, shared by every page that does not edit them. */
const COLUMNS = peopleColumns();

/** The three ways the filtering page lays its filters out. */
type FilterLayout = "popover" | "drawer" | "header";

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
        <div class="seg" role="group" aria-label="Filter layout">
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
      </div>
      <div class="mx-demo__body">
        @for (current of mounted(); track current) {
          <adapt-showcase-table
            [dir]="presentation.dir"
            [labels]="presentation.labels"
            [attr.lang]="presentation.locale"
            tableLabel="People"
            urlKey="flt"
            [data]="rows"
            [columns]="columns"
            [rowKey]="rowKey"
            [filtersMode]="current === 'drawer' ? 'drawer' : 'popover'"
            [features]="featuresFor(current)"
          />
        }
      </div>
    </div>
  `,
})
class FilteringBody {
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
  /**
   * The layout the table is mounted for — one entry, replaced when the layout
   * changes, so switching remounts the table the way React's `key` does.
   */
  readonly mounted = computed(() => [this.layout()]);
  private readonly panel: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
  ];
  private readonly header: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.headerFilters(),
  ];

  /** The header layout adds the funnels; the others keep the panel's fields. */
  featuresFor(layout: FilterLayout): readonly AdaptTableFeature[] {
    return layout === "header" ? this.header : this.panel;
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
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
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly log = signal("Select rows, then run a bulk action.");
  readonly features: readonly AdaptTableFeature[] = [
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 10 }"
          [features]="features"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class RowReorderingBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly log = signal("Drag a grip, or lift a row with Space.");
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.rowReorder<Person>((from, to, row) => {
      this.rows.update((rows) => applyRowReorder(rows, from, to));
      this.log.set(
        `Moved ${row.name} from ${String(from + 1)} to ${String(to + 1)}`
      );
    }),
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          editConflictPolicy="ask"
          [urlSync]="false"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 10 }"
          [features]="features()"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class EditingBody {
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
  ];
  readonly features = computed<readonly AdaptTableFeature[]>(() => [
    ...(this.editingEnabled() ? [this.editingFeature] : []),
    ...this.persistentFeatures,
  ]);
}

/** Grouping: the panel, nested groups, and aggregates in the headers. */
@Component({
  selector: "adapt-showcase-grouping",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          urlKey="grp"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class GroupingBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.groupingPanel(["team", "status"]),
  ];
}

/** Export: a CSV of the current view from the toolbar. */
@Component({
  selector: "adapt-showcase-export",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [features]="features"
          [selectable]="scope === 'selected'"
        />
      </div>
    </div>
  `,
})
class ExportBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly scope = (() => {
    const scope =
      typeof location === "undefined"
        ? null
        : new URLSearchParams(location.search).get("scope");
    return scope === "selected" || scope === "range" ? scope : "page";
  })();
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.exportCsv({ scope: this.scope }),
    ...(this.scope === "range" ? [this.kit.cellNavigation()] : []),
  ];
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
      [dir]="presentation.dir"
      [labels]="presentation.labels"
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
      [dir]="presentation.dir"
      [labels]="presentation.labels"
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
      [dir]="presentation.dir"
      [labels]="presentation.labels"
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
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="mx-demo__body mx-phone">
        <adapt-showcase-table
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [forceMobile]="true"
          [selectable]="true"
          [onRowClick]="activateRow"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 8 }"
        />
      </div>
      <p class="hint" role="status" data-demo-log>{{ log() }}</p>
    </div>
  `,
})
class MobileCardsBody {
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly log = signal("Activate a person to see the host callback.");
  readonly activateRow = (row: Person): void =>
    this.log.set(`Activated ${row.name}`);
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
}

/** Saved views: name the table's state and pick it again from the menu. */
@Component({
  selector: "adapt-showcase-saved-views",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="hint-row">
        <span class="hint"
          >Sort or filter, then save the view under a name</span
        >
      </div>
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          urlKey="views"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class SavedViewsBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.savedViews({
      storageKey: `adapttable-angular-${this.kit.key}-demo-views`,
      urlKey: "views",
    }),
  ];
}

/** The landing page's table: filters, sorting and paging, nothing to explain. */
@Component({
  selector: "adapt-showcase-landing-table",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <div class="mx-demo__body">
        <adapt-showcase-table
          [dir]="presentation.dir"
          [labels]="presentation.labels"
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
export class AdaptShowcaseLandingTable {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          [urlSync]="false"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 30 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class TreeBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.tree<Person>({ getParentId: reportsTo, treeColumn: "person" }),
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
      [dir]="presentation.dir"
      [labels]="presentation.labels"
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
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
class NestedTablesBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.nestedTable<Person>(
      (row) => ({ label: `Orders for ${row.name}`, table: OrdersTable }),
      [PEOPLE[0]!.id]
    ),
  ];
}

/** Cluster teammates so a Team span has a consecutive run to cover. */
function orderPeopleByTeam(rows: readonly Person[]): Person[] {
  return [...rows].sort((a, b) => {
    const byTeam = a.team.localeCompare(b.team);
    if (byTeam !== 0) return byTeam;
    return Number(a.id) - Number(b.id);
  });
}

/**
 * Merge a team that runs down consecutive rows. The origin of the run owns
 * the cell; the rows under it draw nothing there.
 */
function teamSpan({
  column,
  sectionRows,
  sectionRowIndex,
}: {
  column: { key: string };
  sectionRows: readonly Person[];
  sectionRowIndex: number;
}) {
  if (column.key !== "team") return undefined;
  const current = sectionRows[sectionRowIndex];
  if (current === undefined) return undefined;
  if (sectionRows[sectionRowIndex - 1]?.team === current.team) return undefined;
  let rowSpan = 1;
  while (sectionRows[sectionRowIndex + rowSpan]?.team === current.team) {
    rowSpan += 1;
  }
  return rowSpan > 1 ? { rowSpan } : undefined;
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          tableLabel="People"
          urlKey="rows"
          [maxHeight]="420"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [defaults]="{ limit: 30 }"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class RowsBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal(orderPeopleByTeam(PEOPLE));
  private nextId = Math.max(...PEOPLE.map((row) => Number(row.id)));
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.rowPinning(),
    this.kit.cellSpan(teamSpan),
    this.kit.rowActions<Person>([], {
      layout: "menu",
      onAddRow: () => {
        this.rows.update((rows) => [
          {
            ...PEOPLE[0]!,
            id: String(++this.nextId),
            name: "New person",
          },
          ...rows,
        ]);
      },
      onDuplicateRow: (row) => {
        this.rows.update((rows) => [
          { ...row, id: String(++this.nextId) },
          ...rows,
        ]);
      },
      onDeleteRow: (row) => {
        this.rows.update((rows) =>
          rows.filter((current) => current.id !== row.id)
        );
      },
    }),
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
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
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.collapsibleColumnGroups(),
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
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
  readonly columns: readonly ColumnDef<Person>[] = [
    ...COLUMNS.map((column) => ({
      ...column,
      minWidth: typeof column.width === "number" ? column.width : undefined,
    })),
    { key: "email", header: "Email", width: 280, minWidth: 280 },
    { key: "role", header: "Role", width: 220, minWidth: 220 },
  ];
  readonly layout = signal<ColumnLayoutState>({
    hidden: [],
    order: [],
    widths: {},
    pinned: { person: "start" },
  });
  readonly features: readonly AdaptTableFeature[] = [
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
}

/** Group and footer totals, matching AggregationDemo.tsx's three surfaces. */
@Component({
  selector: "adapt-showcase-aggregation",
  imports: [AdaptShowcaseTable],
  template: `
    <div class="mx-demo">
      <p class="hint">
        Search updates the group and footer totals. The pinned portfolio total
        stays outside the filtered data.
      </p>
      <div class="mx-demo__body">
        <adapt-showcase-table
          tableLabel="People budgets"
          urlKey="agg"
          [maxHeight]="420"
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [summaryRow]="summary"
          [features]="features"
        />
      </div>
    </div>
  `,
})
class AggregationBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly rowKey = rowKey;
  readonly columns = COLUMNS.filter((column) =>
    ["person", "team", "budget"].includes(column.key)
  );
  readonly summary = aggregate<Person>(
    { budget: "sum" },
    {
      columns: this.columns,
      format: (value) =>
        typeof value === "number" ? formatMoney(value) : value,
    }
  );
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.groupingPanel<Person>("team", {
      groupAggregates: aggregate<Person>(
        { budget: "sum" },
        { columns: this.columns }
      ),
      groupFooters: true,
    }),
    this.kit.pinnedSummaryRows<Person>({
      top: [
        {
          ...PEOPLE[0]!,
          id: "portfolio-total",
          name: "Portfolio total",
          nameAr: "إجمالي المحفظة",
          team: "",
          teamAr: "",
          budget: PEOPLE.reduce((total, row) => total + budget(row), 0),
        },
      ],
    }),
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
  readonly fields: readonly PivotField[] = [
    { key: "team", label: "Team" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "budget", label: "Budget" },
  ];
  readonly rows = PEOPLE.map((row) => ({
    ...row,
    budget: budget(row),
    status: personStatus(row),
  }));
  readonly state = injectPivotUrlState({
    urlKey: "pivot",
    defaultConfig: {
      rows: ["team"],
      columns: ["status"],
      measures: [{ key: "budget", agg: "sum" }],
    },
  });
  readonly caption =
    viewChild<TemplateRef<CellContext<PivotRow>>>("pivotCaption");
  readonly model = computed(() => {
    const caption = this.caption();
    return this.kit.pivotTableModel(
      pivot(this.rows, this.state.config(), {
        collapsed: this.state.collapsed(),
        format: (value) =>
          typeof value === "number" ? formatMoney(value) : value,
      }),
      {
        fields: this.fields,
        labels: this.presentation.labels,
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
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE.map((row) => ({
    ...row,
    budget: budget(row),
    utilization: utilization(row),
  }));
  readonly rowKey = rowKey;
  readonly name = signal("");
  readonly formula = signal("");
  readonly state = injectFormulaUrlState({
    urlKey: "fx",
    defaultFormulas: [
      { key: "margin", header: "Margin", formula: "=ROUND(budget * 0.15, 0)" },
      { key: "tag", header: "Tag", formula: '=UPPER(team) & " · " & role' },
    ],
  });
  readonly derived = computed(() =>
    buildFormulaColumns<Person>(this.state.formulas())
  );
  readonly columns = computed(() => [
    ...COLUMNS.filter((column) =>
      ["person", "team", "budget"].includes(column.key)
    ),
    ...this.derived().columns,
  ]);
  readonly errors = computed(() => Object.entries(this.derived().errors));

  /** Build one new column through the binding; evaluation stays in core. */
  add(): void {
    const formula = this.formula().trim();
    if (!formula) return;
    const header = this.name().trim();
    const stem = header.replaceAll(/\W/g, "") || "formula";
    let key = stem;
    let suffix = 1;
    while (this.columns().some((column) => column.key === key))
      key = `${stem}${String(++suffix)}`;
    this.state.onFormulasChange([
      ...this.state.formulas(),
      { key, header: header || key, formula },
    ]);
    this.name.set("");
    this.formula.set("");
  }

  /** Removing a formula also removes it from a copied or reloaded URL. */
  remove(key: string): void {
    this.state.onFormulasChange(
      this.state.formulas().filter((formula) => formula.key !== key)
    );
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
          tableLabel="الأشخاص"
          urlKey="rtl"
          [dir]="presentation.dir"
          [labels]="presentation.labels"
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
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.filters(FILTER_DEFS),
    this.kit.columnMenu(),
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
          [dir]="presentation.dir"
          [labels]="presentation.labels"
          [attr.lang]="presentation.locale"
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
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
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal<readonly Person[]>(peopleRows());
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
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
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = rowKey;
  readonly features: readonly AdaptTableFeature[] = [
    this.kit.cellNavigation(),
    this.kit.columnSelectionCheckbox(),
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
