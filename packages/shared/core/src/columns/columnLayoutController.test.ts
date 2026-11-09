import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../contracts/columns";
import {
  columnLayoutVisibleColumns,
  columnPinInsets,
  createColumnLayoutController,
} from "./columnLayoutController";
import type { ColumnLayoutState } from "./columnLayoutModel";
import { type ColumnGroupRecord, flattenColumnTree } from "./columnTree";

interface Row {
  a: number;
}
type Col = ColumnMetadata<Row>;

const cols = (...keys: string[]): Col[] =>
  keys.map((key) => ({ key, header: key.toUpperCase() }));

const renameable = (key: string, header: string): Col => ({
  key,
  header,
  renameable: true,
});

function setup(columns: Col[], extra: { onColumnRename?: () => void } = {}) {
  const controller = createColumnLayoutController<Row>();
  controller.configure({ columns, ...extra });
  return controller;
}

describe("createColumnLayoutController", () => {
  it("hides, shows and toggles a column, skipping a no-op", () => {
    const controller = setup(cols("a", "b"));
    const listener = vi.fn();
    controller.store.subscribe(listener);
    controller.setHidden("a", true);
    expect(controller.store.getSnapshot().hidden).toEqual(["a"]);
    controller.setHidden("a", true);
    expect(listener).toHaveBeenCalledTimes(1);
    controller.toggleVisible("a");
    expect(controller.store.getSnapshot().hidden).toEqual([]);
    controller.toggleVisible("b");
    expect(controller.store.getSnapshot().hidden).toEqual(["b"]);
  });

  it("pins and sizes columns", () => {
    const controller = setup(cols("a"));
    controller.setPinned("a", "start");
    controller.setWidth("a", 90);
    expect(controller.store.getSnapshot().pinned).toEqual({ a: "start" });
    expect(controller.store.getSnapshot().widths).toEqual({ a: 90 });
  });

  it("starts from a default layout", () => {
    const controller = createColumnLayoutController<Row>({ hidden: ["b"] });
    expect(controller.store.getSnapshot().hidden).toEqual(["b"]);
  });

  it("moves a column and replaces the order, refusing bad orders", () => {
    const controller = setup(cols("a", "b", "c"));
    controller.move("c", 0);
    expect(controller.store.getSnapshot().order).toEqual(["c", "a", "b"]);
    controller.move("missing", 0);
    controller.move("c", 0);
    expect(controller.store.getSnapshot().order).toEqual(["c", "a", "b"]);
    controller.setOrder(["b", "c", "a"]);
    expect(controller.store.getSnapshot().order).toEqual(["b", "c", "a"]);
    controller.setOrder(["b", "c"]);
    expect(controller.store.getSnapshot().order).toEqual(["b", "c", "a"]);
  });

  it("keeps a married column group together", () => {
    const controller = createColumnLayoutController<Row>();
    const group: ColumnGroupRecord<Row> = {
      id: "g",
      label: "G",
      childKeys: ["a", "b"],
      marryChildren: true,
    };
    controller.configure({
      columns: cols("a", "b", "c"),
      columnGroups: new Map([["g", group]]),
    });
    controller.move("a", 2);
    expect(controller.store.getSnapshot().order).toEqual([]);
    controller.setOrder(["a", "c", "b"]);
    expect(controller.store.getSnapshot().order).toEqual([]);
    controller.move("c", 0);
    expect(controller.store.getSnapshot().order).toEqual(["c", "a", "b"]);
  });

  it("toggles a column group only while collapse is armed", () => {
    const controller = setup(cols("a"));
    controller.toggleColumnGroup("g");
    expect(controller.store.getSnapshot().collapsedGroups).toBeUndefined();
    controller.configure({ columns: cols("a"), collapsibleColumnGroups: true });
    controller.toggleColumnGroup("g");
    expect(controller.store.getSnapshot().collapsedGroups).toEqual(["g"]);
    controller.toggleColumnGroup("g");
    expect(controller.store.getSnapshot().collapsedGroups).toBeUndefined();
  });

  it("composes two mutations while controlled", () => {
    const controller = createColumnLayoutController<Row>();
    const onChange = vi.fn();
    const value: ColumnLayoutState = {
      hidden: [],
      order: [],
      pinned: {},
      widths: {},
    };
    controller.store.control({ value, onChange });
    controller.configure({ columns: cols("a", "b") });
    controller.setHidden("a", true);
    controller.setWidth("b", 50);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ hidden: ["a"], widths: { b: 50 } })
    );
  });

  describe("renames", () => {
    it("needs a renameable column, the host callback and a name", () => {
      const onColumnRename = vi.fn();
      const plain = setup(cols("a"), { onColumnRename });
      plain.setName("a", "X");
      const off = setup([renameable("a", "A")]);
      off.setName("a", "X");
      const on = setup([renameable("a", "A")], { onColumnRename });
      on.setName("a", "   ");
      on.setName("missing", "X");
      expect(onColumnRename).not.toHaveBeenCalled();
      on.setName("a", "  X ");
      expect(on.store.getSnapshot().names).toEqual({ a: "X" });
      expect(onColumnRename).toHaveBeenCalledWith("a", "X");
      on.setName("a", "X");
      expect(onColumnRename).toHaveBeenCalledTimes(1);
    });

    it("clears the override when the name typed is the declared one", () => {
      const onColumnRename = vi.fn();
      const controller = setup([renameable("a", "A"), renameable("b", "B")], {
        onColumnRename,
      });
      controller.setName("a", "X");
      controller.setName("b", "Y");
      controller.setName("a", "A");
      expect(controller.store.getSnapshot().names).toEqual({ b: "Y" });
      controller.setName("b", "B");
      expect(controller.store.getSnapshot().names).toBeUndefined();
    });

    it("resets one name to the declaration before the host's echo", () => {
      const onColumnRename = vi.fn();
      const controller = setup([renameable("a", "A")], { onColumnRename });
      controller.resetName("a");
      expect(onColumnRename).not.toHaveBeenCalled();
      controller.setName("a", "X");
      // The host echoes the accepted name into its declaration.
      controller.configure({ columns: [renameable("a", "X")], onColumnRename });
      controller.resetName("a");
      expect(onColumnRename).toHaveBeenLastCalledWith("a", "A");
      expect(controller.store.getSnapshot().names).toBeUndefined();
      // Until the host drops the echo, the stale name is not a baseline.
      controller.configure({ columns: [renameable("a", "X")], onColumnRename });
      controller.configure({ columns: [renameable("a", "A")], onColumnRename });
      controller.setName("a", "Z");
      controller.resetName("a");
      expect(onColumnRename).toHaveBeenLastCalledWith("a", "A");
    });

    it("ignores a reset for a column that is not renameable", () => {
      const onColumnRename = vi.fn();
      const controller = createColumnLayoutController<Row>({
        names: { a: "X" },
      });
      controller.configure({ columns: cols("a"), onColumnRename });
      controller.resetName("a");
      controller.resetName("missing");
      expect(onColumnRename).not.toHaveBeenCalled();
    });

    it("tracks a new declaration once a reset's echo is replaced", () => {
      const onColumnRename = vi.fn();
      const controller = setup([renameable("a", "A")], { onColumnRename });
      controller.setName("a", "X");
      controller.configure({ columns: [renameable("a", "X")], onColumnRename });
      controller.resetName("a");
      controller.configure({ columns: [renameable("a", "N")], onColumnRename });
      controller.setName("a", "Q");
      controller.resetName("a");
      expect(onColumnRename).toHaveBeenLastCalledWith("a", "N");
    });

    it("keeps the pre-rename baseline when a rename matches the stale echo", () => {
      const onColumnRename = vi.fn();
      const controller = setup([renameable("a", "A")], { onColumnRename });
      controller.setName("a", "X");
      controller.configure({ columns: [renameable("a", "X")], onColumnRename });
      controller.resetName("a");
      // Renamed again while the host still echoes the discarded name.
      controller.setName("a", "Y");
      controller.configure({ columns: [renameable("a", "X")], onColumnRename });
      controller.resetName("a");
      expect(onColumnRename).toHaveBeenLastCalledWith("a", "A");
    });

    it("resumes the live declaration when the host drops the override", () => {
      const onColumnRename = vi.fn();
      const controller = createColumnLayoutController<Row>();
      const onChange = vi.fn();
      controller.store.control({
        value: {
          hidden: [],
          order: [],
          pinned: {},
          widths: {},
          names: { a: "X" },
        },
        onChange,
      });
      controller.configure({ columns: [renameable("a", "A")], onColumnRename });
      controller.store.control({
        value: { hidden: [], order: [], pinned: {}, widths: {} },
        onChange,
      });
      controller.configure({ columns: [renameable("a", "B")], onColumnRename });
      controller.setName("a", "B");
      expect(onColumnRename).not.toHaveBeenCalled();
    });

    it("forgets a removed column's baseline", () => {
      const onColumnRename = vi.fn();
      const controller = setup([renameable("a", "A")], { onColumnRename });
      controller.setName("a", "X");
      controller.configure({ columns: [], onColumnRename });
      controller.store.commit({
        hidden: [],
        order: [],
        pinned: {},
        widths: {},
      });
      controller.configure({ columns: [renameable("a", "Q")], onColumnRename });
      controller.setName("a", "R");
      controller.resetName("a");
      expect(onColumnRename).toHaveBeenLastCalledWith("a", "Q");
    });

    it("restores every renamed column's declared name on reset", () => {
      const onColumnRename = vi.fn();
      const controller = setup([renameable("a", "A"), renameable("b", "B")], {
        onColumnRename,
      });
      controller.setName("a", "X");
      controller.setHidden("b", true);
      onColumnRename.mockClear();
      controller.reset();
      expect(controller.store.getSnapshot()).toEqual({
        hidden: [],
        order: [],
        pinned: {},
        widths: {},
      });
      expect(onColumnRename).toHaveBeenCalledOnce();
      expect(onColumnRename).toHaveBeenCalledWith("a", "A");
    });

    it("resets without calling a host that cannot rename", () => {
      const controller = createColumnLayoutController<Row>({
        names: { a: "X", gone: "Y" },
      });
      controller.configure({ columns: [renameable("a", "A")] });
      controller.reset();
      expect(controller.store.getSnapshot().names).toBeUndefined();
    });
  });
});

describe("columnLayoutVisibleColumns", () => {
  const layout = { hidden: ["b"], order: ["c", "a"] };

  it("renames, orders and hides", () => {
    const columns = [renameable("a", "A"), ...cols("b", "c")];
    const visible = columnLayoutVisibleColumns(columns, {
      ...layout,
      names: { a: "X" },
    });
    expect(visible.map((c) => [c.key, c.header])).toEqual([
      ["c", "C"],
      ["a", "X"],
    ]);
  });

  it("drops collapsed group leaves only when collapse is armed", () => {
    const { leaves, groups } = flattenColumnTree<Row>([
      { key: "b", header: "B" },
      {
        header: "G",
        collapsedKey: "c",
        children: [
          { key: "a", header: "A" },
          { key: "c", header: "C" },
        ],
      },
    ]);
    const [id] = [...groups.keys()];
    const state = { hidden: [], order: [], collapsedGroups: [id!] };
    expect(
      columnLayoutVisibleColumns(leaves, state, { columnGroups: groups }).map(
        (c) => c.key
      )
    ).toEqual(["b", "a", "c"]);
    expect(
      columnLayoutVisibleColumns(leaves, state, {
        collapsibleColumnGroups: true,
        columnGroups: groups,
      }).map((c) => c.key)
    ).toEqual(["b", "c"]);
    expect(
      columnLayoutVisibleColumns(
        leaves,
        { hidden: [], order: [] },
        { collapsibleColumnGroups: true }
      ).map((c) => c.key)
    ).toEqual(["b", "a", "c"]);
  });
});

describe("columnPinInsets", () => {
  it("sums widths from each edge, preferring overrides", () => {
    const columns: Col[] = [
      { key: "a", width: 100 },
      { key: "b", width: "80px" },
      { key: "c", width: "20%" },
      { key: "d" },
      { key: "e", width: 40 },
    ];
    const insets = columnPinInsets(columns, {
      pinned: { a: "start", b: "start", c: "start", d: "end", e: "end" },
      widths: { a: 60 },
    });
    expect(insets.get("a")).toEqual({ side: "start", inset: 0 });
    expect(insets.get("b")).toEqual({ side: "start", inset: 60 });
    expect(insets.get("c")).toEqual({ side: "start", inset: 140 });
    expect(insets.get("e")).toEqual({ side: "end", inset: 0 });
    expect(insets.get("d")).toEqual({ side: "end", inset: 40 });
  });

  it("leaves a hidden pinned column out", () => {
    expect(
      columnPinInsets([], { pinned: { a: "start" }, widths: {} }).get("a")
    ).toBeUndefined();
  });
});
