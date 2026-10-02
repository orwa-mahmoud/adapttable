/**
 * Behaviour of {@link tableRuntimeFor}: the view core publishes, and the
 * reorder / grouping controllers that read it.
 */
import {
  createGroupingPanelController,
  createMemoryAdapter,
  createRowReorderController,
  resolveLabels,
  rowReorderRuntimeOptions,
  type TableSource,
} from "@adapttable/core";
import { Component, computed, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectDataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";
import { grouping, injectGrouping } from "../features/grouping";
import { groupingPanel } from "../features/groupingPanel";
import { rowReorder } from "../features/rowReorder";
import { injectGroupingPanelState } from "../grouping/groupingPanelState";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { tableRuntimeFor } from "./tableRuntime";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", team: "A", budget: 10 },
  { id: "2", name: "Grace", team: "B", budget: 20 },
  { id: "3", name: "Linus", team: "A", budget: 30 },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
  {
    key: "budget",
    header: "Budget",
    accessor: (row) => row.budget,
    aggregatable: { operations: ["sum", "avg"] },
  },
];

describe("tableRuntimeFor", () => {
  it("publishes live feature ids without replacing the runtime or neutral table", async () => {
    @Component({ template: "" })
    class Host {
      readonly features = signal<readonly AdaptTableFeature[]>([
        { id: "first" },
        {},
      ]);
      readonly source = injectFrontendData({
        data: PEOPLE,
        columns: COLUMNS,
        urlSync: false,
      });
      readonly table = injectDataTable({
        source: this.source,
        columns: COLUMNS,
        rowKey: (row) => row.id,
        features: this.features,
      });
      readonly runtime = tableRuntimeFor(
        this.table,
        this.source,
        this.features
      );
    }
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const runtime = host.runtime;
    const neutral = runtime.view()!.neutralTable!;
    const notifications = vi.fn();
    const unsubscribe = neutral.subscribe("all", notifications);
    expect(runtime.featureIds()).toEqual(["first", "feature-1"]);
    expect(neutral.rows("visible")).toEqual(PEOPLE);

    host.features.set([{ id: "second" }]);
    await fixture.whenStable();
    expect(host.runtime).toBe(runtime);
    expect(runtime.featureIds()).toEqual(["second"]);
    expect(runtime.view()!.neutralTable).toBe(neutral);
    host.source().setSearch("Grace");
    await fixture.whenStable();
    expect(runtime.rowAt(0)).toBe(PEOPLE[1]);
    expect(neutral.rows("visible")).toEqual([PEOPLE[1]]);
    expect(notifications).toHaveBeenLastCalledWith(neutral.revisions);

    host.features.set([]);
    await fixture.whenStable();
    expect(runtime.featureIds()).toEqual([]);
    expect(runtime.view()!.neutralTable).toBe(neutral);
    expect(neutral.rows("visible")).toEqual([PEOPLE[1]]);
    unsubscribe();
    fixture.destroy();
  });

  it("refuses reorder on a sorted table and announces moveRejectedSorted", async () => {
    @Component({ template: "" })
    class Host {
      readonly data = signal(PEOPLE);
      readonly onRowReorder = vi.fn();
      readonly features = [rowReorder(this.onRowReorder)];
      readonly source = injectFrontendData({
        data: this.data,
        columns: COLUMNS,
        paginationMode: "paged",
        defaults: { limit: 10 },
      });
      readonly table = injectDataTable({
        source: this.source,
        columns: COLUMNS,
        rowKey: (row) => row.id,
      });
      readonly runtime = tableRuntimeFor(
        this.table,
        this.source,
        this.features
      );
    }

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ADAPTTABLE_URL_ADAPTER,
          useValue: createMemoryAdapter("sortBy=name&sortDir=asc"),
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { runtime, onRowReorder, source } = fixture.componentInstance;
    expect(source().sortBy).toBe("name");
    expect(runtime.view()?.sortBy).toBe("name");

    const labels = resolveLabels(undefined);
    const controller = createRowReorderController(
      rowReorderRuntimeOptions(runtime, onRowReorder)
    );
    controller.connect();
    controller.moveBy(0, 1, PEOPLE[0]!, 0, PEOPLE.length);

    expect(controller.getSnapshot().announcement).toBe(
      labels.moveRejectedSorted
    );
    expect(onRowReorder).not.toHaveBeenCalled();
  });

  it("reads the grouped leaves in render order while the table groups", async () => {
    @Component({ template: "" })
    class Host {
      readonly data = signal(PEOPLE);
      readonly features = [grouping("team")];
      readonly source = injectFrontendData({
        data: this.data,
        columns: COLUMNS,
      });
      readonly table = injectDataTable({
        source: this.source,
        columns: COLUMNS,
        rowKey: (row) => row.id,
        features: this.features,
      });
      readonly grouping = injectGrouping({
        table: this.table,
        source: this.source,
        features: this.features,
      })!;
      readonly runtime = tableRuntimeFor(
        this.table,
        this.source,
        this.features,
        this.grouping
      );
    }

    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { runtime } = fixture.componentInstance;
    expect(runtime.view()?.visibleRows?.map((row) => row.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
    expect(runtime.rowAt(1)?.name).toBe("Linus");
  });

  it("drops a URL-carried avg when the server only lists sum, and never offers avg", async () => {
    const adapter = createMemoryAdapter("groupBy=team&groupAgg=budget%3Aavg");
    expect(adapter.getSearch()).toContain("groupAgg=budget%3Aavg");

    @Component({ template: "" })
    class Host {
      readonly data = signal(PEOPLE);
      readonly features = [groupingPanel(["team"])];
      private readonly base = injectFrontendData({
        data: this.data,
        columns: COLUMNS,
        paginationMode: "paged",
      });
      readonly source: Signal<TableSource<Person>> = computed(() => ({
        ...this.base(),
        capabilities: {
          fullDataset: false,
          grouping: "server",
          selectAcrossPages: false,
          exportScope: "page",
          totalCount: "exact",
        },
        aggregateOperations: ["sum"],
        honorsAggregates: true,
      }));
      readonly table = injectDataTable({
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
      readonly runtime = tableRuntimeFor(
        this.table,
        this.source,
        this.features
      );
    }

    TestBed.configureTestingModule({
      providers: [{ provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { panel, source, runtime } = fixture.componentInstance;
    expect(runtime.view()?.sourceCapabilities?.grouping).toBe("server");
    expect(runtime.view()?.groupingState?.aggregateOperations).toEqual(["sum"]);

    // Panel reconcile drops the URL avg the server does not list.
    expect(source().groupAggregateOverrides).toEqual({});
    expect(adapter.getSearch()).not.toContain("avg");

    const offered =
      panel()
        .state.aggregations.candidates.find(
          (candidate) => candidate.columnKey === "budget"
        )
        ?.operations.map((operation) => operation.id) ?? [];
    expect(offered).toEqual(["sum"]);
    expect(offered).not.toContain("avg");

    panel().state.setAggregateOperation("budget", "avg");
    expect(source().groupAggregateOverrides).toEqual({});
    panel().state.setAggregateOperation("budget", "sum");
    expect(source().groupAggregateOverrides).toEqual({ budget: "sum" });
  });

  it("records removal of a query-declared aggregate so it does not come back", async () => {
    @Component({ template: "" })
    class Host {
      readonly data = signal(PEOPLE);
      readonly features = [groupingPanel(["team"])];
      private readonly base = injectFrontendData({
        data: this.data,
        columns: COLUMNS,
        paginationMode: "paged",
      });
      readonly source: Signal<TableSource<Person>> = computed(() => ({
        ...this.base(),
        queryAggregates: [{ key: "budget", fn: "sum" }],
        honorsAggregates: true,
      }));
      readonly table = injectDataTable({
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
      readonly runtime = tableRuntimeFor(
        this.table,
        this.source,
        this.features
      );
    }

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ADAPTTABLE_URL_ADAPTER,
          useValue: createMemoryAdapter("groupBy=team"),
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { panel, source, runtime } = fixture.componentInstance;
    expect(runtime.view()?.groupingState?.queryAggregates).toEqual([
      { key: "budget", fn: "sum" },
    ]);
    expect(
      panel().state.aggregations.items.some(
        (item) => item.columnKey === "budget" && item.operationId === "sum"
      )
    ).toBe(true);

    panel().state.removeAggregate("budget");
    fixture.detectChanges();
    expect(source().groupAggregateOverrides).toEqual({ budget: "none" });

    // A second reconcile must not resurrect the developer's declaration.
    const controller = createGroupingPanelController({
      runtime: runtime as never,
    });
    controller.reconcile();
    expect(source().groupAggregateOverrides).toEqual({ budget: "none" });
    expect(
      panel().state.aggregations.items.some(
        (item) => item.columnKey === "budget" && item.operationId === "sum"
      )
    ).toBe(false);
  });

  it("announces a column with no header by its mobileLabel", async () => {
    const columns: ColumnDef<Person>[] = [
      {
        key: "code",
        // Non-string header so resolveColumns does not humanize the key;
        // columnLabel must fall through to mobileLabel.
        header: { node: true } as unknown as string,
        mobileLabel: "Code label",
        accessor: (row) => row.id,
      },
      { key: "name", header: "Name", accessor: (row) => row.name },
    ];

    @Component({ template: "" })
    class Host {
      readonly data = signal(PEOPLE);
      readonly features = [groupingPanel()];
      readonly source = injectFrontendData({
        data: this.data,
        columns,
        paginationMode: "paged",
      });
      readonly table = injectDataTable({
        source: this.source,
        columns,
        rowKey: (row) => row.id,
        features: this.features,
      });
      readonly runtime = tableRuntimeFor(
        this.table,
        this.source,
        this.features
      );
      readonly panel = injectGroupingPanelState({
        table: this.table,
        source: this.source,
        features: this.features,
      })!;
    }

    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const { runtime, panel } = fixture.componentInstance;
    expect(runtime.view()?.groupingState?.columnLabel("code")).toBe(
      "Code label"
    );

    panel().state.add("code");
    fixture.detectChanges();
    expect(panel().state.announcement).toBe("Code label added to grouping");
  });
});
