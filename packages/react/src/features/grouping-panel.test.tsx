import type { GroupAggregateOverrides } from "@adapttable/core";
import {
  columnMenuActions,
  type ColumnMenuChoice,
  type ColumnMenuRow,
} from "@adapttable/core";
import {
  GROUPING_COLUMN_DND_MIME,
  type GroupingPanelInteractions,
  type GroupingPanelState,
} from "@adapttable/core";
import { defaultLabels } from "@adapttable/core";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import type { UseColumnLayoutResult } from "../columns/useColumnLayout";
import { featureHostOf, useTableFeatures } from "./featureHost";
import { groupingPanel } from "./grouping-panel";
import { GROUPING_PANEL_STATE } from "./groupingPanelKey";
import {
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "./providers";
import { applyTableFeatures } from "./tableFeature";

const row: ColumnMenuRow<unknown> = {
  column: { key: "budget" },
  key: "budget",
  name: "Budget",
  hidden: false,
  pinned: undefined,
  index: 0,
  canMove: true,
  canHide: true,
  canPin: true,
  canResize: true,
  canSort: false,
  canFilter: false,
};

const layout = {
  state: { order: [], hidden: [], pinned: {}, widths: {} },
  setPinned: vi.fn(),
  toggleVisible: vi.fn(),
  setWidth: vi.fn(),
  resetName: vi.fn(),
} as unknown as UseColumnLayoutResult<unknown>;

function panel(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({}),
    chipDragProps: () => ({}),
    chipKeyboardProps: () => ({
      tabIndex: 0,
      role: "button",
      "aria-label": "Move",
      onKeyDown: () => undefined,
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({}),
    add: vi.fn(),
    remove: vi.fn(),
    moveBy: vi.fn(),
    setAggregate: vi.fn(),
    ...overrides,
  };
}

describe("groupingPanel feature", () => {
  it("does not pin initial keys as a controlled groupBy prop", () => {
    expect(
      applyTableFeatures({ features: [groupingPanel(["team"])] })
    ).not.toHaveProperty("groupBy");
  });

  it("adds group and aggregation controls to the column menu", () => {
    const state = panel();
    const { result } = renderHook(() => {
      const props = useTableFeatures({ features: [groupingPanel()] });
      return columnMenuActions(row, {
        labels: defaultLabels,
        layout,
        featureHost: featureHostOf(props),
        groupingPanel: state,
      });
    });
    const group = result.current.find((item) => item.id === "group-by-column");
    expect(group).toBeDefined();
    if (group && !("kind" in group)) group.run();
    expect(state.add).toHaveBeenCalledWith("budget");

    const choice = result.current.find(
      (item): item is ColumnMenuChoice => item.id === "group-aggregation"
    );
    expect(choice?.options.map((option) => option.value)).toEqual([
      "",
      "sum",
      "avg",
      "min",
      "max",
      "count",
      "none",
    ]);
    choice?.onChange("avg");
    expect(state.setAggregate).toHaveBeenCalledWith("budget", "avg");
  });

  it("offers ungroup instead of group for an active grouping field", () => {
    const state = panel({ groupBy: ["budget"] });
    const groupedRow: ColumnMenuRow<unknown> = {
      ...row,
      key: "budget",
      name: "Budget",
    };
    const { result } = renderHook(() => {
      const props = useTableFeatures({ features: [groupingPanel()] });
      return columnMenuActions(groupedRow, {
        labels: defaultLabels,
        layout,
        featureHost: featureHostOf(props),
        groupingPanel: state,
      });
    });
    const ungroup = result.current.find((item) => item.id === "ungroup-column");
    expect(ungroup).toBeDefined();
    if (ungroup && !("kind" in ungroup)) ungroup.run();
    expect(state.remove).toHaveBeenCalledWith("budget");
    expect(result.current.some((item) => item.id === "group-aggregation")).toBe(
      false
    );
  });
});

function mockGroupingState(initialGroupBy?: string) {
  let groupBy = initialGroupBy;
  let aggregateOverrides: GroupAggregateOverrides = {};
  return {
    get groupBy() {
      return groupBy;
    },
    get aggregateOverrides() {
      return aggregateOverrides;
    },
    columnLabel: (key: string) => {
      if (key === "team") return "Team";
      if (key === "budget") return "Budget";
      return key;
    },
    setGroupBy: vi.fn((next?: string) => {
      groupBy = next;
    }),
    initializeGroupBy: vi.fn((encoded: string) => {
      groupBy = encoded;
    }) as ReturnType<typeof vi.fn<(encoded: string) => void>> | undefined,
    setAggregateOverrides: vi.fn((next: GroupAggregateOverrides) => {
      aggregateOverrides = next;
    }) as
      | ReturnType<typeof vi.fn<(next: GroupAggregateOverrides) => void>>
      | undefined,
  };
}

function runtimeView(
  groupingState: ReturnType<typeof mockGroupingState>
): TableRuntimeView<unknown> {
  return {
    rows: [],
    getRowId: () => "1",
    rowLabel: () => "Row",
    groupingState,
  };
}

function dragTransfer(_key?: string) {
  const data = new Map<string, string>();
  return {
    types: [GROUPING_COLUMN_DND_MIME],
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
    getData: (type: string) => data.get(type) ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
}

function Chrome({
  labels,
  onState,
  view,
}: {
  readonly labels?: Record<string, unknown>;
  readonly onState?: (state: GroupingPanelInteractions) => void;
  readonly view?: TableRuntimeView<unknown>;
}) {
  usePublishTableRuntime([], labels, view);
  const panel = useFeatureState(GROUPING_PANEL_STATE);
  if (!panel) return <span data-testid="state">absent</span>;
  onState?.(panel);
  return (
    <div>
      <span data-testid="state">present</span>
      <span data-testid="announcement">{panel.announcement}</span>
      <button
        type="button"
        data-testid="header-team"
        {...(panel.headerDragProps(
          "team"
        ) as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {"Team header"}
      </button>
      <button
        type="button"
        data-testid="add-budget"
        onClick={() => panel.add("budget")}
      >
        {"Add budget"}
      </button>
      <button
        type="button"
        data-testid="chip-team"
        {...(panel.chipDragProps(
          "team"
        ) as ButtonHTMLAttributes<HTMLButtonElement>)}
        {...(panel.chipKeyboardProps(
          "team",
          "Team"
        ) as unknown as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {"Team chip"}
      </button>
      <div
        data-testid="drop-1"
        {...(panel.dropProps(1) as HTMLAttributes<HTMLDivElement>)}
      />
      <div
        data-testid="remove-zone"
        {...(panel.removeDropProps() as HTMLAttributes<HTMLDivElement>)}
      />
    </div>
  );
}

function mountProvider(
  feature: ReturnType<typeof groupingPanel> | undefined,
  labels?: Record<string, unknown>,
  onState?: (state: GroupingPanelInteractions) => void,
  view?: TableRuntimeView<unknown>
) {
  const props = applyTableFeatures({ features: feature ? [feature] : [] });
  return render(
    <FeatureProviders props={props}>
      <Chrome labels={labels} onState={onState} view={view} />
    </FeatureProviders>
  );
}

describe("groupingPanel provider", () => {
  it("publishes nothing when the feature is not composed", () => {
    mountProvider(undefined);
    expect(screen.getByTestId("state")).toHaveTextContent("absent");
  });

  it("uses one provider component for every factory call", () => {
    const first = groupingPanel(["team"]);
    const second = groupingPanel(["budget"]);
    expect(first.provider?.Provider).toBe(second.provider?.Provider);
  });

  it("seeds initial keys once through grouping state", () => {
    const groupingState = mockGroupingState();
    mountProvider(
      groupingPanel(["budget"]),
      undefined,
      undefined,
      runtimeView(groupingState)
    );
    expect(groupingState.initializeGroupBy).toHaveBeenCalledWith("budget");
  });

  it("adds, moves, removes, and announces grouping changes", () => {
    const groupingState = mockGroupingState("team");
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      defaultLabels,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );

    act(() => {
      screen.getByTestId("add-budget").click();
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("team,budget");
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Budget added to grouping"
    );

    act(() => {
      panel!.moveBy("budget", -1);
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("budget,team");
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Budget moved to grouping position 1"
    );

    act(() => {
      panel!.remove("team");
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("budget");
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Team removed from grouping"
    );
  });

  it("handles header and chip drag/drop and the chip-only ungroup target", () => {
    const groupingState = mockGroupingState("team");
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      defaultLabels,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );

    const transfer = dragTransfer("budget");
    act(() => {
      panel!.headerDragProps("budget").onDragStart?.({
        target: screen.getByTestId("header-team"),
        currentTarget: screen.getByTestId("header-team"),
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
      panel!.dropProps(1).onDrop?.({
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("team,budget");

    const chipTransfer = dragTransfer("team");
    act(() => {
      panel!.chipDragProps("team").onDragStart?.({
        target: screen.getByTestId("chip-team"),
        currentTarget: screen.getByTestId("chip-team"),
        dataTransfer: chipTransfer,
        preventDefault: () => undefined,
      } as never);
    });
    act(() => {
      panel!.removeDropProps().onDrop?.({
        dataTransfer: chipTransfer,
        preventDefault: () => undefined,
      } as never);
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("budget");
  });

  it("ignores header drags that start on interactive controls", () => {
    const groupingState = mockGroupingState("team");
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      undefined,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );
    const prevent = vi.fn();
    act(() => {
      panel!.headerDragProps("team").onDragStart?.({
        target: document.createElement("button"),
        currentTarget: document.createElement("th"),
        dataTransfer: dragTransfer("team"),
        preventDefault: prevent,
      } as never);
    });
    expect(prevent).toHaveBeenCalled();
    expect(panel!.drag).toBeUndefined();
  });

  it("moves chips with keyboard arrows and writes aggregate overrides", () => {
    const groupingState = mockGroupingState("team,budget");
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      defaultLabels,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );

    act(() => {
      fireEvent.keyDown(screen.getByTestId("chip-team"), { key: "ArrowRight" });
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("budget,team");

    act(() => {
      panel!.setAggregate("budget", "avg");
    });
    expect(groupingState.setAggregateOverrides).toHaveBeenCalledWith({
      budget: "avg",
    });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Budget group aggregation changed to Average"
    );

    act(() => {
      panel!.setAggregate("budget", undefined);
    });
    expect(groupingState.setAggregateOverrides).toHaveBeenCalledWith({});
  });

  it("falls back to setGroupBy when initializeGroupBy is absent", () => {
    const groupingState = mockGroupingState();
    groupingState.initializeGroupBy = undefined;
    mountProvider(
      groupingPanel(["team"]),
      defaultLabels,
      undefined,
      runtimeView(groupingState)
    );
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("team");
  });

  it("covers drag hover, reorder announcements, and duplicate adds", () => {
    const groupingState = mockGroupingState("team,budget");
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      defaultLabels,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );

    const transfer = dragTransfer("team");
    act(() => {
      panel!.chipDragProps("team").onDragStart?.({
        target: screen.getByTestId("chip-team"),
        currentTarget: screen.getByTestId("chip-team"),
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
    });
    act(() => {
      panel!.dropProps(2).onDragEnter?.({
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
      panel!.dropProps(2).onDragOver?.({
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
      panel!.removeDropProps().onDragEnter?.({
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
      panel!.removeDropProps().onDragOver?.({
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
      panel!.dropProps(2).onDrop?.({
        dataTransfer: transfer,
        preventDefault: () => undefined,
      } as never);
      panel!.headerDragProps("team").onDragEnd?.({} as never);
      screen.getByTestId("add-budget").click();
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("budget,team");
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Team moved to grouping position 2"
    );
    expect(groupingState.setGroupBy).toHaveBeenCalledTimes(1);
  });

  it("supports vertical and rtl keyboard moves and no-op edge moves", () => {
    const groupingState = mockGroupingState("team,budget");
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      defaultLabels,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );

    const rtlChip = screen.getByTestId("chip-team");
    rtlChip.setAttribute("dir", "rtl");
    act(() => {
      fireEvent.keyDown(rtlChip, { key: "ArrowLeft" });
      fireEvent.keyDown(rtlChip, { key: "ArrowUp" });
      fireEvent.keyDown(rtlChip, { key: "ArrowDown" });
      panel!.moveBy("team", -1);
      panel!.add("team");
    });
    expect(groupingState.setGroupBy).toHaveBeenCalledWith("budget,team");
  });

  it("skips aggregate writes when the source exposes no mutator", () => {
    const groupingState = mockGroupingState("team");
    groupingState.setAggregateOverrides = undefined;
    let panel: GroupingPanelInteractions | undefined;
    mountProvider(
      groupingPanel(),
      defaultLabels,
      (next) => {
        panel = next;
      },
      runtimeView(groupingState)
    );

    act(() => {
      panel!.setAggregate("team", "sum");
    });
    expect(groupingState.setAggregateOverrides).toBeUndefined();
  });
});
