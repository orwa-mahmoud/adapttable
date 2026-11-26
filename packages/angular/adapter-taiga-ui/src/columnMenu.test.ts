import { type ColumnDef, type ColumnLayoutState } from "@adapttable/angular";
import { columnMenu } from "@adapttable/taiga-ui/column-menu";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { columnMenuTests } from "../../angular/test/kit/suites/columnMenu";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";
import { clickOutsideTaiga } from "./taigaTestHelpers";

for (const test of columnMenuTests(kit)) it(test.name, test.run);

interface City {
  id: string;
  name: string;
  country: string;
  population: number;
}

const CITIES: City[] = [
  { id: "1", name: "Dubai", country: "UAE", population: 3 },
  { id: "2", name: "Amman", country: "Jordan", population: 4 },
];

const COLUMNS: ColumnDef<City>[] = [
  {
    key: "name",
    sortable: true,
    renameable: true,
    accessor: (row) => row.name,
  },
  { key: "country", renameable: true, accessor: (row) => row.country },
  {
    key: "population",
    lockVisibility: true,
    accessor: (row) => row.population,
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
      [features]="features"
      [forceMobile]="false"
      (columnLayoutChange)="layouts.push($event)"
    />
  `,
})
class Host {
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly features = [
    columnMenu({ onRename: (key, name) => this.rename(key, name) }),
  ];
  readonly renames: [string, string][] = [];
  readonly layouts: ColumnLayoutState[] = [];
  readonly rename = (key: string, name: string) => {
    this.renames.push([key, name]);
  };
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
    />
  `,
})
class Plain {
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const part = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) =>
    root.querySelector<T>(
      `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
    );
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [
    ...root.querySelectorAll<T>(
      `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
    ),
  ];
  const headers = () =>
    parts("header-cell").map((cell) => cell.dataset.columnKey);
  const settle = () => fixture.whenStable();
  const open = async () => {
    const button = part<HTMLButtonElement>("column-menu-button")!;
    button.focus();
    button.click();
    await settle();
  };
  const item = (index: number) => parts("column-menu-item")[index];
  return { fixture, element, part, parts, headers, settle, open, item };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the Taiga UI Angular Columns menu", () => {
  it("draws nothing without the feature", async () => {
    const fixture = TestBed.createComponent(Plain);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-taiga-part="column-menu"]')).toBeNull();
  });

  it("opens a panel listing every column, and closes on Escape", async () => {
    const { part, parts, open, settle } = await mount();
    const button = part<HTMLButtonElement>("column-menu-button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    button!.focus();
    await open();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(part("column-menu-panel")).not.toBeNull();
    expect(
      parts("column-menu-label").map((label) => label.textContent)
    ).toEqual(["Name", "Country", "Population"]);
    part<HTMLInputElement>("column-menu-search")!.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(part("column-menu-panel")).toBeNull();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
    await open();
    expect(part("column-menu-panel")).not.toBeNull();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    button!.click();
    await settle();
    expect(part("column-menu-panel")).toBeNull();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on a press outside it", async () => {
    const { fixture, part, open } = await mount();
    await open();
    await clickOutsideTaiga(fixture);
    expect(part("column-menu-panel")).toBeNull();
  });

  it("cancels a rename with Escape or its button", async () => {
    const { part, parts, open, item, settle } = await mount();
    await open();
    const beginRename = async () => {
      parts<HTMLButtonElement>("column-menu-action", item(0))
        .find((action) => action.textContent?.trim() === "Rename column")!
        .click();
      await settle();
    };
    part<HTMLButtonElement>("column-menu-more", item(0))!.click();
    await settle();
    await beginRename();
    part("column-rename-input", item(0))!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(part("column-rename-form", item(0))).toBeNull();
    if (!part("column-menu-panel")) await open();
    part<HTMLButtonElement>("column-menu-more", item(0))!.click();
    await settle();
    await beginRename();
    part<HTMLButtonElement>("column-rename-cancel", item(0))!.click();
    await settle();
    expect(part("column-rename-form", item(0))).toBeNull();
  });
});

describe("a controlled column layout", () => {
  @Component({
    imports: [AdaptDataTable],
    template: `
      <adapt-data-table
        [data]="data"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="false"
        [columnLayout]="layout()"
        (columnLayoutChange)="layout.set($event)"
      />
    `,
  })
  class Controlled {
    readonly data = CITIES;
    readonly columns = COLUMNS;
    readonly rowKey = (row: City) => row.id;
    readonly layout = signal<ColumnLayoutState>({
      hidden: ["name"],
      order: [],
      pinned: {},
      widths: {},
    });
  }

  it("shows the layout the host holds", async () => {
    const fixture = TestBed.createComponent(Controlled);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const headers = () =>
      [
        ...element.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="header-cell"]'
        ),
      ].map((cell) => cell.dataset.columnKey);
    expect(headers()).toEqual(["country", "population"]);
    fixture.componentInstance.layout.set({
      hidden: [],
      order: ["population"],
      pinned: {},
      widths: {},
    });
    await fixture.whenStable();
    expect(headers()).toEqual(["population", "name", "country"]);
  });
});
