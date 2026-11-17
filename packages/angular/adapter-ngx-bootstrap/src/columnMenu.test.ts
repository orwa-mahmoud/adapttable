import type { ColumnDef, ColumnLayoutState } from "@adapttable/angular";
import { columnMenu } from "@adapttable/ngx-bootstrap/column-menu";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { columnMenuTests } from "../../angular/test/kit/suites/columnMenu";
import { kit } from "../testing/kit";
import { ngxBootstrapPart, pressEscapeFrom } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

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

  it("budgets an upward native dropdown before opening on a short viewport", async () => {
    const { part, open } = await mount();
    const button = part<HTMLButtonElement>("column-menu-button")!;
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(480);
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      top: 320,
      bottom: 352,
    } as DOMRect);
    await open();
    const popup =
      part("column-menu-panel")?.closest<HTMLElement>(".dropdown-menu");
    expect(popup?.style.maxHeight).toBe("304px");
    expect(popup?.style.overflowY).toBe("auto");
    expect(part("column-menu-panel")?.closest(".dropup")).not.toBeNull();
    vi.restoreAllMocks();
  });

  it("respects consumed and composing Escapes and dismisses from outside the panel", async () => {
    const { part, open, settle } = await mount();
    await open();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    const consumed = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    consumed.preventDefault();
    document.dispatchEvent(consumed);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        isComposing: true,
      })
    );
    await settle();
    expect(part("column-menu-panel")).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(part("column-menu-panel")).toBeNull();
    expect(document.activeElement).toBe(part("column-menu-button"));
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
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    expect(part("column-menu-panel")).toBeNull();
  });

  it("reopens the native dropdown when Escape and activation share a render turn", async () => {
    const { part, open, settle } = await mount();
    await open();
    const button = part<HTMLButtonElement>("column-menu-button")!;
    for (let cycle = 0; cycle < 3; cycle++) {
      pressEscapeFrom(part<HTMLInputElement>("column-menu-search")!);
      // Reactivate before the controlled input's close/open values can be
      // rendered separately. The native dropdown has already been hidden.
      button.click();
      await settle();
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(part("column-menu-panel")).not.toBeNull();
      expect(part("column-menu-search")).not.toBeNull();
    }
  });

  it("cancels a second activation before the native opening render", async () => {
    const { part, settle } = await mount();
    const button = part<HTMLButtonElement>("column-menu-button")!;
    button.click();
    button.click();
    await settle();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(part("column-menu-panel")).toBeNull();
    button.click();
    await settle();
    expect(part("column-menu-panel")).not.toBeNull();
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
