import type { ColumnDef, ColumnLayoutState } from "@adapttable/angular";
import { columnMenu } from "@adapttable/ngx-bootstrap/column-menu";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ngxBootstrapPart, pressEscapeFrom } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

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
      [onColumnRename]="rename"
      [forceMobile]="false"
      (columnLayoutChange)="layouts.push($event)"
    />
  `,
})
class Host {
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly features = [columnMenu()];
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
  ) => root.querySelector<T>(ngxBootstrapPart(name));
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [...root.querySelectorAll<T>(ngxBootstrapPart(name))];
  const headers = () =>
    parts("header-cell").map((cell) => cell.dataset.columnKey);
  const settle = () => fixture.whenStable();
  const open = async () => {
    part<HTMLButtonElement>("column-menu-button")!.click();
    await settle();
  };
  const item = (index: number) => parts("column-menu-item")[index];
  return { fixture, element, part, parts, headers, settle, open, item };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the unstyled Angular Columns menu", () => {
  it("draws nothing without the feature", async () => {
    const fixture = TestBed.createComponent(Plain);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('[data-ngx-bootstrap-part="column-menu"]')
    ).toBeNull();
  });

  it("opens a panel listing every column, and closes on Escape", async () => {
    const { part, parts, open, settle } = await mount();
    const button = part<HTMLButtonElement>("column-menu-button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    await open();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(part("column-menu-panel")).not.toBeNull();
    expect(
      parts("column-menu-label").map((label) => label.textContent)
    ).toEqual(["Name", "Country", "Population"]);
    const search = part<HTMLInputElement>("column-menu-search")!;
    expect(search.closest("[data-ngx-bootstrap-overlay]")).not.toBeNull();
    const documentKeydown = vi.fn();
    document.addEventListener("keydown", documentKeydown);
    expect(pressEscapeFrom(search).defaultPrevented).toBe(true);
    document.removeEventListener("keydown", documentKeydown);
    expect(documentKeydown).not.toHaveBeenCalled();
    await settle();
    expect(part("column-menu-panel")).toBeNull();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
    await open();
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(parts("column-menu-panel")).toHaveLength(1);
    expect(
      pressEscapeFrom(part<HTMLInputElement>("column-menu-search")!)
        .defaultPrevented
    ).toBe(true);
    await settle();
    expect(part("column-menu-panel")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("closes on a press outside it", async () => {
    const { part, open, settle } = await mount();
    await open();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle();
    expect(part("column-menu-panel")).toBeNull();
  });

  it("hides and shows a column, and keeps a locked one", async () => {
    const { fixture, part, headers, open, item, settle } = await mount();
    await open();
    part<HTMLButtonElement>("column-menu-visibility", item(1))!.click();
    await settle();
    expect(headers()).toEqual(["name", "population"]);
    expect(
      part("column-menu-visibility", item(1))?.getAttribute("aria-label")
    ).toBe("Show column: Country");
    expect(
      part<HTMLButtonElement>("column-menu-visibility", item(2))?.disabled
    ).toBe(true);
    expect(fixture.componentInstance.layouts.at(-1)?.hidden).toEqual([
      "country",
    ]);
    part<HTMLButtonElement>("column-menu-bulk-button")!.click();
    await settle();
    expect(headers()).toEqual(["name", "country", "population"]);
  });

  it("pins a column so it sticks to its edge", async () => {
    const { part, parts, open, item, settle } = await mount();
    await open();
    part<HTMLButtonElement>("column-menu-pin", item(1))!.click();
    await settle();
    const country = parts("header-cell").find(
      (cell) => cell.dataset.columnKey === "country"
    );
    expect(country?.dataset.pinned).toBe("start");
    expect(country?.style.position).toBe("sticky");
    parts<HTMLButtonElement>("column-menu-bulk-button")[2]!.click();
    await settle();
    expect(
      parts("header-cell").find((cell) => cell.dataset.columnKey === "country")
        ?.dataset.pinned
    ).toBeUndefined();
  });

  it("moves a column with the grip's arrow keys, and resets the layout", async () => {
    const { part, headers, open, item, settle } = await mount();
    await open();
    part("column-menu-grip", item(0))!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    await settle();
    expect(headers()).toEqual(["country", "name", "population"]);
    part<HTMLButtonElement>("column-menu-reset")!.click();
    await settle();
    expect(headers()).toEqual(["name", "country", "population"]);
  });

  it("reorders by dragging one row onto another", async () => {
    const { headers, open, item, settle } = await mount();
    await open();
    const data = new Map<string, string>();
    const transfer = {
      get types() {
        return [...data.keys()];
      },
      setData: (format: string, value: string) => data.set(format, value),
      getData: (format: string) => data.get(format) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    const fire = (element: Element | undefined, type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", { value: transfer });
      element!.dispatchEvent(event);
    };
    fire(item(0), "dragstart");
    await settle();
    expect(item(0)?.hasAttribute("data-dragging")).toBe(true);
    fire(item(1), "dragover");
    await settle();
    expect(item(1)?.getAttribute("data-drop")).toBe("after");
    fire(item(1), "drop");
    fire(item(0), "dragend");
    await settle();
    expect(headers()).toEqual(["country", "name", "population"]);
  });

  it("searches its columns", async () => {
    const { part, parts, open, settle } = await mount();
    await open();
    const search = part<HTMLInputElement>("column-menu-search");
    if (!search) throw new Error("search is not rendered");
    search.value = "coun";
    search.dispatchEvent(new Event("input"));
    await settle();
    expect(
      parts("column-menu-label").map((label) => label.textContent)
    ).toEqual(["Country"]);
  });

  it("sorts from a column's submenu", async () => {
    const { part, parts, open, item, settle, element } = await mount();
    await open();
    part<HTMLButtonElement>("column-menu-more", item(0))!.click();
    await settle();
    const actions = parts<HTMLButtonElement>("column-menu-action", item(0));
    actions
      .find((action) => action.textContent?.trim() === "Sort descending")!
      .click();
    await settle();
    expect(
      [...element.querySelectorAll('[data-adapttable-part="row"]')].map(
        (row) => (row as HTMLElement).dataset.rowId
      )
    ).toEqual(["1", "2"]);
    expect(part("column-menu-submenu", item(0))).toBeNull();
  });

  it("sizes one column to its content from its submenu", async () => {
    const { part, parts, open, item, settle } = await mount();
    await open();
    part<HTMLButtonElement>("column-menu-more", item(0))!.click();
    await settle();
    parts<HTMLButtonElement>("column-menu-action", item(0))
      .find(
        (action) => action.textContent?.trim() === "Size column to content"
      )!
      .click();
    await settle();
    expect(part("column-menu-submenu", item(0))).toBeNull();
  });

  it("renames a column, checks the name and announces it", async () => {
    const { fixture, part, parts, headers, open, item, settle } = await mount();
    await open();
    part<HTMLButtonElement>("column-menu-more", item(1))!.click();
    await settle();
    parts<HTMLButtonElement>("column-menu-action", item(1))
      .find((action) => action.textContent?.trim() === "Rename column")!
      .click();
    await settle();
    const input = part<HTMLInputElement>("column-rename-input", item(1));
    expect(input?.value).toBe("Country");
    expect(document.activeElement).toBe(input);
    if (!input) throw new Error("input is not rendered");
    input.value = "  ";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("blur"));
    await settle();
    expect(part("column-rename-error", item(1))?.textContent).toBe(
      "Enter a column name."
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    input.value = "Nation";
    input.dispatchEvent(new Event("input"));
    part<HTMLButtonElement>("column-rename-save", item(1))!.click();
    await settle();
    expect(fixture.componentInstance.renames).toEqual([["country", "Nation"]]);
    expect(part("column-rename-announcer", item(1))?.textContent).toContain(
      "Nation"
    );
    expect(headers()).toEqual(["name", "country", "population"]);
    expect(parts("header-cell")[1]?.textContent).toContain("Nation");
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
    await beginRename();
    part<HTMLButtonElement>("column-rename-cancel", item(0))!.click();
    await settle();
    expect(part("column-rename-form", item(0))).toBeNull();
  });

  it("hides every column it can, and sizes columns to their content", async () => {
    const { part, parts, headers, open, settle } = await mount();
    await open();
    parts<HTMLButtonElement>("column-menu-bulk-button")[1]!.click();
    await settle();
    // The locked column stays.
    expect(headers()).toEqual(["population"]);
    part<HTMLButtonElement>("column-menu-auto-size")!.click();
    await settle();
    expect(part("table")).not.toBeNull();
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
