import {
  AdaptCellTemplate,
  type AdaptTableFeature,
  type ColumnDef,
  type PaginationMode,
} from "@adapttable/angular";
import { editing } from "@adapttable/ng-zorro/editing";
import { rowReorder } from "@adapttable/ng-zorro/row-reorder";
import { virtualize } from "@adapttable/ng-zorro/virtualize";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

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

  it("fills a column from the host's cell template", async () => {
    const { element } = await mount();
    expect(element.querySelector(".country")?.textContent?.trim()).toBe("UAE");
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
    // Clearing filters leaves the search: the host typed it.
    expect(part("empty")).not.toBeNull();
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

  it("loads more rows on a phone instead of paging", async () => {
    const { fixture, part, parts, settle } = await mount();
    fixture.componentInstance.mobile.set(true);
    await settle();
    expect(part("footer")).toBeNull();
    expect(parts("card")).toHaveLength(5);
    const button = part<HTMLButtonElement>("load-more-button");
    expect(button?.textContent?.trim()).toBe("Load more");
    button!.click();
    await settle();
    expect(parts("card")).toHaveLength(10);
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
  it("ignores a double-click when editing is not composed", async () => {
    const { part, parts, settle } = await mountFeatures({ features: [] });
    const cell = parts("cell")[0];
    expect(cell).not.toBeUndefined();
    cell!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle();
    expect(part("edit-cell-editor")).toBeNull();
    expect(part("edit-cell-activate")).toBeNull();
  });

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

  it("edits a field on a phone card and hands the host the parsed value", async () => {
    const onCellEdit = vi.fn();
    const { part, parts, settle, element } = await mountFeatures({
      features: [editing(onCellEdit)],
      forceMobile: true,
    });
    expect(parts("card").length).toBeGreaterThan(0);
    expect(part("table")).toBeNull();
    const activate = element.querySelector<HTMLElement>(
      '[data-adapttable-part="card-value"] [data-adapttable-part="edit-cell-activate"]'
    );
    expect(activate).not.toBeNull();
    activate!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle();
    const editor = part<HTMLInputElement>("edit-cell-editor");
    expect(editor).not.toBeNull();
    editor!.value = "Card edit";
    editor!.dispatchEvent(new Event("input"));
    editor!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledOnce();
    expect(onCellEdit.mock.calls[0]?.[1]).toBe("name");
    expect(onCellEdit.mock.calls[0]?.[2]).toBe("Card edit");
  });

  it("warns when virtualize is composed on a paged table", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await mountFeatures({
      features: [virtualize()],
      paginationMode: "paged",
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("windows an infinite body and sizes the scroll box", async () => {
    const { part, parts } = await mountFeatures({
      features: [
        virtualize({
          estimateRowSize: 40,
          estimateCardSize: 120,
          virtualOverscan: 2,
          virtualScrollMargin: 0,
        }),
        rowReorder(vi.fn()),
      ],
      paginationMode: "infinite",
      maxHeight: 240,
    });
    const box = part("scroll-box");
    expect(box?.style.maxHeight).toBe("240px");
    expect(box?.style.overflow).toBe("auto");
    // jsdom has no measured viewport: the window is armed with a spacer
    // rather than mounted rows (same as the headless virtualize tests).
    const spacer = part("virtual-spacer");
    expect(spacer).not.toBeNull();
    expect(spacer!.querySelector("td")!.style.height).toMatch(/^[1-9]\d*px$/);
    // The reorder column is drawn and the spacer spans it with the data.
    const [reorderHeader] = parts("reorder-header");
    expect(reorderHeader!.getAttribute("aria-label")).toBe("Reorder row");
    expect(spacer!.querySelector("td")!.colSpan).toBe(COLUMNS.length + 1);
  });

  it("accepts a string maxHeight on the scroll box", async () => {
    const { part } = await mountFeatures({
      features: [virtualize()],
      paginationMode: "infinite",
      maxHeight: "50vh",
    });
    expect(part("scroll-box")?.style.maxHeight).toBe("50vh");
  });

  it("windows phone cards inside the capped card list, and scrolling moves the window", async () => {
    // jsdom lays nothing out: give the card list the height its cap sets and
    // a scroll position the test controls.
    let scrollTop = 0;
    const height = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get(this: HTMLElement) {
        const part = this.dataset.adapttablePart;
        if (part === "cards") return 320;
        return part === "card" ? 160 : 0;
      },
    });
    const top = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
    Object.defineProperty(Element.prototype, "scrollTop", {
      configurable: true,
      get(this: Element) {
        return this.getAttribute("data-adapttable-part") === "cards"
          ? scrollTop
          : 0;
      },
      set() {
        // The virtualizer's own scrolls are not what this test moves.
      },
    });
    try {
      const { part, parts, settle } = await mountFeatures({
        features: [virtualize({ estimateCardSize: 160, virtualOverscan: 0 })],
        paginationMode: "infinite",
        maxHeight: 320,
        forceMobile: true,
      });
      const list = part("cards")!;
      expect(list.style.maxHeight).toBe("320px");
      expect(list.style.overflowY).toBe("auto");
      const titles = () =>
        parts("card").map((card) =>
          card
            .querySelector('[data-adapttable-part="card-value"]')!
            .textContent.trim()
        );
      expect(titles()).toEqual(["City 01", "City 02"]);

      scrollTop = 1600;
      list.dispatchEvent(new Event("scroll"));
      await settle();
      expect(titles()).toEqual(["City 11", "City 12"]);
    } finally {
      if (height)
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", height);
      if (top) Object.defineProperty(Element.prototype, "scrollTop", top);
    }
  });
});

describe("NG-ZORRO Angular phone card captions", () => {
  @Component({
    imports: [AdaptDataTable],
    template: `
      <adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="true"
      />
    `,
  })
  class CaptionHost {
    readonly rows: City[] = CITIES.slice(0, 1);
    readonly rowKey = (row: City) => row.id;
    readonly columns: ColumnDef<City>[] = [
      {
        key: "name",
        header: "City",
        mobileLabel: "",
        accessor: (row) => row.name,
      },
      { key: "country", header: "Country", accessor: (row) => row.country },
    ];
  }

  it("captions a field by its header and drops the caption an empty mobileLabel asks to", async () => {
    const fixture = TestBed.createComponent(CaptionHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const { parts } = queryParts(fixture.nativeElement as HTMLElement);
    const rows = parts("card-row");
    expect(rows).toHaveLength(2);
    expect(
      rows[0]!.querySelector('[data-adapttable-part="card-label"]')
    ).toBeNull();
    expect(rows[0]!.textContent.trim()).toBe("City 01");
    expect(
      parts("card-label").map((label) => label.textContent.trim())
    ).toEqual(["Country"]);
  });
});
