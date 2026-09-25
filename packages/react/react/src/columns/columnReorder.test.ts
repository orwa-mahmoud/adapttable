import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  COLUMN_DND_MIME,
  columnDropProps,
  columnReorderKeyProps,
  columnRowDragProps,
  useColumnDragState,
} from "./columnReorder";

/** A minimal in-memory DataTransfer stand-in for jsdom drag events. */
function fakeDataTransfer(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    effectAllowed: "",
    dropEffect: "",
    get types() {
      return Object.keys(store);
    },
    setData: vi.fn((type: string, value: string) => {
      store[type] = value;
    }),
    getData: vi.fn((type: string) => store[type] ?? ""),
  };
}

function dragEvent(dataTransfer: unknown, extra: Record<string, unknown> = {}) {
  return {
    preventDefault: vi.fn(),
    defaultPrevented: false,
    dataTransfer,
    ...extra,
  };
}

describe("columnRowDragProps", () => {
  it("makes the row draggable and writes the column key on drag start", () => {
    const props = columnRowDragProps("a");
    expect(props.draggable).toBe(true);
    const dt = fakeDataTransfer();
    props.onDragStart(dragEvent(dt) as never);
    expect(dt.setData).toHaveBeenCalledWith(COLUMN_DND_MIME, "a");
    expect(dt.effectAllowed).toBe("move");
  });

  it("cancels the drag when it starts on an interactive control", () => {
    const props = columnRowDragProps("a");
    const dt = fakeDataTransfer();
    const button = document.createElement("button");
    const icon = document.createElement("span");
    button.append(icon);
    // Drag started on the pin/eye button (or an icon inside it): cancel so the
    // button's click still fires; nothing is written to the transfer.
    const event = dragEvent(dt, { target: icon, preventDefault: vi.fn() });
    props.onDragStart(event as never);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(dt.setData).not.toHaveBeenCalled();
  });

  it("starts the drag from the row body (a non-control target)", () => {
    const props = columnRowDragProps("a");
    const dt = fakeDataTransfer();
    const rowBody = document.createElement("div");
    props.onDragStart(dragEvent(dt, { target: rowBody }) as never);
    expect(dt.setData).toHaveBeenCalledWith(COLUMN_DND_MIME, "a");
  });

  it("starts the drag from the grip even when the kit renders it as a button", () => {
    // Mantine/MUI/Chakra render the grip as an icon BUTTON; the interactive-
    // control cancel must not eat the strongest drag affordance of all.
    const props = columnRowDragProps("a");
    const dt = fakeDataTransfer();
    const grip = document.createElement("button");
    grip.setAttribute("data-adapttable-grip", "");
    const icon = document.createElement("span");
    grip.append(icon);
    const event = dragEvent(dt, { target: icon, preventDefault: vi.fn() });
    props.onDragStart(event as never);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(dt.setData).toHaveBeenCalledWith(COLUMN_DND_MIME, "a");
  });
});

describe("columnReorderKeyProps", () => {
  it("exposes an accessible focusable grip", () => {
    const props = columnReorderKeyProps("a", 0, vi.fn(), "Reorder A");
    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("Reorder A");
  });

  it("moves backward/forward with arrow keys", () => {
    const move = vi.fn();
    const props = columnReorderKeyProps("a", 3, move, "Reorder A");
    props.onKeyDown(dragEvent(null, { key: "ArrowLeft" }) as never);
    expect(move).toHaveBeenLastCalledWith("a", 2);
    props.onKeyDown(dragEvent(null, { key: "ArrowUp" }) as never);
    expect(move).toHaveBeenLastCalledWith("a", 2);
    props.onKeyDown(dragEvent(null, { key: "ArrowRight" }) as never);
    expect(move).toHaveBeenLastCalledWith("a", 4);
    props.onKeyDown(dragEvent(null, { key: "ArrowDown" }) as never);
    expect(move).toHaveBeenLastCalledWith("a", 4);
  });

  it("flips ArrowLeft/ArrowRight under dir=rtl (Up/Down stay logical)", () => {
    const move = vi.fn();
    const props = columnReorderKeyProps("a", 3, move, "Reorder A");
    const root = document.createElement("div");
    root.setAttribute("dir", "rtl");
    const grip = document.createElement("span");
    root.append(grip);
    // Visually-right is toward the START in RTL.
    props.onKeyDown(
      dragEvent(null, { key: "ArrowRight", currentTarget: grip }) as never
    );
    expect(move).toHaveBeenLastCalledWith("a", 2);
    props.onKeyDown(
      dragEvent(null, { key: "ArrowLeft", currentTarget: grip }) as never
    );
    expect(move).toHaveBeenLastCalledWith("a", 4);
    props.onKeyDown(
      dragEvent(null, { key: "ArrowUp", currentTarget: grip }) as never
    );
    expect(move).toHaveBeenLastCalledWith("a", 2);
    props.onKeyDown(
      dragEvent(null, { key: "ArrowDown", currentTarget: grip }) as never
    );
    expect(move).toHaveBeenLastCalledWith("a", 4);
  });

  it("marks the grip so row-drag exempts it from the control cancel", () => {
    const props = columnReorderKeyProps("a", 0, vi.fn(), "Reorder A");
    expect(props["data-adapttable-grip"]).toBe("");
  });

  it("ignores non-arrow keys", () => {
    const move = vi.fn();
    const props = columnReorderKeyProps("a", 3, move, "Reorder A");
    props.onKeyDown(dragEvent(null, { key: "Enter" }) as never);
    expect(move).not.toHaveBeenCalled();
  });
});

describe("columnDropProps", () => {
  it("accepts a drop carrying a column key and moves it to the index", () => {
    const move = vi.fn();
    const props = columnDropProps(1, move);
    const dt = fakeDataTransfer({ [COLUMN_DND_MIME]: "b" });
    const over = dragEvent(dt);
    props.onDragOver(over as never);
    expect(over.preventDefault).toHaveBeenCalled();
    expect(dt.dropEffect).toBe("move");
    const drop = dragEvent(dt);
    props.onDrop(drop as never);
    expect(drop.preventDefault).toHaveBeenCalled();
    expect(move).toHaveBeenCalledWith("b", 1);
  });

  it("ignores dragover/drop without a column payload", () => {
    const move = vi.fn();
    const props = columnDropProps(1, move);
    const over = dragEvent(fakeDataTransfer({ "text/plain": "x" }));
    props.onDragOver(over as never);
    expect(over.preventDefault).not.toHaveBeenCalled();
    const drop = dragEvent(fakeDataTransfer());
    props.onDrop(drop as never);
    expect(move).not.toHaveBeenCalled();
  });
});

describe("direction detection without a [dir] ancestor", () => {
  it("falls back to the computed style direction", () => {
    const move = vi.fn();
    const props = columnReorderKeyProps("a", 3, move, "Reorder A");
    const grip = document.createElement("span");
    document.body.append(grip); // no [dir] anywhere up the tree
    props.onKeyDown(
      dragEvent(null, { key: "ArrowLeft", currentTarget: grip }) as never
    );
    // jsdom computes direction "ltr" → ArrowLeft moves toward the start.
    expect(move).toHaveBeenLastCalledWith("a", 2);
    grip.remove();
  });
});

describe("useColumnDragState", () => {
  function startDrag(
    state: ReturnType<typeof useColumnDragState>,
    key: string,
    index: number
  ) {
    const dt = fakeDataTransfer();
    const props = state.rowDragProps(key, index);
    act(() => {
      props.onDragStart(
        dragEvent(dt, {
          // No interactive ancestor — the drag is allowed.
          target: { closest: () => null },
          defaultPrevented: false,
        }) as never
      );
    });
    return props;
  }

  it("is idle (no attributes) outside a drag", () => {
    const { result } = renderHook(() => useColumnDragState());
    expect(result.current.draggingKey).toBeNull();
    expect(result.current.rowAttrs("a", 0)).toEqual({});
  });

  it("marks the dragged row and the hovered target with its edge", () => {
    const move = vi.fn();
    const { result } = renderHook(() => useColumnDragState());
    startDrag(result.current, "b", 1);
    expect(result.current.draggingKey).toBe("b");
    expect(result.current.rowAttrs("b", 1)).toEqual({ "data-dragging": "" });

    // Hover an EARLIER row → the column lands before it.
    const over = dragEvent(
      { types: [COLUMN_DND_MIME], dropEffect: "none" },
      { defaultPrevented: false }
    );
    over.preventDefault = vi.fn(() => {
      over.defaultPrevented = true;
    });
    act(() => result.current.dropProps(0, move).onDragOver(over as never));
    expect(result.current.overIndex).toBe(0);
    expect(result.current.rowAttrs("a", 0)).toEqual({ "data-drop": "before" });

    // Hover a LATER row → lands after it.
    const overLater = dragEvent(
      { types: [COLUMN_DND_MIME], dropEffect: "none" },
      { defaultPrevented: false }
    );
    overLater.preventDefault = vi.fn(() => {
      overLater.defaultPrevented = true;
    });
    act(() => result.current.dropProps(2, move).onDragOver(overLater as never));
    expect(result.current.rowAttrs("c", 2)).toEqual({ "data-drop": "after" });
    // The source row itself never shows a drop edge.
    expect(result.current.rowAttrs("b", 1)).toEqual({ "data-dragging": "" });
    // Rows that are neither the source nor the hovered target stay bare.
    expect(result.current.rowAttrs("a", 0)).toEqual({});
  });

  it("ignores hovers from non-column drags", () => {
    const move = vi.fn();
    const { result } = renderHook(() => useColumnDragState());
    startDrag(result.current, "b", 1);
    const foreign = dragEvent(
      { types: ["text/plain"], dropEffect: "none" },
      { defaultPrevented: false }
    );
    act(() => result.current.dropProps(0, move).onDragOver(foreign as never));
    expect(result.current.overIndex).toBeNull();
  });

  it("hovering the source's own index shows no indicator", () => {
    const move = vi.fn();
    const { result } = renderHook(() => useColumnDragState());
    startDrag(result.current, "b", 1);
    const over = dragEvent(
      { types: [COLUMN_DND_MIME], dropEffect: "none" },
      { defaultPrevented: false }
    );
    over.preventDefault = vi.fn(() => {
      over.defaultPrevented = true;
    });
    act(() => result.current.dropProps(1, move).onDragOver(over as never));
    expect(result.current.rowAttrs("b", 1)).toEqual({ "data-dragging": "" });
  });

  it("drop moves the column and clears every indicator", () => {
    const move = vi.fn();
    const { result } = renderHook(() => useColumnDragState());
    startDrag(result.current, "b", 1);
    const dt = {
      types: [COLUMN_DND_MIME],
      getData: vi.fn(() => "b"),
      dropEffect: "none",
    };
    act(() => result.current.dropProps(0, move).onDrop(dragEvent(dt) as never));
    expect(move).toHaveBeenCalledWith("b", 0);
    expect(result.current.draggingKey).toBeNull();
    expect(result.current.overIndex).toBeNull();
  });

  it("a cancelled drag (Escape / drop outside) clears via onDragEnd", () => {
    const { result } = renderHook(() => useColumnDragState());
    const props = startDrag(result.current, "b", 1);
    act(() => props.onDragEnd());
    expect(result.current.draggingKey).toBeNull();
  });

  it("never tracks a drag the base handler cancelled (interactive control)", () => {
    const { result } = renderHook(() => useColumnDragState());
    const dt = fakeDataTransfer();
    const props = result.current.rowDragProps("b", 1);
    const evt = dragEvent(dt, {
      target: {
        closest: (sel: string) => (sel.includes("button") ? {} : null),
      },
      defaultPrevented: false,
    });
    evt.preventDefault = vi.fn(() => {
      evt.defaultPrevented = true;
    });
    act(() => props.onDragStart(evt as never));
    expect(result.current.draggingKey).toBeNull();
  });
});
