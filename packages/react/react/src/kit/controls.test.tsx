/**
 * The feature controls a kit gets from its primitives. Each test draws one
 * factory's component with the native test set and checks what a person
 * meets: the part names, the accessible names, and every control reaching
 * the state it belongs to.
 */
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FindInTableState } from "../find/useFindInTable";
import { testPrimitives } from "../internal/testPrimitives";
import { useRowReorder } from "../rows/rowReorder";
import {
  createEditableCellSlots,
  createFilterHeaderControl,
  createFindBar,
  createRowEditActions,
  createRowReorderHandle,
  createTreeToggle,
} from "./controls";
import { MobileTarget } from "./mobileTarget";

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

const findState = (over: Partial<FindInTableState> = {}): FindInTableState => ({
  open: true,
  setOpen: vi.fn(),
  query: "",
  setQuery: vi.fn(),
  matches: [],
  index: 0,
  next: vi.fn(),
  previous: vi.fn(),
  matchKeys: new Set<string>(),
  current: null,
  ...over,
});

describe("createFindBar", () => {
  const FindBar = createFindBar(testPrimitives);

  it("draws the search field the reader types into, focused", () => {
    const find = findState();
    render(<FindBar find={find} />);
    const input = part("find-input");
    expect(input).toHaveFocus();
    fireEvent.change(input!, { target: { value: "ada" } });
    expect(find.setQuery).toHaveBeenCalledWith("ada");
  });

  it("walks matches and closes from its glyph buttons", () => {
    const find = findState({
      matches: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    });
    render(<FindBar find={find} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(find.next).toHaveBeenCalledOnce();
    expect(find.setOpen).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: /next/i })).toHaveTextContent(
      "↓"
    );
  });
});

describe("createRowEditActions", () => {
  const glyphs: Record<string, string> = { "row-edit-begin": "✎" };
  const RowEditActions = createRowEditActions(
    testPrimitives,
    (partName, icon) => (icon === false ? undefined : glyphs[partName])
  );
  const rowEditing = {
    isEditing: () => false,
    begin: vi.fn(),
  } as unknown as Parameters<typeof RowEditActions>[0]["rowEditing"];

  it("draws a glyph button named by its label where the kit has a glyph", () => {
    render(
      <RowEditActions
        rowEditing={rowEditing}
        row={{ id: "a" }}
        rowId="a"
        showBegin
        labels={{ editRow: "Edit row", saveRow: "Save", cancel: "Cancel" }}
      />
    );
    const begin = screen.getByRole("button", { name: "Edit row" });
    expect(begin).toHaveTextContent("✎");
    expect(begin).toHaveAttribute("title", "Edit row");
    fireEvent.click(begin);
    expect(rowEditing.begin).toHaveBeenCalledOnce();
  });

  it("draws a text button where the glyph is turned off", () => {
    render(
      <RowEditActions
        rowEditing={rowEditing}
        row={{ id: "a" }}
        rowId="a"
        showBegin
        icons={{ begin: false }}
        labels={{ editRow: "Edit row", saveRow: "Save", cancel: "Cancel" }}
      />
    );
    expect(screen.getByRole("button", { name: "Edit row" })).toHaveTextContent(
      "Edit row"
    );
  });

  it("grows to a touch target inside a mobile card", () => {
    render(
      <MobileTarget.Provider value={true}>
        <RowEditActions
          rowEditing={rowEditing}
          row={{ id: "a" }}
          rowId="a"
          showBegin
          labels={{ editRow: "Edit row", saveRow: "Save", cancel: "Cancel" }}
        />
      </MobileTarget.Provider>
    );
    expect(screen.getByRole("button", { name: "Edit row" })).toHaveStyle({
      minWidth: "44px",
      minHeight: "44px",
    });
  });
});

describe("createTreeControls", () => {
  const TreeToggle = createTreeToggle(testPrimitives);

  it("names the toggle and states whether the row is open or loading", () => {
    const onToggle = vi.fn();
    render(
      <TreeToggle
        entry={{
          row: { id: "a" },
          key: "a",
          level: 0,
          hasChildren: true,
          expanded: true,
          loading: true,
          path: [],
          descendantIds: [],
        }}
        labels={{ expandRow: "Expand", collapseRow: "Collapse" }}
        onToggle={onToggle}
      />
    );
    const toggle = part("tree-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-busy", "true");
    fireEvent.click(toggle!);
    expect(onToggle).toHaveBeenCalledWith("a");
  });
});

describe("createEditableCellSlots", () => {
  const slots = createEditableCellSlots(testPrimitives);

  it("draws the activation target with its save state and the gate button", () => {
    const onClick = vi.fn();
    render(
      <>
        <slots.Activate
          title="Edit"
          saveStatus="saving"
          dirty
          activateRef={() => undefined}
          display="Ada"
          onDoubleClick={() => undefined}
          onClick={() => undefined}
          onKeyDown={() => undefined}
        />
        <slots.Button label="Undo" part="edit-undo" onClick={onClick} />
      </>
    );
    const activate = part("edit-cell-activate");
    expect(activate).toHaveAttribute("data-save", "saving");
    expect(activate).toHaveAttribute("aria-busy", "true");
    expect(activate).toHaveAttribute("data-dirty", "");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("createFilterHeader", () => {
  const FilterHeaderControl = createFilterHeaderControl(testPrimitives);

  it("opens the multi-choice list and reports each box the reader ticks", () => {
    const setExtra = vi.fn();
    const source = {
      extra: {},
      setExtra,
    } as unknown as Parameters<typeof FilterHeaderControl>[0]["source"];
    render(
      <FilterHeaderControl
        def={{
          key: "status",
          label: "Status",
          type: "multiSelect",
          options: [
            { value: "open", label: "Open" },
            { value: "done", label: "Done" },
          ],
        }}
        source={source}
        labels={defaultLabels}
      />
    );
    const trigger = part("filter-header-input");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger!);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(part("filter-header-menu")).not.toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Done" }));
    expect(setExtra).toHaveBeenCalledWith("status", ["done"]);
  });
});

describe("createRowReorderHandle", () => {
  const RowReorderHandle = createRowReorderHandle(testPrimitives);
  const labels = {
    reorderRow: "Reorder row",
    moveRowUp: "Move row up",
    moveRowDown: "Move row down",
    rowLifted: (position: number) => `Row ${String(position)} lifted`,
    rowMoved: (from: number, to: number) =>
      `Row moved from ${String(from)} to ${String(to)}`,
    rowReorderCancelled: "Reorder cancelled",
    confirmRowMoveTitle: "Confirm row move",
    confirmRowMoveDescription: (row: string, from: string, to: string) =>
      `Move ${row} from ${from} to ${to}?`,
    confirmRowMove: "Move",
    cancel: "Cancel",
  };
  const ROW = { id: "a" };
  const request = {
    kind: "group" as const,
    row: ROW,
    rowLabel: "Ada",
    fromGroup: { id: "a", label: "A", levels: [] },
    toGroup: { id: "b", label: "B", levels: [] },
    position: 0,
  };

  function setup(onRowMove: () => void) {
    const { result } = renderHook(() =>
      useRowReorder<typeof ROW>({
        enabled: true,
        onRowReorder: vi.fn(),
        movePolicy: "confirm",
        onRowMove,
        getMoveMenu: () => ({
          kind: "group",
          label: "Move to group…",
          targets: [{ id: "b", label: "B", request }],
        }),
        labels,
        rowAt: () => ROW,
      })
    );
    const draw = () => (
      <RowReorderHandle
        reorder={result.current}
        labels={labels}
        rowId="a"
        localIndex={0}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    return { draw };
  }

  it("asks before a confirmed move and moves on yes", () => {
    const onRowMove = vi.fn();
    const { draw } = setup(onRowMove);
    const { rerender } = render(draw());
    fireEvent.click(part("row-move-menu-trigger")!);
    fireEvent.click(screen.getByRole("menuitem", { name: "B" }));
    rerender(draw());
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Ada");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onRowMove).toHaveBeenCalledExactlyOnceWith(request);
  });

  it("drops the pending move on Escape", () => {
    const onRowMove = vi.fn();
    const { draw } = setup(onRowMove);
    const { rerender } = render(draw());
    fireEvent.click(part("row-move-menu-trigger")!);
    fireEvent.click(screen.getByRole("menuitem", { name: "B" }));
    rerender(draw());
    fireEvent.keyDown(document, { key: "Escape" });
    rerender(draw());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onRowMove).not.toHaveBeenCalled();
  });
});
