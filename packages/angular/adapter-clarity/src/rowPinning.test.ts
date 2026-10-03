/**
 * Pinned rows, summary rows and the summary row through the Clarity table:
 * pin entries in each row's actions, pinned rows kept above or below the
 * scrolling ones, host summary rows without a row's controls, and a summary
 * row under the body — on desktop and on phone cards.
 */
import {
  type AdaptTableFeature,
  aggregate,
  type ColumnDef,
  type RowPinState,
  type SummaryRowFn,
} from "@adapttable/angular";
import { pinnedSummaryRows } from "@adapttable/clarity/pinned-summary-rows";
import { rowPinning } from "@adapttable/clarity/row-pinning";
import { tree } from "@adapttable/clarity/tree";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitPart } from "../testUtils";
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

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(kitPart(name)),
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
  controlled = false;
  maxHeight = undefined;
  selectable = false;
});

describe("the Clarity table's row pinning", () => {
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

  it.each([false, true])(
    "follows independent host pin signals through callbacks, replacement and clear (mobile=%s)",
    async (isMobile) => {
      mobile = isMobile;
      controlled = true;
      const first = await mount();
      const second = await mount();
      const selector = isMobile
        ? '[data-adapttable-part="card"]'
        : "tbody tr[data-row-id]";
      const row = (root: ParentNode, id: string) =>
        root.querySelector<HTMLElement>(`${selector}[data-row-id="${id}"]`)!;
      const ids = (root: ParentNode) =>
        [...root.querySelectorAll(selector)].map((entry) =>
          entry.getAttribute("data-row-id")
        );
      expect(ids(first.root)).toEqual(["1", "2", "3"]);
      expect(ids(second.root)).toEqual(["1", "2", "3"]);

      press(row(first.root, "3"), "Pin to top");
      await first.settle();
      expect(first.host.onPinnedRowIdsChange).toHaveBeenLastCalledWith({
        top: ["3"],
        bottom: [],
      });
      expect(first.host.pinnedRowIds()).toEqual({ top: ["3"], bottom: [] });
      expect(ids(first.root)).toEqual(["3", "1", "2"]);
      expect(ids(second.root)).toEqual(["1", "2", "3"]);
      expect(second.host.onPinnedRowIdsChange).not.toHaveBeenCalled();

      press(row(first.root, "1"), "Pin to bottom");
      await first.settle();
      expect(first.host.pinnedRowIds()).toEqual({ top: ["3"], bottom: ["1"] });
      expect(ids(first.root)).toEqual(["3", "2", "1"]);
      first.host.pinnedRowIds.set({ top: ["2"], bottom: ["3"] });
      await first.settle();
      expect(ids(first.root)).toEqual(["2", "1", "3"]);
      press(row(first.root, "3"), "Unpin row");
      await first.settle();
      expect(first.host.onPinnedRowIdsChange).toHaveBeenLastCalledWith({
        top: ["2"],
        bottom: [],
      });
      expect(ids(first.root)).toEqual(["2", "1", "3"]);
      expect(row(first.root, "3").textContent).not.toContain("Unpin row");
      first.host.pinnedRowIds.set({ top: [], bottom: [] });
      await first.settle();
      expect(ids(first.root)).toEqual(["1", "2", "3"]);

      second.host.pinnedRowIds.set({ top: ["3"], bottom: ["1"] });
      await second.settle();
      expect(ids(second.root)).toEqual(["3", "2", "1"]);
      expect(ids(first.root)).toEqual(["1", "2", "3"]);
      second.host.pinnedRowIds.set({ top: [], bottom: [] });
      await second.settle();
      expect(ids(second.root)).toEqual(["1", "2", "3"]);
      expect(second.host.onPinnedRowIdsChange).not.toHaveBeenCalled();
      expect(first.host.onPinnedRowIdsChange).toHaveBeenCalledTimes(3);
    }
  );

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
    expect(summary.querySelector('[data-clarity-part="checkbox"]')).toBeNull();
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
