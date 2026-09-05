import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildGroupedFlatModel } from "@adapttable/core";
import type { ColumnDef } from "../columnDef";
import type { RowReorderState } from "../rows/rowReorder";
import { buildTreeEntries } from "@adapttable/core";
import {
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "./providers";
import { ROW_REORDER, rowReorder } from "./row-reorder";
import { applyTableFeatures } from "./tableFeature";

interface Row {
  id: string;
  name: string;
  team: string;
  parentId?: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Ada", team: "A" },
  { id: "b", name: "Bob", team: "B", parentId: "a" },
  { id: "c", name: "Cleo", team: "B" },
];

function runtimeView(
  extras: Pick<TableRuntimeView<Row>, "grouping" | "tree" | "sortBy">
): TableRuntimeView<Row> {
  return {
    rows: ROWS,
    getRowId: (row) => row.id,
    rowLabel: (row) => row.name,
    ...extras,
  };
}

/**
 * Stands in for the chrome: publishes the rows and labels the provider reads,
 * then renders whatever the feature made available.
 */
function Chrome({
  labels,
  onState,
  view,
}: {
  readonly labels?: Record<string, unknown>;
  readonly onState?: (state: RowReorderState<Row>) => void;
  readonly view?: TableRuntimeView<Row>;
}) {
  usePublishTableRuntime(ROWS, labels, view);
  const reorder = useFeatureState(ROW_REORDER) as
    RowReorderState<Row> | undefined;
  if (!reorder) return <span data-testid="state">absent</span>;
  onState?.(reorder);
  return (
    <div>
      <span data-testid="state">present</span>
      <span data-testid="announcement">{reorder.announcement}</span>
      <span data-testid="lifted">{String(reorder.lifted?.rowId)}</span>
      {ROWS.map((row, index) => (
        <button
          key={row.id}
          type="button"
          data-testid={`row-${row.id}`}
          {...reorder.dragProps(row.id, index)}
          onKeyDown={(event) =>
            reorder.handleKeyDown(event, row.id, index, row, 0, ROWS.length)
          }
        >
          {row.name}
        </button>
      ))}
    </div>
  );
}

function mount(
  feature: ReturnType<typeof rowReorder<Row>> | undefined,
  labels?: Record<string, unknown>,
  onState?: (state: RowReorderState<Row>) => void,
  view?: TableRuntimeView<Row>
) {
  const props = applyTableFeatures({ features: feature ? [feature] : [] });
  return render(
    <FeatureProviders props={props}>
      <Chrome labels={labels} onState={onState} view={view} />
    </FeatureProviders>
  );
}

describe("rowReorder", () => {
  it("carries the handler and a provider on one feature object", () => {
    const handler = vi.fn();
    const feature = rowReorder<Row>(handler);
    expect(feature.id).toBe("row-reorder");
    expect(feature.provider).toBeDefined();
    // The handler travels on the feature so one stable component serves every
    // call of the factory.
    expect(feature).toMatchObject({ onRowReorder: handler });
  });

  it("publishes nothing when the feature is not composed", () => {
    mount(undefined);
    expect(screen.getByTestId("state")).toHaveTextContent("absent");
  });

  it("publishes reorder state when it is", () => {
    mount(rowReorder<Row>(vi.fn()));
    expect(screen.getByTestId("state")).toHaveTextContent("present");
  });

  // The same factory called twice must be the same component, or a rerender
  // would remount the provider and drop a drag in flight.
  it("uses one component for every call of the factory", () => {
    const first = rowReorder<Row>(vi.fn());
    const second = rowReorder<Row>(vi.fn());
    expect(first.provider?.Provider).toBe(second.provider?.Provider);
  });

  it("reads the rows the chrome published", () => {
    const handler = vi.fn();
    let state: RowReorderState<Row> | undefined;
    mount(rowReorder<Row>(handler), undefined, (next) => {
      state = next;
    });

    // A drop carries the dragged row, which the provider looks up through the
    // runtime rather than holding itself.
    const data = new Map<string, string>();
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    const start = state!.dragProps("a", 0);
    start.onDragStart({
      dataTransfer: transfer,
      preventDefault: () => undefined,
    } as never);
    const drop = state!.dropProps(2, ROWS[2]!, 0);
    drop.onDrop({
      dataTransfer: transfer,
      preventDefault: () => undefined,
    } as never);

    expect(handler).toHaveBeenCalledWith(0, 2, ROWS[0]);
  });

  it("reorders inside a group and moves across groups through distinct writes", () => {
    const reorder = vi.fn();
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const entries = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: [
        { key: "name", header: "Name", accessor: (row: Row) => row.name },
        { key: "team", header: "Team", accessor: (row: Row) => row.team },
      ] as ColumnDef<Row>[],
      getRowId: (row) => row.id,
      collapsedGroupIds: new Set<string>(),
    });
    mount(
      rowReorder<Row>(reorder, {
        movePolicy: "auto",
        onGroupMove: move,
      }),
      undefined,
      (next) => {
        state = next;
      },
      runtimeView({ grouping: { entries } })
    );

    act(() => {
      state!.moveBy(1, 1, ROWS[1]!, 0, ROWS.length);
    });
    expect(reorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[1]);

    const menu = state!.moveMenu(ROWS[0]!);
    expect(menu).toMatchObject({ kind: "group", label: "Move to group…" });
    expect(menu?.targets.map((target) => target.label)).toEqual(["B"]);
    act(() => {
      state!.selectMoveTarget(menu!.targets[0]!);
    });
    expect(move).toHaveBeenCalledOnce();
    expect(move.mock.calls[0]?.[0]).toBe(ROWS[0]);
    expect(move.mock.calls[0]?.[1]).toMatchObject({ label: "A" });
    expect(move.mock.calls[0]?.[2]).toMatchObject({ label: "B" });
  });

  it("rejects a cross-group move when the host did not wire onGroupMove", () => {
    const entries = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: [
        { key: "team", header: "Team", accessor: (row: Row) => row.team },
      ] as ColumnDef<Row>[],
      getRowId: (row) => row.id,
      collapsedGroupIds: new Set<string>(),
    });
    let state: RowReorderState<Row> | undefined;
    mount(
      rowReorder<Row>(vi.fn(), { movePolicy: "auto" }),
      { moveUnavailable: "no host move" },
      (next) => {
        state = next;
      },
      runtimeView({ grouping: { entries } })
    );
    act(() => state!.moveBy(0, 1, ROWS[0]!, 0, ROWS.length));
    expect(state!.announcement).toBe("no host move");
  });

  it("holds grouped moves for confirmation and rejects them under never policy", () => {
    const entries = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: [
        { key: "team", header: "Team", accessor: (row: Row) => row.team },
      ] as ColumnDef<Row>[],
      getRowId: (row) => row.id,
      collapsedGroupIds: new Set<string>(),
    });
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const mounted = mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "confirm",
        onGroupMove: move,
      }),
      { moveRejectedPolicyNever: "moves disabled" },
      (next) => {
        state = next;
      },
      runtimeView({ grouping: { entries } })
    );

    act(() => state!.moveBy(0, 1, ROWS[0]!, 0, ROWS.length));
    expect(state!.pendingMove).toMatchObject({ kind: "group" });
    expect(move).not.toHaveBeenCalled();
    act(() => state!.confirmMove());
    expect(move).toHaveBeenCalledOnce();

    mounted.unmount();
    move.mockClear();
    mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "never",
        onGroupMove: move,
      }),
      { moveRejectedPolicyNever: "moves disabled" },
      (next) => {
        state = next;
      },
      runtimeView({ grouping: { entries } })
    );
    act(() => state!.moveBy(0, 1, ROWS[0]!, 0, ROWS.length));
    expect(move).not.toHaveBeenCalled();
    expect(state!.announcement).toBe("moves disabled");
    expect(state!.moveMenu(ROWS[0]!)?.targets[0]?.disabledReason).toBe(
      "moves disabled"
    );
  });

  it("keeps a collapsed leaf group available as a move destination", () => {
    const entries = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: [
        { key: "team", header: "Team", accessor: (row: Row) => row.team },
      ] as ColumnDef<Row>[],
      getRowId: (row) => row.id,
      collapsedGroupIds: new Set(["group:team:s:B"]),
    });
    let state: RowReorderState<Row> | undefined;
    mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "auto",
        onGroupMove: vi.fn(),
      }),
      undefined,
      (next) => {
        state = next;
      },
      runtimeView({ grouping: { entries } })
    );

    expect(state!.moveMenu(ROWS[0]!)?.targets).toMatchObject([
      { label: "B", disabledReason: undefined },
    ]);
  });

  it("holds tree re-parenting for confirmation and rejects it under never policy", () => {
    const entries = buildTreeEntries({
      rows: ROWS,
      getRowId: (row) => row.id,
      getParentId: (row) => row.parentId,
      expandedIds: new Set(["a"]),
    });
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const mounted = mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "confirm",
        onTreeMove: move,
      }),
      { moveRejectedPolicyNever: "moves disabled" },
      (next) => {
        state = next;
      },
      runtimeView({ tree: { entries, allEntries: entries } })
    );

    act(() => state!.moveBy(2, -1, ROWS[2]!, 0, ROWS.length));
    expect(state!.pendingMove).toMatchObject({ kind: "tree" });
    expect(move).not.toHaveBeenCalled();
    act(() => state!.confirmMove());
    expect(move).toHaveBeenCalledOnce();

    mounted.unmount();
    move.mockClear();
    mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "never",
        onTreeMove: move,
      }),
      { moveRejectedPolicyNever: "moves disabled" },
      (next) => {
        state = next;
      },
      runtimeView({ tree: { entries, allEntries: entries } })
    );
    act(() => state!.moveBy(2, -1, ROWS[2]!, 0, ROWS.length));
    expect(move).not.toHaveBeenCalled();
    expect(state!.announcement).toBe("moves disabled");
    expect(
      state!.moveMenu(ROWS[2]!)?.targets.find((target) => target.id === "a")
        ?.disabledReason
    ).toBe("moves disabled");
  });

  it("rejects a tree cycle before the host callback", () => {
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const entries = buildTreeEntries({
      rows: ROWS,
      getRowId: (row) => row.id,
      getParentId: (row) => row.parentId,
      expandedIds: new Set(["a"]),
    });
    mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "auto",
        onTreeMove: move,
      }),
      { moveRejectedCycle: "cycle rejected" },
      (next) => {
        state = next;
      },
      runtimeView({ tree: { entries, allEntries: entries } })
    );

    act(() => {
      state!.moveBy(0, 1, ROWS[0]!, 0, ROWS.length);
    });
    expect(move).not.toHaveBeenCalled();
    expect(state!.announcement).toBe("cycle rejected");
  });

  it("re-parents a tree row through the pointer inside zone", () => {
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const entries = buildTreeEntries({
      rows: ROWS,
      getRowId: (row) => row.id,
      getParentId: (row) => row.parentId,
      expandedIds: new Set(["a"]),
    });
    mount(
      rowReorder<Row>(vi.fn(), {
        movePolicy: "auto",
        onTreeMove: move,
      }),
      undefined,
      (next) => {
        state = next;
      },
      runtimeView({ tree: { entries, allEntries: entries } })
    );
    const data = new Map<string, string>();
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };

    act(() => {
      state!.dragProps("c", 2).onDragStart({ dataTransfer: transfer } as never);
      state!.dropProps(0, ROWS[0]!, 0).onDrop({
        dataTransfer: transfer,
        clientY: 20,
        currentTarget: {
          getBoundingClientRect: () => ({ top: 0, height: 40 }),
        },
        preventDefault: vi.fn(),
      } as never);
    });

    expect(move).toHaveBeenCalledExactlyOnceWith(
      ROWS[2],
      expect.objectContaining({ id: null }),
      expect.objectContaining({ id: "a", row: ROWS[0] }),
      1
    );
  });

  it("rejects same-scope order writes while sorting owns visual order", () => {
    const reorder = vi.fn();
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const entries = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: [
        { key: "team", header: "Team", accessor: (row: Row) => row.team },
      ] as ColumnDef<Row>[],
      getRowId: (row) => row.id,
      collapsedGroupIds: new Set<string>(),
    });
    mount(
      rowReorder<Row>(reorder, {
        movePolicy: "auto",
        onGroupMove: move,
      }),
      { moveRejectedSorted: "sorted order" },
      (next) => {
        state = next;
      },
      runtimeView({ grouping: { entries }, sortBy: "name" })
    );

    act(() => {
      state!.moveBy(1, 1, ROWS[1]!, 0, ROWS.length);
    });
    expect(reorder).not.toHaveBeenCalled();
    expect(state!.announcement).toBe("sorted order");
    act(() => state!.selectMoveTarget(state!.moveMenu(ROWS[0]!)!.targets[0]!));
    expect(move).toHaveBeenCalledOnce();
  });

  it("keeps tree re-parenting available while sorted sibling reorder is rejected", () => {
    const reorder = vi.fn();
    const move = vi.fn();
    let state: RowReorderState<Row> | undefined;
    const entries = buildTreeEntries({
      rows: ROWS,
      getRowId: (row) => row.id,
      getParentId: (row) => row.parentId,
      expandedIds: new Set(["a"]),
    });
    mount(
      rowReorder<Row>(reorder, {
        movePolicy: "auto",
        onTreeMove: move,
      }),
      { moveRejectedSorted: "sorted order" },
      (next) => {
        state = next;
      },
      runtimeView({
        tree: { entries, allEntries: entries },
        sortBy: "name",
      })
    );
    const data = new Map<string, string>();
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };

    act(() => {
      state!.dragProps("c", 2).onDragStart({ dataTransfer: transfer } as never);
      state!.dropProps(0, ROWS[0]!, 0).onDrop({
        dataTransfer: transfer,
        clientY: 0,
        currentTarget: {
          getBoundingClientRect: () => ({ top: 0, height: 40 }),
        },
        preventDefault: vi.fn(),
      } as never);
    });
    expect(reorder).not.toHaveBeenCalled();
    expect(state!.announcement).toBe("sorted order");

    const underAda = state!
      .moveMenu(ROWS[2]!)!
      .targets.find((target) => target.id === "a");
    act(() => state!.selectMoveTarget(underAda!));
    expect(move).toHaveBeenCalledOnce();
  });

  it("speaks with the table's labels once they resolve", () => {
    mount(rowReorder<Row>(vi.fn()), {
      rowLifted: (position: number) => `picked up at ${String(position)}`,
    });
    fireEvent.keyDown(screen.getByTestId("row-a"), { key: " " });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "picked up at 1"
    );
  });

  // A provider mounts above the chrome, so on the very first paint there may be
  // no labels yet. It still has to be able to speak.
  it("falls back to English before the table has published labels", () => {
    mount(rowReorder<Row>(vi.fn()));
    fireEvent.keyDown(screen.getByTestId("row-a"), { key: " " });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Row lifted, position 1"
    );
  });

  it("falls back for a label the table did not provide", () => {
    mount(rowReorder<Row>(vi.fn()), { rowMoved: () => "moved" });
    fireEvent.keyDown(screen.getByTestId("row-a"), { key: " " });
    expect(screen.getByTestId("announcement")).toHaveTextContent(
      "Row lifted, position 1"
    );
  });

  it("moves a row with the keyboard and reports where it landed", () => {
    const handler = vi.fn();
    mount(rowReorder<Row>(handler), {
      rowMoved: (from: number, to: number) =>
        `${String(from)} became ${String(to)}`,
    });
    const row = screen.getByTestId("row-a");
    fireEvent.keyDown(row, { key: " " });
    expect(screen.getByTestId("lifted")).toHaveTextContent("a");
    fireEvent.keyDown(row, { key: "ArrowDown" });
    fireEvent.keyDown(row, { key: " " });
    expect(handler).toHaveBeenCalledWith(0, 1, ROWS[0]);
    expect(screen.getByTestId("announcement")).toHaveTextContent("1 became 2");
  });

  it("cancels a lift on Escape", () => {
    const handler = vi.fn();
    mount(rowReorder<Row>(handler), {
      rowReorderCancelled: "put back",
    });
    const row = screen.getByTestId("row-a");
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "Escape" });
    expect(handler).not.toHaveBeenCalled();
    expect(screen.getByTestId("announcement")).toHaveTextContent("put back");
  });
});
