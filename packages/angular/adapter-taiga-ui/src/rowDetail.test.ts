import {
  type AdaptTableFeature,
  type ColumnDef,
  type NestedTableContext,
  type RowDetailContext,
} from "@adapttable/angular";
import { nestedTable } from "@adapttable/taiga-ui/nested-table";
import { rowDetail } from "@adapttable/taiga-ui/row-detail";
import { virtualize } from "@adapttable/taiga-ui/virtualize";
import { Component, signal, type TemplateRef, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

/**
 * Row detail and nested tables through the unstyled table: the chevron in
 * each row's leading cell, the panel beneath an open row, the same on phone
 * cards, and a real table nested under a row.
 */

interface Order {
  id: string;
  item: string;
}

interface Person {
  id: string;
  name: string;
  orders?: Order[];
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", orders: [{ id: "o1", item: "Engine" }] },
  { id: "2", name: "Grace" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
];
const ORDER_COLUMNS: ColumnDef<Order>[] = [
  { key: "item", accessor: (row) => row.item },
];

let mobile = false;
let build: (host: Host) => AdaptTableFeature[] = (host) => [
  rowDetail<Person>(host.detail()),
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <ng-template #detail let-row
      ><p class="detail">About {{ row.name }}</p></ng-template
    >
    <ng-template #orders let-d let-row="row">
      <adapt-data-table
        [data]="row.orders"
        [columns]="orderColumns"
        [rowKey]="orderKey"
        [urlSync]="d.urlSync"
        [searchable]="d.searchable"
        [tableLabel]="d.tableLabel"
        [forceMobile]="false"
      />
    </ng-template>
    @if (ready()) {
      <adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="mobile"
        paginationMode="infinite"
        [maxHeight]="400"
        [features]="features"
      />
    }
  `,
})
class Host {
  readonly detail =
    viewChild.required<TemplateRef<RowDetailContext<Person>>>("detail");
  readonly orders =
    viewChild.required<TemplateRef<NestedTableContext<Person>>>("orders");
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly orderColumns = ORDER_COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly orderKey = (row: Order) => row.id;
  readonly mobile = mobile;
  readonly ready = signal(false);
  features: AdaptTableFeature[] = [];
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const host = fixture.componentInstance;
  // The templates exist once the host has rendered; the table reads them.
  host.features = build(host);
  host.ready.set(true);
  await fixture.whenStable();
  return { host, settle: () => fixture.whenStable() };
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  ),
];
const rowById = (id: string) =>
  document.querySelector(`[data-adapttable-part="row"][data-row-id="${id}"]`)!;
const toggleIn = (container: Element) =>
  container.querySelector<HTMLButtonElement>(
    '[data-taiga-part="expand-button"]'
  )!;

afterEach(() => {
  document.body.replaceChildren();
  mobile = false;
  build = (host) => [rowDetail<Person>(host.detail())];
});

describe("the unstyled table's row detail", () => {
  it("leads each row with a chevron and opens its panel beneath it", async () => {
    const { settle } = await mount();
    const header = parts("expand-header")[0]!;
    expect(header.getAttribute("aria-label")).toBe("Expand row");
    const toggle = toggleIn(rowById("1"));
    expect(
      toggle.closest('[data-adapttable-part="expand-cell"]')
    ).not.toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(parts("detail-row")).toEqual([]);

    toggle.click();
    await settle();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Collapse row");
    expect(toggle.hasAttribute("data-expanded")).toBe(true);
    const detailRow = parts("detail-row")[0]!;
    expect(detailRow.previousElementSibling).toBe(rowById("1"));
    const cell = parts("detail-cell")[0]!;
    // The chevron column and the name column.
    expect(cell.getAttribute("colspan")).toBe("2");
    expect(cell.textContent.trim()).toBe("About Ada");

    toggleIn(rowById("2")).click();
    await settle();
    expect(parts("detail-cell").map((c) => c.textContent.trim())).toEqual([
      "About Ada",
      "About Grace",
    ]);
    toggleIn(rowById("1")).click();
    await settle();
    expect(parts("detail-cell").map((c) => c.textContent.trim())).toEqual([
      "About Grace",
    ]);
  });

  it("opens the rows it is told from the start", async () => {
    build = (host) => [rowDetail<Person>(host.detail(), ["2"])];
    await mount();
    expect(parts("detail-cell").map((c) => c.textContent.trim())).toEqual([
      "About Grace",
    ]);
  });

  it("opens a card's panel on a phone", async () => {
    mobile = true;
    const { settle } = await mount();
    const card = document.querySelector(
      '[data-adapttable-part="card"][data-row-id="1"]'
    )!;
    toggleIn(card).click();
    await settle();
    expect(parts("card-detail", card)[0]?.textContent.trim()).toBe("About Ada");
  });

  it("nests this kit's table under a row, without a second search box", async () => {
    build = (host) => [
      nestedTable<Person>((row) =>
        row.orders
          ? { label: `Orders for ${row.name}`, table: host.orders() }
          : undefined
      ),
    ];
    const { settle } = await mount();
    expect(parts("search")).toHaveLength(1);
    toggleIn(rowById("1")).click();
    await settle();
    const region = parts("nested-table")[0]!;
    expect(region.getAttribute("aria-label")).toBe("Orders for Ada");
    const inner = region.querySelector('[data-adapttable-part="table"]')!;
    expect(inner.getAttribute("aria-label")).toBe("Orders for Ada");
    expect(inner.textContent).toContain("Engine");
    expect(parts("search", region)).toEqual([]);
    expect(parts("search")).toHaveLength(1);

    // A row with no nested table opens an empty panel.
    toggleIn(rowById("2")).click();
    await settle();
    expect(parts("nested-table")).toHaveLength(1);
  });

  it("opens a panel under a row of a virtualized list", async () => {
    // jsdom lays nothing out: give the scroll box a height to window into.
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.adapttablePart === "scroll-box" ? 200 : 40;
      }
    );
    build = (host) => [rowDetail<Person>(host.detail()), virtualize()];
    const { settle } = await mount();
    toggleIn(rowById("1")).click();
    await settle();
    expect(parts("detail-cell").map((c) => c.textContent.trim())).toEqual([
      "About Ada",
    ]);
    expect(parts("detail-row")[0]!.previousElementSibling).toBe(rowById("1"));
  });
});
