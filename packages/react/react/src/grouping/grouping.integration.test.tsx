import { resetDevWarnings } from "@adapttable/core/binding";
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChromeExtrasGate } from "../features/chromeExtrasGate";
import { editing } from "../features/editing";
import { useFeatureState } from "../features/featureState";
import { grouping } from "../features/grouping";
import { groupingPanel } from "../features/grouping-panel";
import { FeatureProviders } from "../features/providers";
import {
  EDITING_STATE,
  GROUPING_PANEL_VIEW_STATE,
  GROUPING_STATE,
  type GroupingState,
} from "../features/stateKeys";
import {
  applyTableFeatures,
  type TableFeature,
} from "../features/tableFeature";
import { renderLiveChrome } from "../liveChrome.test-utils";
import { useFrontendData } from "../source/useFrontendData";
import { createMemoryAdapter } from "../url/adapter";
import { useTableUrlState } from "../url/useTableUrlState";
import { useTableChrome } from "../useTableChrome";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

interface Row {
  id: string;
  team: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", team: "Core", name: "Ada" },
  { id: "2", team: "Platform", name: "Alan" },
  { id: "3", team: "Core", name: "Grace" },
];

describe("groupBy URL round-trip", () => {
  it("reads, writes, and clearAll clears groupBy", () => {
    const adapter = createMemoryAdapter("groupBy=team");
    const { result } = renderHook(() =>
      useTableUrlState({ urlAdapter: adapter, defaults: { limit: 10 } })
    );
    expect(result.current.groupBy).toBe("team");
    act(() => result.current.setGroupBy("name"));
    expect(adapter.getSearch()).toContain("groupBy=name");
    act(() => result.current.setGroupBy(undefined));
    expect(new URLSearchParams(adapter.getSearch()).get("groupBy")).toBe("");
    expect(result.current.groupBy).toBeUndefined();
    act(() => result.current.setGroupBy("team"));
    act(() => result.current.clearAll());
    expect(new URLSearchParams(adapter.getSearch()).get("groupBy")).toBeNull();
    expect(result.current.groupBy).toBeUndefined();
  });

  it("honours defaults.groupBy and empty-marker clear", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useTableUrlState({
        urlAdapter: adapter,
        defaults: { limit: 10, groupBy: "team" },
      })
    );
    expect(result.current.groupBy).toBe("team");
    act(() => result.current.setGroupBy(undefined));
    expect(adapter.getSearch()).toContain("groupBy=");
    expect(result.current.groupBy).toBeUndefined();
    act(() => result.current.clearAll());
    expect(adapter.getSearch()).toContain("groupBy=");
  });
});

const PAGED_ROWS: Row[] = [
  { id: "1", team: "Core", name: "Ada" },
  { id: "2", team: "Core", name: "Grace" },
  { id: "3", team: "Platform", name: "Alan" },
  { id: "4", team: "Platform", name: "Radia" },
];

describe("editing row universe under grouping", () => {
  function chromeWith(groupBy: string | undefined) {
    const features: TableFeature<Row>[] = [
      editing(() => undefined),
      ...(groupBy ? [grouping(groupBy)] : []),
    ];
    return renderLiveChrome(features, () => {
      const source = useFrontendData<Row>({
        data: PAGED_ROWS,
        columns: [{ key: "team" }, { key: "name" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 2 },
      });
      return {
        source,
        columns: [{ key: "team" }, { key: "name" }],
        rowKey: (r) => r.id,
        groupBy,
        onCellEdit: () => undefined,
      };
    }, [EDITING_STATE]);
  }

  it("exposes the grouped leaf set as editingRows, the page slice otherwise", () => {
    const grouped = chromeWith("team");
    expect(grouped.result.current.editingRows.map((r) => r.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    const paged = chromeWith(undefined);
    expect(paged.result.current.editingRows.map((r) => r.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("keeps an edit alive on a grouped row outside the page slice", () => {
    // Regression: the discard guard once checked `source.rows` (the page
    // slice) while the grouped body rendered the full filtered set — every
    // off-page row froze as display-only the instant editing began.
    const { result } = chromeWith("team");
    act(() => result.state(EDITING_STATE)?.state.begin("4", "name", "Radia"));
    expect(result.state(EDITING_STATE)?.state.active).toMatchObject({
      rowId: "4",
      columnKey: "name",
    });
  });

  it("still discards an edit whose row is not in the rendered set", () => {
    const { result } = chromeWith("team");
    act(() => result.state(EDITING_STATE)?.state.begin("999", "name", "x"));
    expect(result.state(EDITING_STATE)?.state.active).toBeNull();
  });

  it("keeps page-slice semantics when grouping is off", () => {
    const { result } = chromeWith(undefined);
    act(() => result.state(EDITING_STATE)?.state.begin("4", "name", "Radia"));
    expect(result.state(EDITING_STATE)?.state.active).toBeNull();
  });
});

describe("useTableChrome grouping bundle", () => {
  it("stays dormant without groupBy", () => {
    const { result: sourceResult } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "team" }, { key: "name" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 10 },
      })
    );
    const { result } = renderLiveChrome([], () => ({
      source: sourceResult.current,
      columns: [{ key: "team" }, { key: "name" }],
      rowKey: (r: Row) => r.id,
    }));
    expect(result.state(GROUPING_STATE)).toBeUndefined();
  });

  it("arms grouping from prop groupBy on frontend source", () => {
    const { result } = renderLiveChrome([grouping("team")], () => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "team" }, { key: "name" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 10 },
      });
      return {
        source,
        columns: [{ key: "team" }, { key: "name" }],
        rowKey: (r) => r.id,
        groupBy: "team",
        groupAggregates: (rows) => ({ name: rows.length }),
      };
    });
    // The bundle carries the keys as a list now, one entry for a flat group.
    expect(result.state(GROUPING_STATE)?.groupBy).toEqual(["team"]);
    expect(result.state(GROUPING_STATE)?.entries[0]).toMatchObject({
      kind: "group",
      label: "Core",
    });
    const core = result.state(GROUPING_STATE)?.entries[0];
    if (core?.kind === "group") {
      expect(core.aggregateCells).toEqual({ name: 2 });
    }
  });

  it("layers URL aggregate choices over developer group cells", () => {
    const { result } = renderLiveChrome(
      [
        grouping<Row>("team", {
          groupAggregates: () => ({ name: "developer", team: "kept" }),
        }),
      ],
      () => {
        const columns = [
          {
            key: "team",
            aggregatable: { operations: ["count"] as const },
          },
          {
            key: "name",
            aggregatable: { operations: ["count"] as const },
          },
        ];
        const source = useFrontendData<Row>({
          data: ROWS,
          columns,
          urlAdapter: createMemoryAdapter(
            "groupAgg=name%3Acount%2Cteam%3Anone"
          ),
          defaults: { limit: 10 },
        });
        return {
          source,
          columns,
          rowKey: (row) => row.id,
          groupBy: "team",
          groupAggregates: () => ({ name: "developer", team: "kept" }),
        };
      }
    );
    const core = result.state(GROUPING_STATE)?.entries[0];
    expect(core?.kind).toBe("group");
    if (core?.kind === "group") {
      expect(core.aggregateCells).toEqual({ name: 2 });
    }
  });

  it("devWarns and stays dormant when groupBy is set without allFilteredRows", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result: sourceResult } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "team" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 10 },
      })
    );
    // Strip allFilteredRows to simulate a server source shape.
    const serverish = {
      ...sourceResult.current,
      allFilteredRows: undefined,
    };
    const { result } = renderLiveChrome([grouping("team")], () => ({
      source: serverish,
      columns: [{ key: "team" }],
      rowKey: (r) => r.id,
      groupBy: "team",
    }));
    expect(result.state(GROUPING_STATE)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("groupBy is ignored: this source cannot group")
    );
  });
});

describe("grouping panel integration", () => {
  it("merges url aggregate overrides into live panel state", () => {
    const { result } = renderLiveChrome([groupingPanel<Row>("team")], () => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: [
          { key: "team", header: "Team" },
          { key: "name", header: "Name" },
        ],
        urlAdapter: createMemoryAdapter("groupBy=team&groupAgg=name%3Acount"),
        defaults: { limit: 10 },
      });
      return {
        source,
        columns: [
          { key: "team", header: "Team" },
          { key: "name", header: "Name" },
        ],
        rowKey: (row) => row.id,
        groupBy: "team",
      };
    });

    expect(result.state(GROUPING_PANEL_VIEW_STATE)?.groupBy).toEqual(["team"]);
    expect(result.state(GROUPING_PANEL_VIEW_STATE)?.aggregateOverrides).toEqual(
      {
        name: "count",
      }
    );
    expect(result.state(GROUPING_PANEL_VIEW_STATE)?.canSetAggregates).toBe(
      true
    );
  });

  it("shows a plain groupAggregates mapper as owned by the app", () => {
    const { result } = renderLiveChrome(
      [grouping("team"), groupingPanel()],
      () => {
        const source = useFrontendData<Row>({
          data: ROWS,
          columns: [
            { key: "team", header: "Team" },
            { key: "name", header: "Name" },
          ],
          urlAdapter: createMemoryAdapter(""),
          defaults: { limit: 10 },
        });
        return {
          source,
          columns: [
            { key: "team", header: "Team" },
            { key: "name", header: "Name" },
          ],
          rowKey: (row) => row.id,
          groupBy: "team",
          groupAggregates: (rows) => ({ name: rows.length }),
        };
      }
    );
    expect(result.state(GROUPING_PANEL_VIEW_STATE)?.aggregations.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columnKey: "name",
          origin: "host",
          editable: false,
        }),
      ])
    );
  });
});

describe("incremental totals follow effective aggregation config", () => {
  interface PaidRow {
    id: string;
    team: string;
    salary: number;
  }

  const PAID: PaidRow[] = [
    { id: "1", team: "Core", salary: 100 },
    { id: "2", team: "Core", salary: 80 },
    { id: "3", team: "Web", salary: 40 },
  ];

  it("rebuilds cached group totals when a column default changes", () => {
    const grouped: { current: GroupingState<PaidRow> | undefined } = {
      current: undefined,
    };
    function GroupingProbe() {
      grouped.current = useFeatureState(GROUPING_STATE) as
        GroupingState<PaidRow> | undefined;
      return null;
    }
    function Probe({
      aggregatable,
    }: {
      aggregatable: {
        default: "sum" | "avg";
        operations: readonly ("sum" | "avg")[];
      };
    }) {
      const columns = [{ key: "team" }, { key: "salary", aggregatable }];
      const applied = applyTableFeatures({
        features: [grouping("team")],
      });
      function Live() {
        const source = useFrontendData<PaidRow>({
          data: PAID,
          columns,
          urlAdapter: createMemoryAdapter(""),
          defaults: { limit: 10 },
        });
        const chromeProps = {
          ...applied,
          source,
          columns,
          rowKey: (row: PaidRow) => row.id,
          groupBy: "team",
        };
        const base = useTableChrome<PaidRow>(chromeProps);
        return (
          <ChromeExtrasGate chrome={base} props={chromeProps}>
            {() => <GroupingProbe />}
          </ChromeExtrasGate>
        );
      }
      return (
        <FeatureProviders props={applied}>
          <Live />
        </FeatureProviders>
      );
    }

    const { rerender } = render(
      <Probe aggregatable={{ default: "sum", operations: ["sum", "avg"] }} />
    );
    const coreSum = grouped.current?.entries.find(
      (entry) => entry.kind === "group" && entry.label === "Core"
    );
    expect(coreSum?.kind === "group" && coreSum.aggregateCells).toEqual({
      salary: 180,
    });

    rerender(
      <Probe aggregatable={{ default: "avg", operations: ["sum", "avg"] }} />
    );
    const coreAvg = grouped.current?.entries.find(
      (entry) => entry.kind === "group" && entry.label === "Core"
    );
    expect(coreAvg?.kind === "group" && coreAvg.aggregateCells).toEqual({
      salary: 90,
    });
  });
});
