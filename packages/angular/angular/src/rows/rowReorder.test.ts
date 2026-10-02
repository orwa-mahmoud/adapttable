/**
 * Row reorder state: what each gesture hands the host, and what the table
 * announces and marks while a row is moving.
 */
import { createMemoryAdapter, type RowReorderOptions } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectDataTable } from "../dataTable";
import { type AdaptTableFeature, featureOptionsOf } from "../featureHost";
import { grouping, injectGrouping } from "../features/grouping";
import { rowReorder } from "../features/rowReorder";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectRowReorder } from "./rowReorder";

interface Person {
  id: string;
  name: string;
  team: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", team: "A" },
  { id: "2", name: "Grace", team: "B" },
  { id: "3", name: "Linus", team: "A" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

const onRowReorder = vi.fn();
let options: RowReorderOptions<Person> | undefined;
let extra: readonly AdaptTableFeature[] = [];

@Component({ template: "" })
class Host {
  readonly features = [rowReorder(onRowReorder, options), ...extra];
  readonly source = injectFrontendData<Person>({
    data: signal(PEOPLE),
    columns: COLUMNS,
    getRowId: (row) => row.id,
  });
  readonly table = injectDataTable<Person>({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    features: this.features,
  });
  readonly grouping = injectGrouping<Person>({
    table: this.table,
    source: this.source,
    features: this.features,
  });
  readonly reorder = injectRowReorder<Person>({
    table: this.table,
    source: this.source,
    features: this.features,
    grouping: this.grouping,
  })!;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture.componentInstance;
}

function key(name: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: name, cancelable: true });
}

class FakeTransfer {
  private readonly data = new Map<string, string>();
  effectAllowed = "";
  dropEffect = "";
  get types(): string[] {
    return [...this.data.keys()];
  }
  setData(type: string, value: string): void {
    this.data.set(type, value);
  }
  getData(type: string): string {
    return this.data.get(type) ?? "";
  }
}

function drag(type: string, transfer: FakeTransfer | null): DragEvent {
  const event = new Event(type, { cancelable: true }) as DragEvent;
  Object.defineProperty(event, "dataTransfer", { value: transfer });
  return event;
}

beforeEach(() => {
  onRowReorder.mockReset();
  options = undefined;
  extra = [];
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
    ],
  });
});

describe("rowReorder feature", () => {
  it("registers under the row-reorder id and adds no table options", () => {
    const feature = rowReorder(vi.fn());
    expect(feature.id).toBe("row-reorder");
    expect(featureOptionsOf([feature])).toEqual({});
  });

  it("is absent from a table that does not compose it", async () => {
    const host = await mount();
    const absent = TestBed.runInInjectionContext(() =>
      injectRowReorder({
        table: host.table,
        source: host.source,
        features: [],
      })
    );
    expect(absent).toBeUndefined();
  });
});

describe("injectRowReorder", () => {
  it("lifts on Space, moves on an arrow, and drops on Space", async () => {
    const host = await mount();
    const lift = key(" ");
    host.reorder().handleKeyDown(lift, "1", 0, PEOPLE[0]!, 0, 3);
    expect(lift.defaultPrevented).toBe(true);
    expect(host.reorder().lifted).toEqual({ rowId: "1", from: 0 });
    expect(host.reorder().announcement).toBe("Row 1 lifted");
    expect(host.reorder().rowAttrs("1", 0)["data-dragging"]).toBe("");

    host.reorder().handleKeyDown(key("ArrowDown"), "1", 0, PEOPLE[0]!, 0, 3);
    expect(host.reorder().overIndex).toBe(1);
    host.reorder().handleKeyDown(key(" "), "1", 0, PEOPLE[0]!, 0, 3);

    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, PEOPLE[0]);
    expect(host.reorder().lifted).toBeNull();
    expect(host.reorder().announcement).toBe("Row moved from 1 to 2");
  });

  it("cancels a lift on Escape without writing", async () => {
    const host = await mount();
    host.reorder().handleKeyDown(key(" "), "2", 1, PEOPLE[1]!, 0, 3);
    host.reorder().handleKeyDown(key("Escape"), "2", 1, PEOPLE[1]!, 0, 3);
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(host.reorder().lifted).toBeNull();
    expect(host.reorder().announcement).toBe("Reorder cancelled");
  });

  it("drags a row and drops it on another", async () => {
    const host = await mount();
    const transfer = new FakeTransfer();
    host.reorder().dragProps("1", 0).onDragStart(drag("dragstart", transfer));
    expect(host.reorder().isLifted("1")).toBe(true);
    expect(transfer.effectAllowed).toBe("move");

    const over = drag("dragover", transfer);
    host.reorder().dropProps(2, PEOPLE[2]!, 0).onDragOver(over);
    expect(over.defaultPrevented).toBe(true);
    expect(host.reorder().overIndex).toBe(2);
    expect(host.reorder().rowAttrs("3", 2)["data-drop"]).toBe("after");

    host.reorder().dropProps(2, PEOPLE[2]!, 0).onDrop(drag("drop", transfer));
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 2, PEOPLE[0]);
    host.reorder().dragProps("1", 0).onDragEnd();
    expect(host.reorder().lifted).toBeNull();
  });

  it("ignores a drop that carries no row", async () => {
    const host = await mount();
    host.reorder().dropProps(1, PEOPLE[1]!, 0).onDrop(drag("drop", null));
    expect(onRowReorder).not.toHaveBeenCalled();
  });

  it("swaps a card with its neighbour, and not past the edge", async () => {
    const host = await mount();
    host.reorder().moveBy(1, -1, PEOPLE[1]!, 0, 3);
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(1, 0, PEOPLE[1]);
    host.reorder().moveBy(0, -1, PEOPLE[0]!, 0, 3);
    expect(onRowReorder).toHaveBeenCalledOnce();
  });

  it("offers the other groups and moves a row there through the host", async () => {
    const onGroupMove = vi.fn();
    options = { movePolicy: "auto", onGroupMove };
    extra = [grouping("team")];
    const host = await mount();
    const menu = host.reorder().moveMenu(PEOPLE[0]!)!;
    expect(menu.kind).toBe("group");
    expect(menu.label).toBe("Move to group…");
    const toB = menu.targets.find((target) => target.label === "B")!;

    host.reorder().selectMoveTarget(toB);
    expect(onGroupMove).toHaveBeenCalledOnce();
    const [row, from, to] = onGroupMove.mock.calls[0]!;
    expect(row).toBe(PEOPLE[0]);
    expect(from.label).toBe("A");
    expect(to.label).toBe("B");
    expect(to.levels).toEqual([{ key: "team", value: "B", label: "B" }]);
    expect(host.reorder().announcement).toBe("Row moved to B");
  });

  it("holds a confirm-policy move for the confirmation, then moves or drops it", async () => {
    const onGroupMove = vi.fn();
    options = { movePolicy: "confirm", onGroupMove };
    extra = [grouping("team")];
    const host = await mount();
    const toB = host
      .reorder()
      .moveMenu(PEOPLE[0]!)!
      .targets.find((target) => target.label === "B")!;

    host.reorder().selectMoveTarget(toB);
    expect(host.reorder().pendingMove).toEqual(toB.request);
    expect(host.reorder().isMovePending?.(PEOPLE[0]!)).toBe(true);
    expect(onGroupMove).not.toHaveBeenCalled();
    host.reorder().confirmMove();
    expect(onGroupMove).toHaveBeenCalledOnce();
    expect(onGroupMove.mock.calls[0]![0]).toBe(PEOPLE[0]);
    expect(onGroupMove.mock.calls[0]![2].label).toBe("B");
    expect(host.reorder().pendingMove).toBeNull();

    host.reorder().selectMoveTarget(toB);
    host.reorder().cancelMove();
    expect(host.reorder().pendingMove).toBeNull();
    expect(onGroupMove).toHaveBeenCalledOnce();
  });
});
