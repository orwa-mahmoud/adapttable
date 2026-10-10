import { describe, expect, it, type Mock, vi } from "vitest";

import { aggregate } from "../aggregate/aggregate";
import type { ColumnMetadata } from "../columnModel";
import type { TableRuntime, TableRuntimeView } from "../features/tableRuntime";
import type { GroupAggregateOverrides } from "./groupAggregateOverrides";
import { deferGroupingDropToInner } from "./groupingPanelChromeModel";
import {
  createGroupingPanelController,
  type GroupingDragEventLike,
  type GroupingKeyEventLike,
} from "./groupingPanelController";
import { GROUPING_COLUMN_DND_MIME } from "./groupingPanelModel";

interface HarnessOptions {
  groupBy?: string;
  overrides?: GroupAggregateOverrides;
  columns?: ColumnMetadata<unknown>[];
  labels?: Record<string, unknown>;
  liveGroupBy?: readonly string[];
  sourceGrouping?: "client" | "server";
  aggregateOperations?: readonly string[];
  withInitialize?: boolean;
  readOnlyAggregates?: boolean;
  noGroupingState?: boolean;
}

const COLUMNS: ColumnMetadata<unknown>[] = [
  { key: "team", header: "Team" },
  { key: "status", header: "Status" },
  { key: "budget", header: "Budget", aggregatable: true, filter: "number" },
  {
    key: "score",
    header: "Score",
    aggregatable: {
      default: "median",
      operations: [
        "sum",
        { id: "median", label: "Median", calculate: () => 0 },
      ],
    },
  },
];

function harness(options: HarnessOptions = {}) {
  const state = {
    groupBy: options.groupBy,
    overrides: options.overrides ?? {},
  };
  const setGroupBy = vi.fn((key: string | undefined) => {
    state.groupBy = key;
  });
  const setAggregateOverrides = vi.fn((next: GroupAggregateOverrides) => {
    state.overrides = next;
  });
  const initializeGroupBy = vi.fn((key: string) => {
    state.groupBy ??= key;
  });
  const runtime: TableRuntime = {
    rowAt: () => undefined,
    labels: () => options.labels,
    featureIds: () => [],
    view: () =>
      ({
        rows: [],
        getRowId: () => "",
        rowLabel: () => "",
        grouping: options.liveGroupBy
          ? { groupBy: options.liveGroupBy }
          : undefined,
        sourceCapabilities: options.sourceGrouping
          ? { grouping: options.sourceGrouping }
          : undefined,
        groupingState: options.noGroupingState
          ? undefined
          : {
              groupBy: state.groupBy,
              aggregateOverrides: state.overrides,
              columnLabel: (key: string) =>
                COLUMNS.find((column) => column.key === key)?.header ?? key,
              columns: options.columns ?? COLUMNS,
              aggregateOperations: options.aggregateOperations,
              setGroupBy,
              initializeGroupBy: options.withInitialize
                ? initializeGroupBy
                : undefined,
              setAggregateOverrides: options.readOnlyAggregates
                ? undefined
                : setAggregateOverrides,
            },
      }) as unknown as TableRuntimeView,
  };
  const controller = createGroupingPanelController({ runtime });
  return {
    controller,
    state,
    setGroupBy,
    setAggregateOverrides,
    initializeGroupBy,
  };
}

function transfer(key?: string) {
  const data = new Map<string, string>();
  if (key !== undefined) data.set(GROUPING_COLUMN_DND_MIME, key);
  return {
    get types() {
      return [...data.keys()];
    },
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
    effectAllowed: "none",
    dropEffect: "none",
  } as unknown as DataTransfer;
}

function dragEvent(
  key?: string,
  extra: Partial<GroupingDragEventLike> = {}
): GroupingDragEventLike & { preventDefault: Mock<() => void> } {
  return {
    dataTransfer: transfer(key),
    target: null,
    currentTarget: null,
    preventDefault: vi.fn<() => void>(),
    ...extra,
  } as GroupingDragEventLike & { preventDefault: Mock<() => void> };
}

function keyEvent(
  key: string,
  currentTarget: EventTarget | null = null
): GroupingKeyEventLike & { preventDefault: Mock<() => void> } {
  return { key, currentTarget, preventDefault: vi.fn<() => void>() };
}

describe("grouping panel controller: keys", () => {
  it("adds, removes and moves fields, announcing each", () => {
    const { controller, state } = harness({ groupBy: "team" });
    const listener = vi.fn();
    const stop = controller.subscribe(listener);

    controller.add("status");
    expect(state.groupBy).toBe("team,status");
    expect(controller.getSnapshot().announcement).toBe(
      "Status added to grouping"
    );

    controller.add("status");
    controller.add("");
    expect(state.groupBy).toBe("team,status");

    controller.moveBy("status", -1);
    expect(state.groupBy).toBe("status,team");
    expect(controller.getSnapshot().announcement).toBe(
      "Status moved to grouping position 1"
    );
    controller.moveBy("status", -1);
    expect(state.groupBy).toBe("status,team");

    controller.remove("team");
    expect(state.groupBy).toBe("status");
    expect(controller.getSnapshot().announcement).toBe(
      "Team removed from grouping"
    );
    controller.remove("team");
    expect(state.groupBy).toBe("status");

    stop();
    controller.add("team");
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("reads the live grouping first and localizes announcements", () => {
    const { controller, state } = harness({
      groupBy: "ignored",
      liveGroupBy: ["team"],
      labels: {
        groupingAdded: (name: string) => `+${name}`,
        moveGroupingColumn: (name: string) => `drag ${name}`,
      },
    });
    controller.add("budget");
    expect(state.groupBy).toBe("team,budget");
    expect(controller.getSnapshot().announcement).toBe("+Budget");
    expect(controller.chipLabel("Team")).toBe("drag Team");
  });

  it("does nothing without a grouping state", () => {
    const { controller } = harness({ noGroupingState: true });
    controller.add("team");
    expect(controller.getSnapshot().announcement).toBe(
      "team added to grouping"
    );
    controller.initialize("team");
    controller.setAggregate("budget", "sum");
    controller.addAggregate("budget");
    controller.removeAggregate("budget");
    controller.restoreAggregateDefaults();
    controller.reconcile();
    expect(controller.reconcileKey()).toBe("||");
  });

  it("seeds the initial grouping once, through the initializer when there is one", () => {
    const seeded = harness({ withInitialize: true });
    seeded.controller.initialize(["team", "status"]);
    seeded.controller.initialize("budget");
    expect(seeded.initializeGroupBy).toHaveBeenCalledTimes(1);
    expect(seeded.state.groupBy).toBe("team,status");

    const plain = harness();
    plain.controller.initialize("team");
    expect(plain.setGroupBy).toHaveBeenCalledWith("team");

    const kept = harness({ groupBy: "status" });
    kept.controller.initialize("team");
    expect(kept.setGroupBy).not.toHaveBeenCalled();

    const empty = harness();
    empty.controller.initialize();
    expect(empty.setGroupBy).not.toHaveBeenCalled();
  });
});

describe("grouping panel controller: drag", () => {
  it("starts a drag with the native payload and marks the dragged element", () => {
    const { controller } = harness({ groupBy: "team" });
    const event = dragEvent();
    controller.startDrag("status", "header", event);
    expect(event.dataTransfer?.getData(GROUPING_COLUMN_DND_MIME)).toBe(
      "status"
    );
    expect(event.dataTransfer?.getData("text/plain")).toBe("status");
    expect(event.dataTransfer?.effectAllowed).toBe("move");
    expect(controller.getSnapshot().drag).toEqual({
      key: "status",
      source: "header",
    });
    const ui = controller.interactions(controller.getSnapshot(), undefined);
    expect(ui.headerDragProps("status")["data-grouping-dragging"]).toBe(true);
    expect(
      ui.chipDragProps("status")["data-grouping-dragging"]
    ).toBeUndefined();
    expect(
      ui.headerDragProps("team")["data-grouping-dragging"]
    ).toBeUndefined();

    controller.startDrag(
      "team",
      "chip",
      dragEvent(undefined, { dataTransfer: null })
    );
    expect(controller.getSnapshot().drag).toEqual({
      key: "team",
      source: "chip",
    });
    controller.finishDrag();
    expect(controller.getSnapshot().drag).toBeUndefined();
  });

  it("refuses a header drag that starts inside a field or a link", () => {
    const { controller } = harness();
    const header = document.createElement("th");
    const input = document.createElement("input");
    const button = document.createElement("button");
    header.append(input, button);

    const fromInput = dragEvent(undefined, {
      target: input,
      currentTarget: header,
    });
    controller.startDrag("team", "header", fromInput);
    expect(fromInput.preventDefault).toHaveBeenCalled();
    expect(controller.getSnapshot().drag).toBeUndefined();

    controller.startDrag(
      "team",
      "header",
      dragEvent(undefined, { target: button, currentTarget: header })
    );
    expect(controller.getSnapshot().drag?.key).toBe("team");

    controller.startDrag(
      "team",
      "chip",
      dragEvent(undefined, { target: input, currentTarget: header })
    );
    expect(controller.getSnapshot().drag?.source).toBe("chip");

    controller.startDrag(
      "status",
      "header",
      dragEvent(undefined, { target: header, currentTarget: header })
    );
    expect(controller.getSnapshot().drag?.key).toBe("status");
  });

  it("tracks the hovered boundary and ignores foreign drags", () => {
    const { controller } = harness({ groupBy: "team" });
    controller.dragEnter(0, dragEvent("status"));
    expect(controller.getSnapshot().drag).toBeUndefined();

    controller.startDrag("status", "header", dragEvent());
    controller.dragEnter(1, dragEvent());
    expect(controller.getSnapshot().drag?.overIndex).toBeUndefined();
    controller.dragEnter(1, dragEvent("status"));
    expect(controller.getSnapshot().drag).toMatchObject({
      overIndex: 1,
      overRemove: false,
    });

    const over = dragEvent("status");
    controller.dragOver(0, over);
    expect(over.preventDefault).toHaveBeenCalled();
    expect(over.dataTransfer?.dropEffect).toBe("move");
    expect(controller.getSnapshot().drag?.overIndex).toBe(0);
    const ui = controller.interactions(controller.getSnapshot(), undefined);
    expect(ui.dropProps(0)["data-drop-active"]).toBe(true);
    expect(ui.dropProps(1)["data-drop-active"]).toBeUndefined();

    const foreign = dragEvent();
    controller.dragOver(1, foreign);
    expect(foreign.preventDefault).not.toHaveBeenCalled();

    const payloadOnly = dragEvent("status", { dataTransfer: null });
    controller.dragOver(1, payloadOnly);
    expect(payloadOnly.preventDefault).not.toHaveBeenCalled();
  });

  it("drops a new field at a boundary and moves an existing one", () => {
    const { controller, state } = harness({ groupBy: "team,status" });
    controller.startDrag("budget", "header", dragEvent());
    controller.drop(0, dragEvent("budget"));
    expect(state.groupBy).toBe("budget,team,status");
    expect(controller.getSnapshot().announcement).toBe(
      "Budget added to grouping"
    );
    expect(controller.getSnapshot().drag).toBeUndefined();

    controller.startDrag("status", "chip", dragEvent());
    const payload = transfer();
    payload.setData(GROUPING_COLUMN_DND_MIME, "");
    controller.drop(0, dragEvent(undefined, { dataTransfer: payload }));
    expect(state.groupBy).toBe("status,budget,team");
    expect(controller.getSnapshot().announcement).toBe(
      "Status moved to grouping position 1"
    );
  });

  it("ignores a drop without the payload or a known key", () => {
    const { controller, state } = harness({ groupBy: "team" });
    const foreign = dragEvent();
    controller.drop(0, foreign);
    expect(foreign.preventDefault).not.toHaveBeenCalled();

    const payload = transfer();
    payload.setData(GROUPING_COLUMN_DND_MIME, "");
    const nothing = dragEvent(undefined, { dataTransfer: payload });
    controller.drop(0, nothing);
    expect(nothing.preventDefault).toHaveBeenCalled();
    expect(state.groupBy).toBe("team");
  });

  it("ungroups a chip dropped on the remove target, and only a chip", () => {
    const { controller, state } = harness({ groupBy: "team,status" });
    controller.removeDragEnter(dragEvent("team"));
    controller.removeDragOver(dragEvent("team"));
    controller.removeDrop(dragEvent("team"));
    expect(state.groupBy).toBe("team,status");

    controller.startDrag("budget", "header", dragEvent());
    controller.removeDragEnter(dragEvent("budget"));
    expect(controller.getSnapshot().drag?.overRemove).toBeUndefined();

    controller.startDrag("team", "chip", dragEvent());
    controller.removeDragEnter(dragEvent());
    expect(controller.getSnapshot().drag?.overRemove).toBeUndefined();
    controller.removeDragEnter(dragEvent("team"));
    expect(controller.getSnapshot().drag).toMatchObject({
      overIndex: undefined,
      overRemove: true,
    });
    const ui = controller.interactions(controller.getSnapshot(), undefined);
    expect(ui.removeDropProps()["data-drop-active"]).toBe(true);
    expect(ui.dropProps(0)["data-drop-active"]).toBeUndefined();

    const over = dragEvent("team");
    controller.removeDragOver(over);
    expect(over.preventDefault).toHaveBeenCalled();
    expect(over.dataTransfer?.dropEffect).toBe("move");
    controller.removeDragOver(dragEvent("team", { dataTransfer: null }));

    const payload = transfer();
    payload.setData(GROUPING_COLUMN_DND_MIME, "");
    controller.removeDrop(dragEvent(undefined, { dataTransfer: payload }));
    expect(state.groupBy).toBe("status");
    expect(controller.getSnapshot().drag).toBeUndefined();
    expect(controller.getSnapshot().announcement).toBe(
      "Team removed from grouping"
    );
  });

  it("consumes a bubbling chip dragenter before ancestor grouping boundaries", () => {
    const { controller } = harness({ groupBy: "team,status" });
    controller.startDrag("team", "chip", dragEvent());
    controller.dragEnter(2, dragEvent("team"));
    const boundary = document.createElement("div");
    const removeTarget = document.createElement("div");
    boundary.append(removeTarget);
    const ancestorEnter = vi.fn((event: DragEvent) =>
      controller.dragEnter(2, event)
    );
    const ancestor = deferGroupingDropToInner({
      onDragEnter: ancestorEnter,
    });
    const observedAtAncestor = vi.fn();
    removeTarget.addEventListener("dragenter", (event) => {
      controller.removeDragEnter(event);
    });
    boundary.addEventListener("dragenter", (event) => {
      observedAtAncestor(event.defaultPrevented);
      ancestor.onDragEnter?.(event);
    });
    const event = new Event("dragenter", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: transfer("team") });

    expect(removeTarget.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(observedAtAncestor).toHaveBeenCalledWith(true);
    expect(ancestorEnter).not.toHaveBeenCalled();
    expect(controller.getSnapshot().drag).toEqual({
      key: "team",
      source: "chip",
      overIndex: undefined,
      overRemove: true,
    });
  });

  it.each([
    { name: "no active drag", source: undefined, payload: "team" },
    { name: "a header drag", source: "header", payload: "team" },
    { name: "a foreign payload", source: "chip", payload: undefined },
    { name: "no data transfer", source: "chip", payload: null },
  ] as const)(
    "leaves $name unconsumed when entering remove",
    ({ source, payload }) => {
      const { controller } = harness({ groupBy: "team,status" });
      if (source) controller.startDrag("team", source, dragEvent());
      const boundary = document.createElement("div");
      const removeTarget = document.createElement("div");
      boundary.append(removeTarget);
      const ancestorEnter = vi.fn((event: DragEvent) =>
        controller.dragEnter(2, event)
      );
      const ancestor = deferGroupingDropToInner({ onDragEnter: ancestorEnter });
      removeTarget.addEventListener("dragenter", (event) => {
        controller.removeDragEnter(event);
      });
      boundary.addEventListener("dragenter", (event) => {
        ancestor.onDragEnter?.(event);
      });
      const event = new Event("dragenter", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: payload === null ? null : transfer(payload),
      });

      expect(removeTarget.dispatchEvent(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(ancestorEnter).toHaveBeenCalledWith(event);
      expect(controller.getSnapshot().drag?.overRemove).not.toBe(true);
    }
  );

  it("routes the prop getters to the same transitions", () => {
    const { controller, state } = harness({ groupBy: "team" });
    const ui = controller.interactions(controller.getSnapshot(), undefined);
    ui.headerDragProps("status").onDragStart?.(dragEvent() as never);
    const live = controller.interactions(controller.getSnapshot(), undefined);
    const drop = live.dropProps(0);
    drop.onDragEnter?.(dragEvent("status") as never);
    drop.onDragOver?.(dragEvent("status") as never);
    expect(drop.onDragLeave?.(dragEvent() as never)).toBeUndefined();
    drop.onDrop?.(dragEvent("status") as never);
    expect(state.groupBy).toBe("status,team");

    ui.chipDragProps("team").onDragStart?.(dragEvent() as never);
    const removal = controller
      .interactions(controller.getSnapshot(), undefined)
      .removeDropProps();
    expect(removal.onDragLeave?.(dragEvent() as never)).toBeUndefined();
    removal.onDrop?.(dragEvent("team") as never);
    expect(state.groupBy).toBe("status");
    ui.chipDragProps("status").onDragEnd?.(dragEvent() as never);
    expect(controller.getSnapshot().drag).toBeUndefined();
  });

  it("keeps one interactions object per snapshot and declaration", () => {
    const { controller } = harness();
    const snapshot = controller.getSnapshot();
    const first = controller.interactions(snapshot, undefined);
    expect(controller.interactions(snapshot, undefined)).toBe(first);
    const declared = { budget: "sum" as const };
    const withDeclared = controller.interactions(snapshot, declared);
    expect(withDeclared).not.toBe(first);
    expect(withDeclared.declaredAggregates).toBe(declared);
    controller.startDrag("team", "chip", dragEvent());
    expect(
      controller.interactions(controller.getSnapshot(), declared)
    ).not.toBe(withDeclared);
  });
});

describe("grouping panel controller: chip keys", () => {
  it("moves a chip with the arrows, flipping left and right under RTL", () => {
    const { controller, state } = harness({ groupBy: "team,status,budget" });
    const ltr = document.createElement("span");
    const rtlRoot = document.createElement("div");
    rtlRoot.setAttribute("dir", "rtl");
    const rtl = document.createElement("span");
    rtlRoot.append(rtl);

    const up = keyEvent("ArrowUp");
    controller.chipKeyDown("status", up);
    expect(up.preventDefault).toHaveBeenCalled();
    expect(state.groupBy).toBe("status,team,budget");
    controller.chipKeyDown("status", keyEvent("ArrowDown"));
    expect(state.groupBy).toBe("team,status,budget");
    controller.chipKeyDown("status", keyEvent("ArrowRight", ltr));
    expect(state.groupBy).toBe("team,budget,status");
    controller.chipKeyDown("status", keyEvent("ArrowLeft", ltr));
    expect(state.groupBy).toBe("team,status,budget");
    controller.chipKeyDown("status", keyEvent("ArrowLeft", rtl));
    expect(state.groupBy).toBe("team,budget,status");
    controller.chipKeyDown("status", keyEvent("ArrowRight", rtl));
    expect(state.groupBy).toBe("team,status,budget");

    const other = keyEvent("Enter");
    controller.chipKeyDown("status", other);
    expect(other.preventDefault).not.toHaveBeenCalled();

    const props = controller
      .interactions(controller.getSnapshot(), undefined)
      .chipKeyboardProps("team", "Team");
    expect(props).toMatchObject({
      tabIndex: 0,
      role: "button",
      "aria-label": "Move Team grouping",
    });
    props.onKeyDown(keyEvent("ArrowDown") as never);
    expect(state.groupBy).toBe("status,team,budget");
  });
});

describe("grouping panel controller: aggregates", () => {
  it("gates overrides on what the column offers", () => {
    const { controller, state, setAggregateOverrides } = harness();
    controller.setAggregate("budget", "sum");
    expect(state.overrides).toEqual({ budget: "sum" });
    controller.setAggregate("budget", "median");
    expect(state.overrides).toEqual({ budget: "sum" });
    controller.setAggregate("budget", "none");
    expect(state.overrides).toEqual({ budget: "none" });
    controller.setAggregate("team", "none");
    controller.setAggregate("team", "sum");
    expect(state.overrides).toEqual({ budget: "none" });
    // A column the runtime does not know yet stays writable.
    controller.setAggregate("later", "sum");
    expect(state.overrides).toEqual({ budget: "none", later: "sum" });
    controller.setAggregate("budget", undefined);
    expect(state.overrides).toEqual({ later: "sum" });
    expect(setAggregateOverrides).toHaveBeenCalledTimes(4);
  });

  it("changes an operation and announces it with its label", () => {
    const { controller, state } = harness({
      labels: { groupingAverage: "Moyenne" },
    });
    controller.setAggregateOperation("budget", "avg");
    expect(state.overrides).toEqual({ budget: "avg" });
    expect(controller.getSnapshot().announcement).toBe(
      "Budget group aggregation changed to Moyenne"
    );
    controller.setAggregateOperation("budget", "max");
    expect(controller.getSnapshot().announcement).toBe(
      "Budget group aggregation changed to Maximum"
    );
    controller.setAggregateOperation("score", "median");
    expect(controller.getSnapshot().announcement).toBe(
      "Score group aggregation changed to Median"
    );
    controller.setAggregateOperation("budget", "median");
    controller.setAggregateOperation("team", "sum");
    controller.setAggregateOperation("missing", "sum");
    expect(state.overrides).toEqual({ budget: "max", score: "median" });
  });

  it("adds an aggregation with its opening operation", () => {
    const { controller, state } = harness({
      labels: {
        groupingAggregateChanged: (name: string, op: string) => `${name}=${op}`,
      },
    });
    controller.addAggregate("score");
    expect(state.overrides).toEqual({ score: "median" });
    expect(controller.getSnapshot().announcement).toBe("Score=Median");
    controller.addAggregate("budget");
    expect(state.overrides).toEqual({ score: "median", budget: "sum" });
    controller.addAggregate("team");
    controller.addAggregate("missing");
    expect(Object.keys(state.overrides)).toEqual(["score", "budget"]);
  });

  it("records removing a declared aggregation and drops a reader's own", () => {
    const state: { groupBy?: string; overrides: GroupAggregateOverrides } = {
      overrides: { team: "count" },
    };
    const controller = createGroupingPanelController({
      runtime: harnessRuntime(state),
    });
    controller.configure({
      runtime: harnessRuntime(state),
      groupAggregates: aggregate({ budget: "sum" }),
    });
    controller.removeAggregate("budget");
    expect(state.overrides).toEqual({ team: "count", budget: "none" });
    expect(controller.getSnapshot().announcement).toBe(
      "Budget aggregate removed"
    );
    // A column default is the developer's declaration too.
    controller.removeAggregate("score");
    expect(state.overrides).toEqual({
      team: "count",
      budget: "none",
      score: "none",
    });
    controller.removeAggregate("team");
    expect(state.overrides).toEqual({ budget: "none", score: "none" });
    controller.removeAggregate("missing");
    expect(state.overrides).toEqual({ budget: "none", score: "none" });
  });

  it("restores the declared setup and announces it", () => {
    const { controller, state } = harness({ overrides: { budget: "max" } });
    controller.restoreAggregateDefaults();
    expect(state.overrides).toEqual({});
    expect(controller.getSnapshot().announcement).toBe(
      "Aggregations restored to defaults"
    );
  });

  it("refuses every aggregate write when the source cannot take one", () => {
    const { controller, setAggregateOverrides } = harness({
      readOnlyAggregates: true,
    });
    controller.setAggregate("budget", "sum");
    controller.addAggregate("budget");
    controller.removeAggregate("budget");
    controller.restoreAggregateDefaults();
    controller.reconcile();
    expect(setAggregateOverrides).not.toHaveBeenCalled();
    expect(controller.getSnapshot().announcement).toBe("");
    // The operation gate passes, so the choice is still spoken — the source
    // simply does not store it.
    controller.setAggregateOperation("budget", "sum");
    expect(setAggregateOverrides).not.toHaveBeenCalled();
    expect(controller.getSnapshot().announcement).toBe(
      "Budget group aggregation changed to Sum"
    );
  });

  it("reconciles choices a column no longer allows, and keys on its inputs", () => {
    const { controller, state, setAggregateOverrides } = harness({
      overrides: { budget: "sum", gone: "sum" },
      sourceGrouping: "server",
      aggregateOperations: ["sum", "count"],
    });
    expect(controller.reconcileKey()).toContain("budget:sum,gone:sum|");
    expect(controller.reconcileKey()).toContain("|sum/count");
    controller.reconcile();
    expect(state.overrides).toEqual({ budget: "sum" });
    controller.reconcile();
    expect(setAggregateOverrides).toHaveBeenCalledTimes(1);
  });

  it("gates server operations on what the backend lists", () => {
    const listed = harness({
      sourceGrouping: "server",
      aggregateOperations: ["count"],
    });
    listed.controller.setAggregateOperation("budget", "sum");
    expect(listed.state.overrides).toEqual({});
    listed.controller.setAggregateOperation("budget", "count");
    expect(listed.state.overrides).toEqual({ budget: "count" });

    const unknown = harness({ sourceGrouping: "client" });
    unknown.controller.setAggregateOperation("budget", "sum");
    expect(unknown.state.overrides).toEqual({ budget: "sum" });
  });
});

function harnessRuntime(state: {
  groupBy?: string;
  overrides: GroupAggregateOverrides;
}): TableRuntime {
  return {
    rowAt: () => undefined,
    labels: () => undefined,
    featureIds: () => [],
    view: () =>
      ({
        rows: [],
        getRowId: () => "",
        rowLabel: () => "",
        groupingState: {
          groupBy: state.groupBy,
          aggregateOverrides: state.overrides,
          columnLabel: (key: string) =>
            COLUMNS.find((column) => column.key === key)?.header ?? key,
          columns: COLUMNS,
          setGroupBy: (key: string | undefined) => {
            state.groupBy = key;
          },
          setAggregateOverrides: (next: GroupAggregateOverrides) => {
            state.overrides = next;
          },
        },
      }) as unknown as TableRuntimeView,
  };
}
