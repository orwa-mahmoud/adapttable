/**
 * What a context menu offers, decided from its target.
 *
 * The interesting cases are all absences: an action nobody wired, a column
 * that forbids the thing, an entry that would be a no-op. A menu that lists
 * "Hide column" over a column locked against hiding is worse than one that
 * lists nothing — the user reads it as broken rather than as forbidden.
 */
import type { ColumnModel } from "../columnModel";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "../labels";
import { contextMenuItems, type ContextMenuTarget } from "./contextMenuModel";

interface Row {
  id: string;
  name: string;
}

const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (r) => r.name, sortable: true },
  { key: "plain", header: "Plain", exportValue: (r) => r.id },
  {
    key: "locked",
    header: "Locked",
    exportValue: (r) => r.id,
    lockVisibility: true,
    lockPin: true,
  },
];

const ROW: Row = { id: "1", name: "Ada" };
const HEADER: ContextMenuTarget<Row> = { kind: "header", columnKey: "name" };
const CELL: ContextMenuTarget<Row> = {
  kind: "cell",
  row: ROW,
  rowId: "1",
  columnKey: "name",
};

const keysFor = (
  target: ContextMenuTarget<Row>,
  actions: Parameters<typeof contextMenuItems<Row>>[0]["actions"],
  extra?: Partial<Parameters<typeof contextMenuItems<Row>>[0]>
) =>
  contextMenuItems<Row>({
    target,
    columns: COLUMNS,
    labels: defaultLabels,
    actions,
    ...extra,
  }).map((item) => item.key);

const ALL = {
  onCopy: vi.fn(),
  onCut: vi.fn(),
  onSort: vi.fn(),
  onTogglePin: vi.fn(),
  onHide: vi.fn(),
  onFilter: vi.fn(),
};

describe("contextMenuItems", () => {
  it("offers a header its column's actions", () => {
    expect(keysFor(HEADER, ALL)).toEqual([
      "sort-asc",
      "sort-desc",
      "pin",
      "hide",
    ]);
  });

  it("offers a cell the clipboard actions", () => {
    expect(keysFor(CELL, ALL)).toEqual(["copy", "cut"]);
  });

  it("offers a row the same clipboard actions as a cell", () => {
    expect(keysFor({ kind: "row", row: ROW, rowId: "1" }, ALL)).toEqual([
      "copy",
      "cut",
    ]);
  });

  it("leaves out every action the host did not wire", () => {
    expect(keysFor(HEADER, {})).toEqual([]);
    expect(keysFor(CELL, {})).toEqual([]);
  });

  it("leaves out Cut when there is no cut handler", () => {
    expect(keysFor(CELL, { onCopy: vi.fn() })).toEqual(["copy"]);
  });

  it("does not offer to sort a column that cannot be sorted", () => {
    expect(keysFor({ kind: "header", columnKey: "plain" }, ALL)).not.toContain(
      "sort-asc"
    );
  });

  it("respects a column's locks rather than listing what it forbids", () => {
    const keys = keysFor({ kind: "header", columnKey: "locked" }, ALL);

    expect(keys).not.toContain("hide");
    expect(keys).not.toContain("pin");
  });

  it("has nothing to say about a column that is not there", () => {
    expect(keysFor({ kind: "header", columnKey: "gone" }, ALL)).toEqual([]);
  });

  it("disables the direction the column is already sorted in", () => {
    const items = contextMenuItems<Row>({
      target: HEADER,
      columns: COLUMNS,
      labels: defaultLabels,
      actions: ALL,
      sortBy: "name",
      sortDir: "asc",
    });

    expect(items.find((i) => i.key === "sort-asc")?.disabled).toBe(true);
    expect(items.find((i) => i.key === "sort-desc")?.disabled).toBe(false);
  });

  it("words the pin entry for what it will do", () => {
    const pinned = contextMenuItems<Row>({
      target: HEADER,
      columns: COLUMNS,
      labels: defaultLabels,
      actions: ALL,
      isPinned: () => true,
    });

    expect(pinned.find((i) => i.key === "pin")?.label).toBe("Unpin");
    expect(
      contextMenuItems<Row>({
        target: HEADER,
        columns: COLUMNS,
        labels: defaultLabels,
        actions: ALL,
      }).find((i) => i.key === "pin")?.label
    ).toBe("Pin to start");
  });

  it("offers to filter only a column that has a filter", () => {
    const filterable: ColumnModel<Row>[] = [
      { key: "name", header: "N", exportValue: (r) => r.name, filter: "text" },
    ];
    const items = contextMenuItems<Row>({
      target: HEADER,
      columns: filterable,
      labels: defaultLabels,
      actions: ALL,
    });

    expect(items.map((i) => i.key)).toContain("filter");
  });

  it("runs the handler each entry was built for", () => {
    const actions = {
      onCopy: vi.fn(),
      onCut: vi.fn(),
      onSort: vi.fn(),
      onTogglePin: vi.fn(),
      onHide: vi.fn(),
      onFilter: vi.fn(),
    };
    const filterable: ColumnModel<Row>[] = [
      {
        key: "name",
        header: "N",
        exportValue: (r) => r.name,
        sortable: true,
        filter: "text",
      },
    ];
    const header = contextMenuItems<Row>({
      target: HEADER,
      columns: filterable,
      labels: defaultLabels,
      actions,
    });
    for (const item of header) item.onSelect();

    expect(actions.onSort).toHaveBeenCalledWith("name", "asc");
    expect(actions.onSort).toHaveBeenCalledWith("name", "desc");
    expect(actions.onFilter).toHaveBeenCalledWith("name");
    expect(actions.onTogglePin).toHaveBeenCalledWith("name");
    expect(actions.onHide).toHaveBeenCalledWith("name");

    const cell = contextMenuItems<Row>({
      target: CELL,
      columns: filterable,
      labels: defaultLabels,
      actions,
    });
    for (const item of cell) item.onSelect();

    // The clipboard entries carry the target, not just a column key: a
    // copy has to know which row it was asked from.
    expect(actions.onCopy).toHaveBeenCalledWith(CELL);
    expect(actions.onCut).toHaveBeenCalledWith(CELL);
  });

  it("appends the host's entries behind a divider", () => {
    const items = contextMenuItems<Row>({
      target: CELL,
      columns: COLUMNS,
      labels: defaultLabels,
      actions: { onCopy: vi.fn() },
      extra: () => [
        { key: "audit", label: "Open audit log", onSelect: vi.fn() },
      ],
    });

    expect(items.map((i) => i.key)).toEqual(["copy", "audit"]);
    // The divider marks where the built-ins stop, so a custom action can
    // never be read as one of ours.
    expect(items.at(-1)?.separatorBefore).toBe(true);
  });

  it("does not open with a divider when there are no built-ins above it", () => {
    const items = contextMenuItems<Row>({
      target: CELL,
      columns: COLUMNS,
      labels: defaultLabels,
      actions: {},
      extra: () => [{ key: "only", label: "Only", onSelect: vi.fn() }],
    });

    expect(items.at(0)?.separatorBefore).toBe(false);
  });

  it("hands the host's builder the target it is deciding for", () => {
    const extra = vi.fn().mockReturnValue([]);
    contextMenuItems<Row>({
      target: CELL,
      columns: COLUMNS,
      labels: defaultLabels,
      actions: {},
      extra,
    });

    expect(extra).toHaveBeenCalledWith(CELL);
  });
});
