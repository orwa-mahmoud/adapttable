import type * as core from "@adapttable/core";
import { createMemoryAdapter } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectDataTable } from "../dataTable";
import { groupingPanel } from "../features/groupingPanel";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectGroupingPanelState } from "./groupingPanelState";

const reconcile = vi.fn();

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return {
    ...actual,
    createGroupingPanelController: (
      ...args: Parameters<typeof actual.createGroupingPanelController>
    ) => {
      const controller = actual.createGroupingPanelController(...args);
      return {
        ...controller,
        reconcile: () => {
          reconcile();
          controller.reconcile();
        },
      };
    },
  };
});

interface Person {
  id: string;
  team: string;
  budget: number;
}

const PEOPLE: Person[] = [
  { id: "1", team: "A", budget: 10 },
  { id: "2", team: "B", budget: 20 },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget" },
];

@Component({
  template: `
    @if (panel(); as props) {
      <output class="keys">{{ props.state.groupBy.join(",") }}</output>
      <button type="button" class="add" (click)="props.state.add('budget')">
        add
      </button>
      <button type="button" class="remove" (click)="props.state.remove('team')">
        remove
      </button>
    }
  `,
})
class LiveHost {
  private readonly people = signal(PEOPLE);
  private readonly source = injectFrontendData<Person>({
    data: this.people,
    columns: COLUMNS,
    getRowId: (row) => row.id,
  });
  private readonly features = [groupingPanel(["team"])];
  private readonly table = injectDataTable<Person>({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    features: this.features,
  });
  readonly panel = injectGroupingPanelState({
    table: this.table,
    source: this.source,
    features: this.features,
  })!;
}

@Component({ template: "" })
class EmptyHost {
  private readonly people = signal(PEOPLE);
  private readonly source = injectFrontendData<Person>({
    data: this.people,
    columns: COLUMNS,
    getRowId: (row) => row.id,
  });
  private readonly table = injectDataTable<Person>({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
  readonly panel = injectGroupingPanelState({
    table: this.table,
    source: this.source,
    features: [],
  });
}

describe("injectGroupingPanelState", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
  });

  it("seeds groupBy and lets the strip add and remove fields", async () => {
    const fixture = TestBed.createComponent(LiveHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector(".keys")?.textContent).toBe("team");
    element.querySelector<HTMLButtonElement>(".add")!.click();
    await fixture.whenStable();
    expect(element.querySelector(".keys")?.textContent).toBe("team,budget");
    element.querySelector<HTMLButtonElement>(".remove")!.click();
    await fixture.whenStable();
    expect(element.querySelector(".keys")?.textContent).toBe("budget");
  });

  it("returns nothing without the panel feature", () => {
    const fixture = TestBed.createComponent(EmptyHost);
    expect(fixture.componentInstance.panel).toBeUndefined();
  });
});

interface ReconcileRow {
  id: string;
  team: string;
  points: number;
}

const RECONCILE_ROWS: ReconcileRow[] = Array.from(
  { length: 40 },
  (_, index) => ({
    id: String(index),
    team: index % 2 === 0 ? "A" : "B",
    points: index,
  })
);

const RECONCILE_COLUMNS: ColumnDef<ReconcileRow>[] = [
  { key: "team", header: "Team" },
  {
    key: "points",
    header: "Points",
    aggregatable: { operations: ["sum", "avg"] },
  },
];

@Component({ template: "" })
class ReconcileHost {
  readonly source = injectFrontendData<ReconcileRow>({
    data: signal(RECONCILE_ROWS),
    columns: RECONCILE_COLUMNS,
    getRowId: (row) => row.id,
    defaults: { limit: 10 },
  });
  private readonly features = [groupingPanel()];
  private readonly table = injectDataTable<ReconcileRow>({
    source: this.source,
    columns: RECONCILE_COLUMNS,
    rowKey: (row) => row.id,
    features: this.features,
  });
  readonly panel = injectGroupingPanelState({
    table: this.table,
    source: this.source,
    features: this.features,
  })!;
}

describe("injectGroupingPanelState reconcile", () => {
  beforeEach(() => {
    reconcile.mockClear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ADAPTTABLE_URL_ADAPTER,
          useValue: createMemoryAdapter(),
        },
      ],
    });
  });

  it("runs when a reader's aggregate choice changes, not on paging, search or grouping", async () => {
    const fixture = TestBed.createComponent(ReconcileHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const first = reconcile.mock.calls.length;
    expect(first).toBe(1);

    host.source().setPage(2);
    await fixture.whenStable();
    host.source().setSearch("x");
    await fixture.whenStable();
    expect(reconcile).toHaveBeenCalledTimes(first);

    host.panel().state.add("team");
    await fixture.whenStable();
    expect(reconcile).toHaveBeenCalledTimes(first);

    host.source().setGroupAggregateOverrides!({ points: "avg" });
    await fixture.whenStable();
    expect(reconcile).toHaveBeenCalledTimes(first + 1);
    expect(host.source().groupAggregateOverrides).toEqual({ points: "avg" });
  });
});
