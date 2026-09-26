/**
 * The context-menu open controller, driven the way a binding drives it:
 * configure, forward the trigger or region events, read the snapshot.
 *
 * Right-click is the route everybody tests. The ones checked as carefully
 * here are Shift+F10 and the menu key, the long press — the only route a
 * touch user has — and where focus lands when the menu closes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextMenuTarget } from "./contextMenuModel";
import {
  composeContextMenuExtra,
  createContextMenuOpenController,
  isContextMenuArmed,
  isContextMenuKey,
} from "./contextMenuOpenController";

interface Row {
  id: string;
}

const TARGET: ContextMenuTarget<Row> = {
  kind: "row",
  row: { id: "1" },
  rowId: "1",
};

function element(): HTMLButtonElement {
  const button = document.createElement("button");
  document.body.append(button);
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
    left: 100,
    width: 40,
    bottom: 30,
  } as DOMRect);
  return button;
}

function setup(enabled = true) {
  const controller = createContextMenuOpenController<Row>({ enabled });
  const listener = vi.fn();
  controller.subscribe(listener);
  return { controller, listener };
}

function rightClick(currentTarget: Element, clientX = 120, clientY = 40) {
  return { clientX, clientY, currentTarget, preventDefault: vi.fn() };
}

function touch(currentTarget: Element, pointerType = "touch") {
  return { pointerType, clientX: 10, clientY: 20, currentTarget };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("isContextMenuKey", () => {
  it("accepts the menu key and Shift+F10", () => {
    expect(isContextMenuKey({ key: "ContextMenu", shiftKey: false })).toBe(
      true
    );
    expect(isContextMenuKey({ key: "F10", shiftKey: true })).toBe(true);
  });

  it("rejects F10 alone, which is the browser's own menu, and other keys", () => {
    expect(isContextMenuKey({ key: "F10", shiftKey: false })).toBe(false);
    expect(isContextMenuKey({ key: "a", shiftKey: true })).toBe(false);
  });
});

describe("isContextMenuArmed", () => {
  it("follows the prop when the host wrote one", () => {
    expect(isContextMenuArmed(true, undefined)).toBe(true);
    expect(isContextMenuArmed({}, undefined)).toBe(true);
    expect(isContextMenuArmed(false, [() => []])).toBe(false);
  });

  it("arms an absent prop only when a feature registered entries", () => {
    expect(isContextMenuArmed(undefined, undefined)).toBe(false);
    expect(isContextMenuArmed(undefined, [])).toBe(false);
    expect(isContextMenuArmed(undefined, [() => []])).toBe(true);
  });
});

describe("composeContextMenuExtra", () => {
  const host = () => [{ key: "host", label: "Host", onSelect: vi.fn() }];
  const plugin = () => [{ key: "plugin", label: "Plugin", onSelect: vi.fn() }];

  it("is nothing when there is nothing extra", () => {
    expect(composeContextMenuExtra(undefined, undefined)).toBeUndefined();
    expect(composeContextMenuExtra(undefined, [])).toBeUndefined();
  });

  it("is the host's factory itself when no feature adds another", () => {
    expect(composeContextMenuExtra(host, undefined)).toBe(host);
    expect(composeContextMenuExtra(host, [host])).toBe(host);
  });

  it("lists the host's entries first, then each feature's, once", () => {
    const merged = composeContextMenuExtra(host, [host, plugin]);

    expect(merged?.(TARGET).map((item) => item.key)).toEqual([
      "host",
      "plugin",
    ]);
  });

  it("lists the features' entries when the host has none", () => {
    const merged = composeContextMenuExtra(undefined, [plugin]);

    expect(merged?.(TARGET).map((item) => item.key)).toEqual(["plugin"]);
  });
});

describe("createContextMenuOpenController — trigger handlers", () => {
  it("starts closed, with a stable snapshot", () => {
    const { controller } = setup();

    expect(controller.getSnapshot().open).toBeNull();
    expect(controller.getSnapshot()).toBe(controller.getSnapshot());
  });

  it("opens where the pointer was on right-click, notifying once", () => {
    const { controller, listener } = setup();
    const event = rightClick(element());
    controller.triggerHandlers(TARGET).onContextMenu(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().open).toEqual({
      target: TARGET,
      at: { x: 120, y: 40 },
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("opens on Shift+F10 at the element's corner rather than at a pointer", () => {
    const { controller } = setup();
    const preventDefault = vi.fn();
    controller.triggerHandlers(TARGET).onKeyDown({
      key: "F10",
      shiftKey: true,
      currentTarget: element(),
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().open?.at).toEqual({ x: 120, y: 30 });
  });

  it("leaves every other key alone", () => {
    const { controller, listener } = setup();
    const preventDefault = vi.fn();
    controller.triggerHandlers(TARGET).onKeyDown({
      key: "F10",
      shiftKey: false,
      currentTarget: element(),
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(controller.getSnapshot().open).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it("opens on a long press, and not before", () => {
    const { controller } = setup();
    controller.triggerHandlers(TARGET).onPointerDown(touch(element()));
    vi.advanceTimersByTime(499);

    expect(controller.getSnapshot().open).toBeNull();

    vi.advanceTimersByTime(1);

    expect(controller.getSnapshot().open?.at).toEqual({ x: 10, y: 20 });
  });

  it("restarts the press when a second finger lands", () => {
    const { controller, listener } = setup();
    const handlers = controller.triggerHandlers(TARGET);
    handlers.onPointerDown(touch(element()));
    vi.advanceTimersByTime(300);
    handlers.onPointerDown(touch(element()));
    vi.advanceTimersByTime(300);

    expect(controller.getSnapshot().open).toBeNull();

    vi.advanceTimersByTime(200);

    expect(listener).toHaveBeenCalledOnce();
  });

  it("does not open on a held mouse button, which is a drag", () => {
    const { controller } = setup();
    controller.triggerHandlers(TARGET).onPointerDown(touch(element(), "mouse"));
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open).toBeNull();
  });

  it("treats a press that travels as a scroll, not a menu", () => {
    const { controller } = setup();
    const handlers = controller.triggerHandlers(TARGET);
    handlers.onPointerDown(touch(element()));
    handlers.onPointerMove({ clientX: 10, clientY: 60 });
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open).toBeNull();
  });

  it("abandons a press that travels sideways", () => {
    const { controller } = setup();
    const handlers = controller.triggerHandlers(TARGET);
    handlers.onPointerDown(touch(element()));
    handlers.onPointerMove({ clientX: 40, clientY: 20 });
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open).toBeNull();
  });

  it("keeps a press that barely moves", () => {
    const { controller } = setup();
    const handlers = controller.triggerHandlers(TARGET);
    handlers.onPointerDown(touch(element()));
    handlers.onPointerMove({ clientX: 13, clientY: 22 });
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open?.at).toEqual({ x: 10, y: 20 });
  });

  it("ignores movement when no press is held", () => {
    const { controller, listener } = setup();
    controller
      .triggerHandlers(TARGET)
      .onPointerMove({ clientX: 500, clientY: 500 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("abandons the press when the finger lifts or the browser cancels it", () => {
    const { controller } = setup();
    const handlers = controller.triggerHandlers(TARGET);
    for (const end of [handlers.onPointerUp, handlers.onPointerCancel]) {
      handlers.onPointerDown(touch(element()));
      end();
      vi.advanceTimersByTime(500);

      expect(controller.getSnapshot().open).toBeNull();
    }
    handlers.onPointerUp();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("does nothing at all when it is not armed", () => {
    const { controller, listener } = setup(false);
    const handlers = controller.triggerHandlers(TARGET);
    const click = rightClick(element());
    const preventDefault = vi.fn();
    handlers.onContextMenu(click);
    handlers.onKeyDown({
      key: "ContextMenu",
      shiftKey: false,
      currentTarget: element(),
      preventDefault,
    });
    handlers.onPointerDown(touch(element()));
    vi.advanceTimersByTime(500);

    expect(click.preventDefault).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it("reads the latest configuration without notifying", () => {
    const { controller, listener } = setup(false);
    controller.configure({ enabled: true });

    expect(listener).not.toHaveBeenCalled();

    controller.triggerHandlers(TARGET).onContextMenu(rightClick(element()));

    expect(controller.getSnapshot().open).not.toBeNull();
  });
});

describe("createContextMenuOpenController — closing", () => {
  it("puts focus back on what opened it", () => {
    const { controller, listener } = setup();
    const trigger = element();
    controller.triggerHandlers(TARGET).onContextMenu(rightClick(trigger));
    const elsewhere = element();
    elsewhere.focus();
    controller.close();

    expect(controller.getSnapshot().open).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not notify when it is already closed", () => {
    const { controller, listener } = setup();
    controller.close();

    expect(listener).not.toHaveBeenCalled();
  });

  it("focuses nothing when the opener cannot take focus", () => {
    const { controller } = setup();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    document.body.append(svg);
    const trigger = element();
    trigger.focus();
    controller.triggerHandlers(TARGET).onContextMenu(rightClick(svg));
    controller.close();

    expect(document.activeElement).toBe(trigger);
  });

  it("forgets the opener once it has been restored", () => {
    const { controller } = setup();
    const trigger = element();
    controller.triggerHandlers(TARGET).onContextMenu(rightClick(trigger));
    controller.close();
    const elsewhere = element();
    elsewhere.focus();
    controller.close();

    expect(document.activeElement).toBe(elsewhere);
  });
});

describe("createContextMenuOpenController — lifecycle", () => {
  it("abandons a pending long press on teardown", () => {
    const { controller } = setup();
    const teardown = controller.connect();
    controller.triggerHandlers(TARGET).onPointerDown(touch(element()));
    teardown();
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops telling a listener once it unsubscribes", () => {
    const controller = createContextMenuOpenController<Row>({ enabled: true });
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    unsubscribe();
    controller.triggerHandlers(TARGET).onContextMenu(rightClick(element()));

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("createContextMenuOpenController — region handlers", () => {
  const ROWS: Record<string, Row> = { r1: { id: "r1" } };

  function table() {
    document.body.innerHTML = `
      <table>
        <thead>
          <tr>
            <th data-adapttable-part="header-cell" data-column-key="name">
              <span id="in-header">Name</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr data-adapttable-part="row" data-row-id="r1">
            <td data-adapttable-part="cell" data-column-key="name" tabindex="-1">
              <span id="in-cell">Ada</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p id="outside" tabindex="-1">outside</p>`;
    const byId = (id: string) => document.getElementById(id)!;
    return {
      header: byId("in-header"),
      cell: byId("in-cell"),
      outside: byId("outside"),
    };
  }

  function regionSetup() {
    const { controller, listener } = setup();
    const rowFor = vi.fn((id: string) => ROWS[id]);
    return { controller, listener, rowFor };
  }

  it("resolves a right-click to the cell it landed in", () => {
    const { controller, rowFor } = regionSetup();
    const { cell } = table();
    const preventDefault = vi.fn();
    controller.regionHandlers(rowFor).onContextMenu({
      target: cell,
      clientX: 5,
      clientY: 6,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().open).toEqual({
      target: { kind: "cell", row: ROWS.r1, rowId: "r1", columnKey: "name" },
      at: { x: 5, y: 6 },
    });
  });

  it("returns focus to the resolved cell, not to the region", () => {
    const { controller, rowFor } = regionSetup();
    const { cell, outside } = table();
    controller.regionHandlers(rowFor).onContextMenu({
      target: cell,
      clientX: 5,
      clientY: 6,
      preventDefault: vi.fn(),
    });
    outside.focus();
    controller.close();

    expect(document.activeElement).toBe(cell.parentElement);
  });

  it("ignores events with no menu behind them", () => {
    const { controller, listener, rowFor } = regionSetup();
    const { outside } = table();
    const handlers = controller.regionHandlers(rowFor);
    const preventDefault = vi.fn();
    handlers.onContextMenu({
      target: outside,
      clientX: 5,
      clientY: 6,
      preventDefault,
    });
    handlers.onContextMenu({
      target: null,
      clientX: 5,
      clientY: 6,
      preventDefault,
    });
    handlers.onKeyDown({
      target: outside,
      key: "ContextMenu",
      shiftKey: false,
      preventDefault,
    });
    handlers.onPointerDown({
      target: outside,
      pointerType: "touch",
      clientX: 5,
      clientY: 6,
    });
    vi.advanceTimersByTime(500);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("opens a header's menu from the keyboard at the header's corner", () => {
    const { controller, rowFor } = regionSetup();
    const { header } = table();
    const th = header.parentElement!;
    vi.spyOn(th, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 80,
      bottom: 24,
    } as DOMRect);
    controller.regionHandlers(rowFor).onKeyDown({
      target: header,
      key: "F10",
      shiftKey: true,
      preventDefault: vi.fn(),
    });

    expect(controller.getSnapshot().open).toEqual({
      target: { kind: "header", columnKey: "name" },
      at: { x: 40, y: 24 },
    });
  });

  it("checks the key before resolving any target", () => {
    const { controller, rowFor } = regionSetup();
    const { cell } = table();
    controller.regionHandlers(rowFor).onKeyDown({
      target: cell,
      key: "a",
      shiftKey: false,
      preventDefault: vi.fn(),
    });

    expect(rowFor).not.toHaveBeenCalled();
    expect(controller.getSnapshot().open).toBeNull();
  });

  it("opens on a long press anywhere in the region", () => {
    const { controller, rowFor } = regionSetup();
    const { cell } = table();
    controller.regionHandlers(rowFor).onPointerDown({
      target: cell,
      pointerType: "touch",
      clientX: 8,
      clientY: 9,
    });
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open?.target.kind).toBe("cell");
    expect(controller.getSnapshot().open?.at).toEqual({ x: 8, y: 9 });
  });

  it("abandons a region press that moves, lifts or is cancelled", () => {
    const { controller, rowFor } = regionSetup();
    const { cell } = table();
    const handlers = controller.regionHandlers(rowFor);
    const press = {
      target: cell,
      pointerType: "touch",
      clientX: 8,
      clientY: 9,
    };
    handlers.onPointerDown(press);
    handlers.onPointerMove({ clientX: 8, clientY: 60 });
    handlers.onPointerDown(press);
    handlers.onPointerUp();
    handlers.onPointerDown(press);
    handlers.onPointerCancel();
    vi.advanceTimersByTime(500);

    expect(controller.getSnapshot().open).toBeNull();
  });
});
