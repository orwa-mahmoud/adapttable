/**
 * The routes into a context menu.
 *
 * Right-click is the one everybody tests. The two that matter more are the
 * ones that are usually missing — Shift+F10 and the menu key, which are how
 * a keyboard user opens a context menu in every other application they
 * use — and the long press, which is the only route a touch user has.
 *
 * The other thing checked here is where focus lands on the way out. A menu
 * that closes and drops focus to the document leaves someone at the top of
 * the page having lost the row they were on, and nothing on screen says so.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextMenuTarget } from "./contextMenuModel";
import { useContextMenu } from "./useContextMenu";

interface Row {
  id: string;
}
const TARGET: ContextMenuTarget<Row> = {
  kind: "row",
  row: { id: "1" },
  rowId: "1",
};

function Harness({ enabled = true }: Readonly<{ enabled?: boolean }>) {
  const menu = useContextMenu<Row>(enabled);
  return (
    <div>
      <button
        type="button"
        data-testid="trigger"
        {...menu.triggerProps(TARGET)}
      >
        row
      </button>
      <output data-testid="state">
        {menu.open ? `${menu.open.at.x},${menu.open.at.y}` : "closed"}
      </output>
      <button type="button" data-testid="close" onClick={menu.close}>
        close
      </button>
    </div>
  );
}

const state = () => screen.getByTestId("state").textContent;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useContextMenu", () => {
  it("starts closed", () => {
    render(<Harness />);

    expect(state()).toBe("closed");
  });

  it("opens where the pointer was on right-click", () => {
    render(<Harness />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), {
      clientX: 120,
      clientY: 40,
    });

    expect(state()).toBe("120,40");
  });

  it("opens on Shift+F10, at the element rather than at a pointer", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByTestId("trigger"), {
      key: "F10",
      shiftKey: true,
    });

    expect(state()).not.toBe("closed");
  });

  it("opens on the dedicated menu key", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByTestId("trigger"), { key: "ContextMenu" });

    expect(state()).not.toBe("closed");
  });

  it("ignores F10 without Shift, which is the browser's own menu", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByTestId("trigger"), { key: "F10" });

    expect(state()).toBe("closed");
  });

  it("opens on a long press, and not before", () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.pointerDown(trigger, {
      pointerType: "touch",
      clientX: 10,
      clientY: 20,
    });

    expect(state()).toBe("closed");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("10,20");
  });

  it("treats a press that travels as a scroll, not a menu", () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.pointerDown(trigger, {
      pointerType: "touch",
      clientX: 10,
      clientY: 20,
    });
    fireEvent.pointerMove(trigger, { clientX: 10, clientY: 60 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("closed");
  });

  it("keeps a press that barely moves", () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.pointerDown(trigger, {
      pointerType: "touch",
      clientX: 10,
      clientY: 20,
    });
    fireEvent.pointerMove(trigger, { clientX: 13, clientY: 22 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("10,20");
  });

  it("does not open on a held mouse button, which is a drag", () => {
    render(<Harness />);
    fireEvent.pointerDown(screen.getByTestId("trigger"), {
      pointerType: "mouse",
      clientX: 10,
      clientY: 20,
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("closed");
  });

  it("abandons the press when the finger lifts", () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.pointerDown(trigger, {
      pointerType: "touch",
      clientX: 10,
      clientY: 20,
    });
    fireEvent.pointerUp(trigger);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("closed");
  });

  it("abandons the press when the browser cancels it", () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.pointerDown(trigger, {
      pointerType: "touch",
      clientX: 10,
      clientY: 20,
    });
    fireEvent.pointerCancel(trigger);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("closed");
  });

  it("puts focus back on what opened it", () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.contextMenu(trigger, { clientX: 1, clientY: 1 });
    act(() => screen.getByTestId("close").focus());
    fireEvent.click(screen.getByTestId("close"));

    expect(state()).toBe("closed");
    expect(document.activeElement).toBe(trigger);
  });

  it("does nothing at all when it is not armed", () => {
    render(<Harness enabled={false} />);
    const trigger = screen.getByTestId("trigger");
    fireEvent.contextMenu(trigger, { clientX: 1, clientY: 1 });
    fireEvent.keyDown(trigger, { key: "ContextMenu" });
    fireEvent.pointerDown(trigger, {
      pointerType: "touch",
      clientX: 1,
      clientY: 1,
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(state()).toBe("closed");
  });
});
