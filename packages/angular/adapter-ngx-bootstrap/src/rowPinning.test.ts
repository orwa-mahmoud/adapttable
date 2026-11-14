/**
 * Pinned rows, summary rows and the summary row through the unstyled table:
 * pin entries in each row's actions, pinned rows kept above or below the
 * scrolling ones, host summary rows without a row's controls, and a summary
 * row under the body — on desktop and on phone cards.
 */
import {
  type AdaptTableFeature,
  type ColumnDef,
  type RowPinState,
  type SummaryRowFn,
} from "@adapttable/angular";
import { pinnedSummaryRows } from "@adapttable/ngx-bootstrap/pinned-summary-rows";
import { rowPinning } from "@adapttable/ngx-bootstrap/row-pinning";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { rowPinningTests } from "../../angular/test/kit/suites/rowPinning";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of rowPinningTests(kit)) it(test.name, test.run);

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
let controlled = false;
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
  readonly pinnedRowIds = signal<RowPinState>({ top: [], bottom: [] });
  readonly onPinnedRowIdsChange = vi.fn((next: RowPinState) => {
    this.pinnedRowIds.set(next);
  });
  readonly features = controlled
    ? [
        rowPinning({
          pinnedRowIds: this.pinnedRowIds,
          onPinnedRowIdsChange: this.onPinnedRowIdsChange,
        }),
      ]
    : features;
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
  return {
    host: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    settle: () => fixture.whenStable(),
  };
}

/** The body rows in order, pinned or not, as `part:id`. */
const bodyOrder = () =>
  [...document.querySelectorAll<HTMLElement>("tbody tr")].map(
    (row) =>
      `${row.getAttribute("data-adapttable-part") ?? ""}:${
        row.getAttribute("data-row-id") ?? ""
      }`
  );

afterEach(() => {
  document.body.replaceChildren();
  features = [rowPinning()];
  summaryRow = undefined;
  mobile = false;
  controlled = false;
  maxHeight = undefined;
  selectable = false;
});

describe("the unstyled table's row pinning", () => {
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
    // A total reads apart from the records around it.
    expect(summary.style.fontWeight).toBe("600");
    expect(summary.textContent).toContain("Total");
    expect(
      summary.querySelector('[data-ngx-bootstrap-part="checkbox"]')
    ).toBeNull();
    expect(bodyOrder()[0]).toBe("pinned-summary-top:total");
  });
});
