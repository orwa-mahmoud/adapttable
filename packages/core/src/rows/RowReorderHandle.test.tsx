/**
 * The grip and the mobile up/down buttons are the only reorder UI kits
 * render. Prove they call through to the headless state.
 */
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  rowReorderButtonsTestSlots,
  rowReorderHandleTestSlots,
} from "../internal/chromeTestSlots";
import { useRowReorder } from "./rowReorder";
import {
  RowReorderAnnouncer,
  RowReorderButtonsChrome,
  RowReorderHandleChrome,
} from "./RowReorderHandle";

interface Task {
  id: string;
}

const ROW: Task = { id: "a" };
const LABELS = {
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: (position: number) => `Row ${String(position)} lifted`,
  rowMoved: (from: number, to: number) =>
    `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
};

describe("RowReorderHandle", () => {
  it("lifts on Space from the grip", () => {
    const onRowReorder = vi.fn();
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder,
        labels: LABELS,
        rowAt: () => ROW,
      })
    );
    const { rerender } = render(
      <RowReorderHandleChrome
        slots={rowReorderHandleTestSlots}
        reorder={result.current}
        labels={LABELS}
        rowId="a"
        localIndex={0}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder row" }), {
      key: " ",
    });
    rerender(
      <RowReorderHandleChrome
        slots={rowReorderHandleTestSlots}
        reorder={result.current}
        labels={LABELS}
        rowId="a"
        localIndex={0}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    expect(result.current.lifted?.rowId).toBe("a");
  });
});

describe("RowReorderButtons", () => {
  it("moves down, and disables up on the first card", () => {
    const onRowReorder = vi.fn();
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder,
        labels: LABELS,
        rowAt: () => ROW,
      })
    );
    render(
      <>
        <RowReorderAnnouncer announcement={result.current.announcement} />
        <RowReorderButtonsChrome
          slots={rowReorderButtonsTestSlots}
          reorder={result.current}
          labels={LABELS}
          localIndex={0}
          row={ROW}
          windowStart={0}
          rowCount={3}
        />
      </>
    );
    expect(screen.getByRole("button", { name: "Move row up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Move row down" }));
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROW);
  });

  it("moves up from a later card", () => {
    const onRowReorder = vi.fn();
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder,
        labels: LABELS,
        rowAt: () => ROW,
      })
    );
    render(
      <RowReorderButtonsChrome
        slots={rowReorderButtonsTestSlots}
        reorder={result.current}
        labels={LABELS}
        localIndex={1}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Move row up" }));
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(1, 0, ROW);
  });

  it("offers destination items and a disabled reason from the move menu", () => {
    const onRowMove = vi.fn();
    const request = {
      kind: "group" as const,
      row: ROW,
      rowLabel: "Ada",
      fromGroup: { id: "a", label: "A", levels: [] },
      toGroup: { id: "b", label: "B", levels: [] },
      position: 0,
    };
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder: vi.fn(),
        movePolicy: "auto",
        onRowMove,
        getMoveMenu: () => ({
          kind: "group",
          label: "Move to group…",
          targets: [
            { id: "b", label: "B", request },
            { id: "blocked", label: "Blocked", disabledReason: "not allowed" },
          ],
        }),
        labels: LABELS,
        rowAt: () => ROW,
      })
    );
    render(
      <RowReorderButtonsChrome
        slots={rowReorderButtonsTestSlots}
        reorder={result.current}
        labels={LABELS}
        localIndex={0}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    expect(screen.getByRole("button", { name: "Blocked" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onRowMove).toHaveBeenCalledExactlyOnceWith(request);
  });
});

describe("RowReorderHandle menu", () => {
  it("confirms a pending destination from the grip menu", () => {
    const onRowMove = vi.fn();
    const request = {
      kind: "group" as const,
      row: ROW,
      rowLabel: "Ada",
      fromGroup: { id: "a", label: "A", levels: [] },
      toGroup: { id: "b", label: "B", levels: [] },
      position: 0,
    };
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder: vi.fn(),
        movePolicy: "confirm",
        onRowMove,
        getMoveMenu: () => ({
          kind: "group",
          label: "Move to group…",
          targets: [{ id: "b", label: "B", request }],
        }),
        labels: LABELS,
        rowAt: () => ROW,
      })
    );
    const { rerender } = render(
      <RowReorderHandleChrome
        slots={rowReorderHandleTestSlots}
        reorder={result.current}
        labels={{
          ...LABELS,
          confirmRowMoveTitle: "Confirm row move",
          confirmRowMoveDescription: (row, from, to) =>
            `Move ${row} from ${from} to ${to}?`,
          confirmRowMove: "Move",
          cancel: "Cancel",
        }}
        rowId="a"
        localIndex={0}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    rerender(
      <RowReorderHandleChrome
        slots={rowReorderHandleTestSlots}
        reorder={result.current}
        labels={{
          ...LABELS,
          confirmRowMoveTitle: "Confirm row move",
          confirmRowMoveDescription: (row, from, to) =>
            `Move ${row} from ${from} to ${to}?`,
          confirmRowMove: "Move",
          cancel: "Cancel",
        }}
        rowId="a"
        localIndex={0}
        row={ROW}
        windowStart={0}
        rowCount={3}
      />
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Ada");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onRowMove).toHaveBeenCalledExactlyOnceWith(request);
  });
});
