/**
 * The table's locale: columns that read by `i18n` path show, filter, search
 * and sort that locale's field, from one input on the table.
 */
import type { ColumnDef } from "@adapttable/angular";
import { filters } from "@adapttable/angular-unstyled/filters";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface Person {
  id: string;
  team: string;
  teamAr: string;
}

const PEOPLE: Person[] = [
  { id: "1", team: "Design", teamAr: "التصميم" },
  { id: "2", team: "Data", teamAr: "البيانات" },
];

const COLUMNS: ColumnDef<Person>[] = [
  {
    key: "team",
    header: "Team",
    sortable: true,
    i18n: { ar: "teamAr" },
    filter: { type: "select", options: "auto" },
  },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [locale]="locale()"
      [searchDebounceMs]="0"
      [features]="features"
      filtersMode="drawer"
    />
  `,
})
class LocalizedTable {
  readonly data = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly locale = signal<string | undefined>("ar");
  readonly features = [filters<Person>([])];
}

async function mount() {
  const fixture = TestBed.createComponent(LocalizedTable);
  fixture.autoDetectChanges();
  document.body.append(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const cells = () =>
    [...element.querySelectorAll('td[data-column-key="team"]')].map((cell) =>
      cell.textContent.trim()
    );
  return { fixture, element, cells };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("the table's locale", () => {
  it("shows the locale's field in the cells", async () => {
    const { fixture, cells } = await mount();
    expect(cells()).toEqual(["التصميم", "البيانات"]);
    fixture.componentInstance.locale.set(undefined);
    await fixture.whenStable();
    expect(cells()).toEqual(["Design", "Data"]);
  });

  it("offers the locale's values as filter choices", async () => {
    const { element, fixture } = await mount();
    element
      .querySelector<HTMLButtonElement>(
        '[data-adapttable-part="filters-button"]'
      )
      ?.click();
    await fixture.whenStable();
    const choices = [
      ...document.querySelectorAll<HTMLOptionElement>(
        '[data-adapttable-part="filter-select"] option'
      ),
    ].map((option) => option.textContent.trim());
    expect(choices).toEqual(expect.arrayContaining(["التصميم", "البيانات"]));
    expect(choices).not.toContain("Design");
  });

  it("searches the locale's field", async () => {
    const { element, fixture, cells } = await mount();
    const search = element.querySelector<HTMLInputElement>(
      '[data-adapttable-part="search"]'
    )!;
    search.value = "التصميم";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    expect(cells()).toEqual(["التصميم"]);
  });
});

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [mobileBreakpoint]="1200"
    />
  `,
})
class WideBreakpointTable {
  readonly data = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
}

describe("the table's mobile breakpoint", () => {
  it("shows cards at or below the width the host names", async () => {
    // jsdom has no media queries: answer only for the breakpoint asked for.
    const queries: string[] = [];
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => {
        queries.push(query);
        return {
          matches: query === "(max-width: 1200px)",
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        };
      },
    });
    try {
      const fixture = TestBed.createComponent(WideBreakpointTable);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(queries).toContain("(max-width: 1200px)");
      expect(
        element.querySelector('[data-adapttable-part="cards"]')
      ).not.toBeNull();
    } finally {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });
});
