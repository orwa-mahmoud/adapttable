import {
  AdaptCellTemplate,
  type AdaptTableFeature,
  type ColumnDef,
  type PaginationMode,
} from "@adapttable/angular";
import { editing } from "@adapttable/ng-zorro/editing";
import { OverlayContainer } from "@angular/cdk/overlay";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dataTableTests } from "../../angular/test/kit/suites/dataTable";
import { kit } from "../testing/kit";
import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

for (const test of dataTableTests(kit)) it(test.name, test.run);

interface City {
  id: string;
  name: string;
  country: string;
}

const CITIES: City[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  name: `City ${String(i + 1).padStart(2, "0")}`,
  country: i % 2 === 0 ? "UAE" : "Jordan",
}));

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", sortable: true, accessor: (row) => row.name },
  { key: "country", mobileLabel: "Land", accessor: (row) => row.country },
];

function queryParts(element: HTMLElement) {
  const part = <T extends HTMLElement>(name: string) =>
    element.querySelector<T>(kitSelector(name));
  const parts = <T extends HTMLElement>(name: string) => [
    ...element.querySelectorAll<T>(kitSelector(name)),
  ];
  return { part, parts };
}

@Component({
  imports: [AdaptDataTable, AdaptCellTemplate],
  template: `
    <adapt-data-table
      [data]="data()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [defaults]="{ limit: 5 }"
      [forceMobile]="mobile()"
      [selectable]="true"
      [selectedIds]="selected()"
      searchPlaceholder="Find a city"
      (selectionChange)="changes.push($event)"
    >
      <ng-template adaptCellTemplate="country" let-value="value">
        <b class="country">{{ value }}</b>
      </ng-template>
    </adapt-data-table>
  `,
})
class Host {
  readonly data = signal<readonly City[]>(CITIES);
  readonly mobile = signal<boolean | undefined>(undefined);
  readonly selected = signal<readonly string[] | undefined>(undefined);
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly changes: string[][] = [];
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [defaults]="{ limit: 25 }"
    />
  `,
})
class TwentyFivePerPage {
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [density]="density()"
    />
  `,
})
class DensityHost {
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly density = signal<"compact" | "comfortable">("comfortable");
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const { part, parts } = queryParts(element);
  const ids = () => parts("row").map((row) => row.dataset.rowId);
  return {
    fixture,
    element,
    part,
    parts,
    ids,
    settle: () => fixture.whenStable(),
  };
}

describe("the NG-ZORRO Angular table", () => {
  it("follows the viewport when the host does not force a layout", async () => {
    const { part, ids } = await mount();
    // No `matchMedia` in the test environment: the desktop table.
    expect(part("table")?.tagName).toBe("TABLE");
    expect(part("table")?.closest("nz-table")).not.toBeNull();
    expect(part("sort-button")?.classList.contains("ant-btn")).toBe(true);
    expect(part("search")?.classList.contains("ant-input")).toBe(true);
    expect(part("table")?.querySelectorAll("thead")).toHaveLength(1);
    expect(ids()).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("moves its overlays into the element the browser makes fullscreen", async () => {
    // jsdom has no Fullscreen API; CDK listens only where the browser has one.
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      configurable: true,
    });
    const { fixture } = await mount();
    const overlays = fixture.debugElement
      .query(By.directive(AdaptDataTable))
      .injector.get(OverlayContainer);
    const container = overlays.getContainerElement();
    expect(container.parentElement).toBe(document.body);
    const stage = document.createElement("div");
    document.body.append(stage);
    Object.defineProperty(document, "fullscreenElement", {
      get: () => stage,
      configurable: true,
    });
    try {
      document.dispatchEvent(new Event("fullscreenchange"));
      expect(container.parentElement).toBe(stage);
    } finally {
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
      stage.remove();
      Reflect.deleteProperty(document, "fullscreenEnabled");
    }
  });

  it("draws compact density with NG-ZORRO's small table", async () => {
    const fixture = TestBed.createComponent(DensityHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector(".ant-table-small")).toBeNull();
    fixture.componentInstance.density.set("compact");
    await fixture.whenStable();
    expect(element.querySelector(".ant-table-small")).not.toBeNull();
  });

  it("pages from the numbered pager and the page-size select", async () => {
    const { part, parts, ids, settle } = await mount();
    const numbers = parts<HTMLButtonElement>("page-number");
    expect(numbers.map((button) => button.textContent?.trim())).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(numbers[0]?.getAttribute("aria-current")).toBe("page");
    expect(part<HTMLButtonElement>("page-prev")?.disabled).toBe(true);
    numbers[2]!.click();
    await settle();
    expect(ids()).toEqual(["11", "12", "13", "14", "15"]);
    part<HTMLButtonElement>("page-prev")!.click();
    await settle();
    expect(ids()).toEqual(["6", "7", "8", "9", "10"]);
    const select = part("rows-per-page");
    expect(
      select?.querySelector(".ant-select-selection-item")?.textContent?.trim()
    ).toBe("5");
    if (!select) throw new Error("select is not rendered");
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await settle();
    await vi.waitFor(() =>
      expect(document.querySelector(".ant-select-item-option")).not.toBeNull()
    );
    const option = [
      ...document.querySelectorAll<HTMLElement>(".ant-select-item-option"),
    ].find((item) => item.textContent?.trim() === "10");
    expect(option).toBeDefined();
    option!.click();
    await settle();
    expect(ids()).toHaveLength(10);
  });

  it("shows the page size in force when it is not the first size offered", async () => {
    const fixture = TestBed.createComponent(TwentyFivePerPage);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const { part, parts } = queryParts(fixture.nativeElement as HTMLElement);
    const select = part("rows-per-page")!;
    expect(parts("row")).toHaveLength(25);
    expect(
      select.querySelector(".ant-select-selection-item")?.textContent?.trim()
    ).toBe("25");
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(
        document.querySelector(".ant-select-item-option-selected")
      ).not.toBeNull()
    );
    const selected = document.querySelector(".ant-select-item-option-selected");
    expect(selected?.textContent?.trim()).toBe("25");
  });

  it("searches, says nothing matched, and offers to clear", async () => {
    const { part, parts, settle } = await mount();
    const search = part<HTMLInputElement>("search");
    expect(search?.placeholder).toBe("Find a city");
    if (!search) throw new Error("search is not rendered");
    search.value = "Atlantis";
    search.dispatchEvent(new Event("input"));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await settle();
    expect(part("empty")?.textContent).toContain("No results");
    expect(parts("row")).toHaveLength(0);
    expect(part("footer")).toBeNull();
    part<HTMLButtonElement>("empty-clear")!.click();
    await settle();
    // A search alone matched nothing, so the clear takes the search too.
    expect(part<HTMLInputElement>("search")?.value).toBe("");
    expect(part("empty")).toBeNull();
  });

  it("reports selection changes and shows the ids the host controls", async () => {
    const { fixture, part, parts, settle } = await mount();
    parts<HTMLInputElement>("checkbox")[1]!.click();
    await settle();
    expect(fixture.componentInstance.changes.at(-1)).toEqual(["1"]);
    part<HTMLInputElement>("checkbox")!.click();
    await settle();
    expect(fixture.componentInstance.changes.at(-1)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    fixture.componentInstance.selected.set(["3"]);
    await settle();
    expect(
      parts("row").map((row) => row.getAttribute("aria-selected"))
    ).toEqual(["false", "false", "true", "false", "false"]);
  });

  it("gives every card its label and a checkbox on a phone", async () => {
    const { fixture, parts, settle } = await mount();
    fixture.componentInstance.mobile.set(true);
    await settle();
    const cards = parts("card");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.tagName).toBe("LI");
    expect(cards[0]?.querySelector("nz-card.ant-card")).not.toBeNull();
    expect(
      cards[0]?.querySelector("nz-descriptions.ant-descriptions")
    ).not.toBeNull();
    expect(
      parts("card-label")
        .slice(0, 2)
        .map((label) => label.textContent?.trim())
    ).toEqual(["Name", "Land"]);
    cards[0]?.querySelector<HTMLInputElement>("input")!.click();
    await settle();
    expect(fixture.componentInstance.changes.at(-1)).toEqual(["1"]);
    expect(parts("card")[0]?.hasAttribute("data-selected")).toBe(true);
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
      [defaults]="{ limit: 10 }"
      [features]="features()"
      [paginationMode]="paginationMode()"
      [maxHeight]="maxHeight()"
      [forceMobile]="forceMobile()"
    />
  `,
})
class FeatureHost {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly paginationMode = input<PaginationMode | undefined>(undefined);
  readonly maxHeight = input<number | string | undefined>(undefined);
  readonly forceMobile = input<boolean | undefined>(undefined);
  readonly data = CITIES;
  readonly columns: ColumnDef<City>[] = [
    {
      key: "name",
      accessor: (row) => row.name,
      editable: true,
    },
    { key: "country", accessor: (row) => row.country },
  ];
  readonly rowKey = (row: City) => row.id;
}

async function mountFeatures(options: {
  features: readonly AdaptTableFeature[];
  paginationMode?: PaginationMode;
  maxHeight?: number | string;
  forceMobile?: boolean;
}) {
  const fixture = TestBed.createComponent(FeatureHost);
  fixture.componentRef.setInput("features", options.features);
  if (options.paginationMode !== undefined) {
    fixture.componentRef.setInput("paginationMode", options.paginationMode);
  }
  if (options.maxHeight !== undefined) {
    fixture.componentRef.setInput("maxHeight", options.maxHeight);
  }
  if (options.forceMobile !== undefined) {
    fixture.componentRef.setInput("forceMobile", options.forceMobile);
  }
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  return {
    fixture,
    element,
    ...queryParts(element),
    settle: () => fixture.whenStable(),
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("NG-ZORRO Angular editing and virtualize", () => {
  it("opens, commits and cancels an in-place cell editor", async () => {
    const onCellEdit = vi.fn();
    const { part, parts, settle } = await mountFeatures({
      features: [editing(onCellEdit)],
    });
    const activate = parts("edit-cell-activate")[0];
    expect(activate).not.toBeNull();
    activate!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle();
    const editor = part<HTMLInputElement>("edit-cell-editor");
    expect(editor).not.toBeNull();
    if (!editor) throw new Error("editor is not rendered");
    editor.value = "Renamed";
    editor.dispatchEvent(new Event("input"));
    editor.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledOnce();
    expect(onCellEdit.mock.calls[0]?.[1]).toBe("name");
    expect(onCellEdit.mock.calls[0]?.[2]).toBe("Renamed");

    parts("edit-cell-activate")[0]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const again = part<HTMLInputElement>("edit-cell-editor");
    expect(again).not.toBeNull();
    again!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(part("edit-cell-editor")).toBeNull();
  });
});
