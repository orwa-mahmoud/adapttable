import { createMemoryAdapter } from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptLiveRegion } from "./a11y/liveRegion";
import { AdaptAttrs } from "./attrs";
import { AdaptCell } from "./cell";
import type { ColumnDef } from "./columnDef";
import { injectDataTable } from "./dataTable";
import { injectGridFocus } from "./focus/gridFocus";
import { injectRowSelection } from "./selection/selection";
import { injectFrontendData } from "./source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "./url/tableUrlState";

interface Person {
  id: string;
  name: string;
  age: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 28 },
  { id: "3", name: "Linus", age: 54 },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "age", header: "Age", sortable: true, accessor: (row) => row.age },
];

@Component({
  imports: [AdaptAttrs, AdaptCell, AdaptLiveRegion],
  template: `
    <input class="all" [adaptAttrs]="selection.headerCheckboxAttrs()" />
    @switch (table.bodyRegion()) {
      @case ("empty") {
        <output class="empty">{{ table.emptyVariant() }}</output>
      }
      @case ("mobile") {
        <ul>
          @for (row of table.rows(); track row.id; let i = $index) {
            <li [adaptAttrs]="table.cardAttrs(row, i)"></li>
          }
        </ul>
      }
      @default {
        <table [adaptAttrs]="grid.tableAttrs()">
          <thead>
            <tr>
              @for (
                column of table.columns();
                track column.key;
                let c = $index
              ) {
                <th [adaptAttrs]="grid.headerCellAttrs(column, c)">
                  <button [adaptAttrs]="table.sortButtonAttrs(column)">
                    {{ column.header }}
                  </button>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of table.rows(); track row.id; let i = $index) {
              <tr [adaptAttrs]="grid.rowAttrs(row, i)">
                <td>
                  <input
                    class="pick"
                    [adaptAttrs]="selection.rowCheckboxAttrs(row.id)"
                  />
                </td>
                @for (
                  column of table.columns();
                  track column.key;
                  let c = $index
                ) {
                  <td
                    [adaptAttrs]="grid.cellAttrs(column, i, c)"
                    [adaptCell]="column"
                    [adaptCellRow]="row"
                    [adaptCellIndex]="i"
                  ></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    }
    <div [adaptLiveRegion]="table.statusAnnouncement()" part="status"></div>
    <output [adaptLiveRegion]="grid.announcement()" part="grid"></output>
  `,
})
class ChromeTable {
  readonly data = signal<readonly Person[]>(PEOPLE);
  readonly navigable = signal(true);
  readonly mobile = signal(false);
  readonly controlled = signal<readonly string[] | undefined>(undefined);
  readonly changes: string[][] = [];
  readonly cleared: number[] = [];
  readonly source = injectFrontendData({
    data: this.data,
    columns: COLUMNS,
    paginationMode: "paged",
    defaults: { limit: 2 },
  });
  readonly selection = injectRowSelection({
    rows: computed(() => this.source().rows),
    rowKey: (row: Person) => row.id,
    selectedIds: this.controlled,
    onSelectionChange: (ids) => this.changes.push(ids),
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    tableLabel: "People",
    forceMobile: this.mobile,
    selection: this.selection,
    onClearFilters: () => this.cleared.push(1),
  });
  readonly grid = injectGridFocus({
    table: this.table,
    enabled: this.navigable,
  });
}

async function mount() {
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
    ],
  });
  const fixture = TestBed.createComponent(ChromeTable);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const settle = () => fixture.whenStable();
  const query = <T extends Element>(selector: string) =>
    element.querySelector<T>(selector);
  const all = <T extends Element>(selector: string) => [
    ...element.querySelectorAll<T>(selector),
  ];
  return { fixture, element, settle, query, all };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the Angular table chrome", () => {
  it("makes the table a grid that states its size", async () => {
    const { query, all } = await mount();
    const table = query<HTMLTableElement>("table");
    expect(table?.getAttribute("role")).toBe("grid");
    expect(table?.getAttribute("aria-rowcount")).toBe("3");
    expect(table?.getAttribute("aria-colcount")).toBe("2");
    const cells = all<HTMLElement>("[data-grid-cell]");
    expect(cells.map((cell) => cell.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
    ]);
    expect(all("th").map((th) => th.getAttribute("aria-colindex"))).toEqual([
      "1",
      "2",
    ]);
    expect(
      all("tbody tr").map((row) => row.getAttribute("aria-rowindex"))
    ).toEqual(["1", "2"]);
  });

  it("moves focus with the arrow keys and follows a clicked cell", async () => {
    const { query, settle, fixture } = await mount();
    const table = query<HTMLTableElement>("table");
    table!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    await settle();
    expect(document.activeElement?.getAttribute("data-grid-cell")).toBe("0:1");
    expect(fixture.componentInstance.grid.active()).toEqual({ row: 0, col: 1 });
    const target = query<HTMLElement>('[data-grid-cell="1:0"]');
    target!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    target!.dispatchEvent(new MouseEvent("mouseenter"));
    target!.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    target!.dispatchEvent(new FocusEvent("focus"));
    await settle();
    expect(fixture.componentInstance.grid.active()).toEqual({ row: 1, col: 0 });
    expect(fixture.componentInstance.grid.range()).toEqual({
      anchor: { row: 1, col: 0 },
      head: { row: 1, col: 0 },
    });
    fixture.componentInstance.grid.focusCell({ row: 0, col: 0 });
    await settle();
    expect(document.activeElement?.getAttribute("data-grid-cell")).toBe("0:0");
  });

  it("is a plain table while navigation is off", async () => {
    const { query, all, settle, fixture } = await mount();
    fixture.componentInstance.navigable.set(false);
    await settle();
    const table = query<HTMLTableElement>("table");
    expect(table?.getAttribute("role")).toBe("table");
    // A page still states the dataset's size and each row's place in it.
    expect(table?.getAttribute("aria-rowcount")).toBe("3");
    expect(query("[data-grid-cell]")).toBeNull();
    expect(
      all("tbody tr").map((row) => row.getAttribute("aria-rowindex"))
    ).toEqual(["1", "2"]);
    expect(fixture.componentInstance.grid.active()).toBeNull();
    expect(fixture.componentInstance.grid.range()).toBeNull();
    expect(fixture.componentInstance.grid.announcement()).toBe("");
  });

  it("selects rows from their checkboxes and from select-all", async () => {
    const { query, all, settle, fixture } = await mount();
    const selection = fixture.componentInstance.selection;
    const picks = all<HTMLInputElement>(".pick");
    expect(picks[0]?.getAttribute("aria-label")).toBe("Select row");
    picks[0]!.click();
    await settle();
    expect(selection.isSelected("1")).toBe(true);
    expect(all("tbody tr")[0]?.getAttribute("aria-selected")).toBe("true");
    expect(all("tbody tr")[1]?.getAttribute("aria-selected")).toBe("false");
    const header = query<HTMLInputElement>(".all");
    expect(header?.indeterminate).toBe(true);
    expect(selection.headerState()).toBe("some");
    header!.click();
    await settle();
    expect(selection.headerState()).toBe("all");
    expect(header?.checked).toBe(true);
    expect(selection.selectedCount()).toBe(2);
    header!.click();
    await settle();
    expect(selection.selectedCount()).toBe(0);
    selection.replace(["2", "3"]);
    expect([...selection.selectedIds()]).toEqual(["2", "3"]);
    selection.clear();
    expect(selection.selectedCount()).toBe(0);
    expect(fixture.componentInstance.changes.at(-1)).toEqual([]);
  });

  it("shows exactly the ids the host controls", async () => {
    const { all, settle, fixture } = await mount();
    const component = fixture.componentInstance;
    component.controlled.set(["2"]);
    await settle();
    expect(all("tbody tr")[1]?.getAttribute("aria-selected")).toBe("true");
    component.selection.toggle("1");
    await settle();
    // Controlled: the change is reported, and the host decides.
    expect(component.changes.at(-1)).toEqual(["2", "1"]);
    expect(component.selection.isSelected("1")).toBe(false);
  });

  it("announces a sort and a page once the rows settle", async () => {
    const { query, settle, fixture } = await mount();
    const region = query<HTMLElement>('[data-adapttable-part="status"]');
    expect(region?.textContent).toBe("");
    expect(region?.getAttribute("aria-live")).toBe("polite");
    query<HTMLButtonElement>("th:nth-child(2) button")!.click();
    await settle();
    expect(region?.textContent).toContain("Sorted by Age, ascending");
    const table = fixture.componentInstance.table;
    table.setPage(2);
    await settle();
    expect(region?.textContent).toContain("Page 2 of 2");
    expect(table.windowStart()).toBe(2);
    expect(table.pagerSlots().map((slot) => slot.item)).toEqual([1, 2]);
    expect(table.pageSizeOptions()).toContain(2);
    expect(table.showFooter()).toBe(true);
    table.setLimit(10);
    await settle();
    expect(table.pagination().totalPages).toBe(1);
  });

  it("lays the rows out as cards that state their identity", async () => {
    const { all, settle, fixture } = await mount();
    fixture.componentInstance.mobile.set(true);
    await settle();
    const cards = all<HTMLElement>("li");
    expect(cards.map((card) => card.dataset.rowId)).toEqual(["1", "2"]);
    expect(cards[0]?.dataset.adapttablePart).toBe("card");
    // Two of three rows are in the list, so each states its place.
    expect(cards[1]?.getAttribute("aria-posinset")).toBe("2");
    expect(cards[1]?.getAttribute("aria-setsize")).toBe("3");
    fixture.componentInstance.selection.toggle("2");
    await settle();
    expect(all<HTMLElement>("li")[1]?.hasAttribute("data-selected")).toBe(true);
  });

  it("says why it is empty, and clears its filters", async () => {
    const { query, settle, fixture } = await mount();
    const component = fixture.componentInstance;
    component.table.setSearch("nobody");
    await settle();
    expect(component.table.bodyRegion()).toBe("empty");
    expect(query(".empty")?.textContent).toBe("noResults");
    component.table.clearFilters();
    expect(component.cleared).toEqual([1]);
    component.table.setSearch("");
    component.data.set([]);
    await settle();
    expect(query(".empty")?.textContent).toBe("noData");
  });
});

@Component({
  imports: [AdaptAttrs],
  template: `
    <p class="count">{{ table.rows().length }}</p>
    @if (table.canLoadMore()) {
      <div class="more" [adaptAttrs]="table.loadMoreAttrs()">
        <button [adaptAttrs]="table.loadMoreButtonAttrs()"></button>
      </div>
    }
  `,
})
class InfiniteTable {
  readonly data = signal<readonly Person[]>(
    Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      name: `P${String(i)}`,
      age: i,
    }))
  );
  readonly source = injectFrontendData({
    data: this.data,
    paginationMode: "infinite",
    defaults: { limit: 3 },
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
}

describe("an infinite Angular list", () => {
  const observed: Element[] = [];
  let fire: (() => void) | undefined;
  let disconnects = 0;

  beforeEach(() => {
    observed.length = 0;
    disconnects = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: (entries: { isIntersecting: boolean }[]) => void
        ) {
          fire = () => {
            callback([{ isIntersecting: false }]);
            callback([{ isIntersecting: true }]);
          };
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {
          disconnects += 1;
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function mountInfinite() {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(InfiniteTable);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const count = () => element.querySelector(".count")?.textContent;
    return { fixture, element, count, settle: () => fixture.whenStable() };
  }

  it("loads the next rows from its button", async () => {
    const { element, count, settle } = await mountInfinite();
    expect(count()).toBe("3");
    element.querySelector<HTMLButtonElement>(".more button")!.click();
    await settle();
    expect(count()).toBe("6");
  });

  it("loads as the load-more area nears the viewport, until the rows run out", async () => {
    const { element, count, settle } = await mountInfinite();
    expect(observed).toEqual([element.querySelector(".more")]);
    fire?.();
    await settle();
    expect(count()).toBe("6");
    // The observer re-arms for the new row count.
    expect(disconnects).toBe(1);
    fire?.();
    await settle();
    expect(count()).toBe("7");
    expect(element.querySelector(".more")).toBeNull();
  });
});
