import { createMemoryAdapter, type UrlStateAdapter } from "@adapttable/core";
import { Component, signal, viewChildren } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptAttrs } from "./attrs";
import { AdaptCell, AdaptCellTemplate, AdaptHeader } from "./cell";
import type { ColumnDef } from "./columnDef";
import { injectDataTable } from "./dataTable";
import { injectFrontendData } from "./source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "./url/tableUrlState";

interface Person {
  id: string;
  name: string;
  age: number;
  city: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Alice", age: 31, city: "Dubai" },
  { id: "2", name: "Bob", age: 25, city: "Cairo" },
  { id: "3", name: "Carol", age: 42, city: "Amman" },
  { id: "4", name: "Dan", age: 19, city: "Dubai" },
  { id: "5", name: "Eve", age: 37, city: "Beirut" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", sortable: true, accessor: (row) => row.name },
  { key: "age", header: "Age", sortable: true, sortValue: (row) => row.age },
  { key: "city" },
];

@Component({
  imports: [AdaptAttrs, AdaptCell, AdaptHeader, AdaptCellTemplate],
  template: `
    <input [adaptAttrs]="table.searchInputAttrs()" />
    <table [adaptAttrs]="table.tableAttrs()">
      <thead>
        <tr [adaptAttrs]="table.headerRowAttrs()">
          @for (column of table.columns(); track column.key) {
            <th [adaptAttrs]="table.headerCellAttrs(column)">
              <button [adaptAttrs]="table.sortButtonAttrs(column)">
                <span [adaptHeader]="column"></span>
              </button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of table.rows(); track table.rowKey(row); let i = $index) {
          <tr [adaptAttrs]="table.rowAttrs(row, i)">
            @for (column of table.columns(); track column.key) {
              <td
                [adaptAttrs]="table.cellAttrs(column)"
                [adaptCell]="column"
                [adaptCellRow]="row"
                [adaptCellIndex]="i"
              ></td>
            }
          </tr>
        }
      </tbody>
    </table>
    <p class="range">
      {{ table.pagination().fromIndex }}–{{ table.pagination().toIndex }} of
      {{ table.source().total }}
    </p>
    <ng-template adaptCellTemplate="city" let-row let-value="value">
      <b>{{ value }}</b>
    </ng-template>
  `,
})
class PeopleTable {
  readonly data = signal<readonly Person[]>(PEOPLE);
  readonly templates = viewChildren(AdaptCellTemplate);
  readonly source = injectFrontendData({
    data: this.data,
    columns: COLUMNS,
    paginationMode: "paged",
    defaults: { limit: 2 },
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    tableLabel: "People",
    cellTemplates: this.templates,
  });
}

async function mount(search = "") {
  const adapter: UrlStateAdapter = createMemoryAdapter(search);
  TestBed.configureTestingModule({
    providers: [{ provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter }],
  });
  const fixture = TestBed.createComponent(PeopleTable);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const names = () =>
    [...element.querySelectorAll("tbody tr")].map(
      (row) => row.querySelector("td")?.textContent?.trim() ?? ""
    );
  const settle = async () => {
    await fixture.whenStable();
  };
  return { fixture, element, adapter, names, settle };
}

describe("a headless Angular table", () => {
  it("renders the first page with its accessible structure", async () => {
    const { element, names } = await mount();
    const table = element.querySelector("table");
    expect(table?.getAttribute("role")).toBe("table");
    expect(table?.getAttribute("aria-label")).toBe("People");
    expect(names()).toEqual(["Alice", "Bob"]);
    const rows = element.querySelectorAll("tbody tr");
    expect(rows[0]?.getAttribute("data-adapttable-part")).toBe("row");
    expect(rows[0]?.getAttribute("data-row-id")).toBe("1");
    const headers = [...element.querySelectorAll("th")].map((th) =>
      th.textContent?.trim()
    );
    expect(headers).toEqual(["Name", "Age", "City"]);
    expect(element.querySelector(".range")?.textContent).toContain("1–2 of");
  });

  it("fills a cell from a template declared beside the table", async () => {
    const { element } = await mount();
    const city = element.querySelector('tbody td[data-column-key="city"] b');
    expect(city?.textContent).toBe("Dubai");
  });

  it("sorts when a header's sort button is pressed and writes the URL", async () => {
    const { element, names, adapter, settle } = await mount();
    const ageButton = element.querySelectorAll("th button")[1] as HTMLElement;
    ageButton.click();
    await settle();
    expect(names()).toEqual(["Dan", "Bob"]);
    const ageHeader = element.querySelectorAll("th")[1];
    expect(ageHeader?.getAttribute("aria-sort")).toBe("ascending");
    expect(adapter.getSearch()).toContain("sortBy=age");

    ageButton.click();
    await settle();
    expect(names()).toEqual(["Carol", "Eve"]);
    expect(ageHeader?.getAttribute("aria-sort")).toBe("descending");
  });

  it("searches from the search box", async () => {
    const { element, names, adapter, settle } = await mount();
    const input = element.querySelector("input")!;
    expect(input.getAttribute("role")).toBe("searchbox");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    input.value = "dubai";
    input.dispatchEvent(new Event("input"));
    // The term commits once typing pauses, not on the keystroke.
    expect(adapter.getSearch()).not.toContain("q=");
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await settle();
    expect(names()).toEqual(["Alice", "Dan"]);
    expect(adapter.getSearch()).toContain("q=dubai");
    expect(input.value).toBe("dubai");
  });

  it("pages through the rows", async () => {
    const { fixture, names, adapter, settle } = await mount();
    fixture.componentInstance.table.setPage(3);
    await settle();
    expect(names()).toEqual(["Eve"]);
    expect(adapter.getSearch()).toContain("page=3");
    expect(fixture.componentInstance.table.pagination().totalPages).toBe(3);
  });

  it("restores sort, search and page from the URL", async () => {
    const { names, fixture } = await mount(
      "sortBy=age&sortDir=desc&page=2&limit=2"
    );
    expect(names()).toEqual(["Alice", "Bob"]);
    expect(fixture.componentInstance.table.sortBy()).toBe("age");
    expect(fixture.componentInstance.table.sortDir()).toBe("desc");
  });

  it("follows the URL when it changes underneath the table", async () => {
    const { names, adapter, settle } = await mount();
    adapter.setSearch("q=carol");
    await settle();
    expect(names()).toEqual(["Carol"]);
  });

  it("follows new data", async () => {
    const { fixture, names, settle } = await mount();
    fixture.componentInstance.data.set([
      { id: "9", name: "Zed", age: 50, city: "Doha" },
    ]);
    await settle();
    expect(names()).toEqual(["Zed"]);
  });

  it("publishes each frame to the engine an agent reads", async () => {
    const { fixture, settle } = await mount();
    const engine = fixture.componentInstance.source().tableEngine;
    expect(engine?.snapshot().total).toBe(5);
    fixture.componentInstance.table.setSearch("  bob  ");
    await settle();
    expect(engine?.snapshot().total).toBe(1);
  });
});
