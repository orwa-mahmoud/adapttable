/**
 * Pinned rows, summary rows and the summary row through the NG-ZORRO table:
 * pin entries in each row's actions, pinned rows kept above or below the
 * scrolling ones, host summary rows without a row's controls, and a summary
 * row under the body — on desktop and on phone cards.
 */
import {
  type AdaptTableFeature,
  aggregate,
  type ColumnDef,
  type SummaryRowFn,
} from "@adapttable/angular";
import { pinnedSummaryRows } from "@adapttable/ng-zorro/pinned-summary-rows";
import { rowPinning } from "@adapttable/ng-zorro/row-pinning";
import { tree } from "@adapttable/ng-zorro/tree";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Person {
  id: string;
  name: string;
  budget: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", budget: 100 },
  { id: "2", name: "Grace", budget: 200 },
  { id: "3", name: "Linus", budget: 300 },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "budget", accessor: (row) => row.budget },
];

let features: AdaptTableFeature[] = [rowPinning()];
let summaryRow: SummaryRowFn<Person> | undefined;
let mobile = false;
let maxHeight: number | undefined;
let selectable = false;

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile"
      [maxHeight]="maxHeight"
      [selectable]="selectable"
      [summaryRow]="summaryRow"
      [features]="features"
    />
  `,
})
class Host {
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly features = features;
  readonly summaryRow = summaryRow;
  readonly mobile = mobile;
  readonly maxHeight = maxHeight;
  readonly selectable = selectable;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return { settle: () => fixture.whenStable() };
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(kitSelector(name)),
];
/** The body rows in order, pinned or not, as `part:id`. */
const bodyOrder = () =>
  [...document.querySelectorAll<HTMLElement>("tbody tr")].map(
    (row) =>
      `${row.getAttribute("data-adapttable-part") ?? ""}:${
        row.getAttribute("data-row-id") ?? ""
      }`
  );
const rowById = (id: string) =>
  document.querySelector<HTMLElement>(`tbody tr[data-row-id="${id}"]`)!;
const press = (row: HTMLElement, label: string) => {
  [...row.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent.trim() === label)!
    .click();
};

afterEach(() => {
  document.body.replaceChildren();
  features = [rowPinning()];
  summaryRow = undefined;
  mobile = false;
  maxHeight = undefined;
  selectable = false;
});

describe("the NG-ZORRO table's row pinning", () => {
  it("pins a row to either edge from its actions, and unpins it", async () => {
    const { settle } = await mount();
    expect(bodyOrder()).toEqual(["row:1", "row:2", "row:3"]);
    press(rowById("3"), "Pin to top");
    await settle();
    expect(bodyOrder()).toEqual(["pinned-top:3", "row:1", "row:2"]);
    expect(rowById("3").getAttribute("data-row-pin")).toBe("top");

    press(rowById("1"), "Pin to bottom");
    await settle();
    expect(bodyOrder()).toEqual(["pinned-top:3", "row:2", "pinned-bottom:1"]);

    press(rowById("3"), "Unpin row");
    await settle();
    expect(bodyOrder()).toEqual(["row:2", "row:3", "pinned-bottom:1"]);
  });

  it("keeps a pinned row stuck inside a scroll box", async () => {
    maxHeight = 200;
    const { settle } = await mount();
    press(rowById("2"), "Pin to top");
    await settle();
    expect(rowById("2").style.position).toBe("sticky");
    expect(rowById("2").style.top).toBe("0px");
  });

  it("offers no pins while a tree refuses them", async () => {
    features = [rowPinning(), tree<Person>({ getParentId: () => undefined })];
    await mount();
    expect(
      [...rowById("1").querySelectorAll("button")].map((b) =>
        b.textContent.trim()
      )
    ).not.toContain("Pin to top");
  });

  it("draws host summary rows above and below, named and without controls", async () => {
    selectable = true;
    features = [
      pinnedSummaryRows<Person>({
        top: [{ id: "total", name: "Total", budget: 600 }],
      }),
    ];
    await mount();
    const summary = document.querySelector<HTMLElement>(
      '[data-adapttable-part="pinned-summary-top"]'
    )!;
    expect(summary.getAttribute("aria-label")).toBe("Summary row");
    expect(summary.textContent).toContain("Total");
    expect(
      summary.querySelector('[data-adapttable-part="checkbox"]')
    ).toBeNull();
    expect(bodyOrder()[0]).toBe("pinned-summary-top:total");
  });

  it("sums the rows under the body, through a column's footer", async () => {
    summaryRow = aggregate<Person>({ budget: "sum" });
    await mount();
    // Name, budget, and the actions column the pin entries sit in.
    const cells = parts("summary-cell");
    expect(cells.map((cell) => cell.textContent.trim())).toEqual([
      "",
      "600",
      "",
    ]);
    expect(
      cells[0]!.closest("tfoot")?.getAttribute("data-adapttable-part")
    ).toBe("summary");
  });

  it("puts the summary in a card of its own on a phone", async () => {
    mobile = true;
    summaryRow = aggregate<Person>({ budget: "sum" });
    await mount();
    const card = parts("summary-card")[0]!;
    expect(parts("card-value", card).map((v) => v.textContent.trim())).toEqual([
      "600",
    ]);
  });
});
