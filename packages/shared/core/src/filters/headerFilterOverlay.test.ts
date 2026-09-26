/**
 * The header-filter overlay model: the complete-write rule, the dismissing
 * source wrapper, the inside selector, outside-press dismissal, and the
 * session's open state with and without a shared host.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExtraFilters } from "../columnModel";
import {
  bindHeaderFilterDismiss,
  createHeaderFilterOverlay,
  HEADER_FILTER_SESSION_ATTR,
  headerFilterFieldIsComplete,
  headerFilterInsideSelector,
  type HeaderFilterOpenHost,
  isHeaderFilterOpen,
  watchOverlayDismiss,
} from "./headerFilterOverlay";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("headerFilterFieldIsComplete", () => {
  it("completes a select or boolean with a value", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "status", type: "select" },
        { status: "on" }
      )
    ).toBe(true);
    expect(
      headerFilterFieldIsComplete({ key: "status", type: "select" }, {})
    ).toBe(false);
    expect(
      headerFilterFieldIsComplete(
        { key: "remote", type: "boolean" },
        { remote: "" }
      )
    ).toBe(false);
  });

  it("completes text and date ranges only on a valueless operator", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "name", type: "text" },
        { nameOp: "empty" }
      )
    ).toBe(true);
    expect(
      headerFilterFieldIsComplete(
        { key: "name", type: "text" },
        { name: "Ada", nameOp: "contains" }
      )
    ).toBe(false);
    expect(
      headerFilterFieldIsComplete(
        { key: "hired", type: "dateRange" },
        { hiredOp: "empty" }
      )
    ).toBe(true);
    expect(
      headerFilterFieldIsComplete({ key: "hired", type: "dateRange" }, {})
    ).toBe(false);
  });

  it("never completes any other kind", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "tags", type: "multiSelect" },
        { tags: ["a"] }
      )
    ).toBe(false);
  });
});

describe("bindHeaderFilterDismiss", () => {
  const writes = () => {
    const source = {
      extra: {} as ExtraFilters,
      setExtra: vi.fn(),
      setExtras: vi.fn(),
    };
    return source;
  };

  it("leaves the source alone unless closeOnSelect is on", () => {
    const source = writes();
    expect(
      bindHeaderFilterDismiss(source, {
        def: { key: "status", type: "select" },
        dismiss: vi.fn(),
      })
    ).toBe(source);
  });

  it("dismisses after a complete write, in a microtask", async () => {
    const source = writes();
    const dismiss = vi.fn();
    const bound = bindHeaderFilterDismiss(source, {
      def: { key: "status", type: "select" },
      closeOnSelect: true,
      dismiss,
    });
    bound.setExtra("status", "on");
    expect(source.setExtra).toHaveBeenCalledWith("status", "on");
    expect(dismiss).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(dismiss).toHaveBeenCalledTimes(1);
    bound.setExtras({ status: "off" });
    expect(source.setExtras).toHaveBeenCalledWith({ status: "off" });
    await Promise.resolve();
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it("stays open after an incomplete write", async () => {
    const dismiss = vi.fn();
    const bound = bindHeaderFilterDismiss(writes(), {
      def: { key: "name", type: "text" },
      closeOnSelect: true,
      dismiss,
    });
    bound.setExtras({ nameOp: "contains" });
    await Promise.resolve();
    expect(dismiss).not.toHaveBeenCalled();
  });
});

describe("headerFilterInsideSelector", () => {
  it("scopes to one session without a shared host", () => {
    expect(
      headerFilterInsideSelector({ sessionId: "s1", sharedHost: false })
    ).toBe(`[${HEADER_FILTER_SESSION_ATTR}="s1"]`);
  });

  it("treats every session and filter header cell as inside with a host", () => {
    expect(
      headerFilterInsideSelector({
        sessionId: "s1",
        sharedHost: true,
        nestedSelector: ".kit-dropdown",
      })
    ).toBe(
      `[${HEADER_FILTER_SESSION_ATTR}],[data-adapttable-part="filter-header-cell"],.kit-dropdown`
    );
  });
});

describe("watchOverlayDismiss", () => {
  const mount = () => {
    const overlay = document.createElement("div");
    overlay.setAttribute(HEADER_FILTER_SESSION_ATTR, "s1");
    const select = document.createElement("select");
    overlay.append(select);
    const outside = document.createElement("button");
    document.body.append(overlay, outside);
    return { overlay, select, outside };
  };
  const selector = `[${HEADER_FILTER_SESSION_ATTR}="s1"]`;

  it("ignores presses until armed, then dismisses on an outside press", async () => {
    const { outside } = mount();
    const dismiss = vi.fn();
    const stop = watchOverlayDismiss(document, selector, dismiss);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();
    await Promise.resolve();
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    outside.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(dismiss).toHaveBeenCalledTimes(2);
    stop();
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it("does not treat a press inside, or with its select focused, as outside", async () => {
    const { overlay, select } = mount();
    const dismiss = vi.fn();
    const stop = watchOverlayDismiss(document, selector, dismiss);
    await Promise.resolve();
    overlay.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    select.focus();
    document.dispatchEvent(new MouseEvent("mousedown"));
    expect(dismiss).not.toHaveBeenCalled();
    stop();
  });

  it("dismisses on Escape only", () => {
    mount();
    const dismiss = vi.fn();
    const stop = watchOverlayDismiss(document, selector, dismiss);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("createHeaderFilterOverlay", () => {
  it("opens, closes and resets on its own", () => {
    const overlay = createHeaderFilterOverlay({ key: "status" });
    const listener = vi.fn();
    const stop = overlay.subscribe(listener);
    overlay.setOpen(true);
    expect(overlay.getSnapshot()).toEqual({ localOpen: true, resetKey: 0 });
    overlay.setOpen(true);
    expect(listener).toHaveBeenCalledTimes(1);
    overlay.dismiss();
    expect(overlay.getSnapshot()).toEqual({ localOpen: false, resetKey: 1 });
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    overlay.setOpen(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("opens and closes through a shared host", () => {
    const host: HeaderFilterOpenHost = { openKey: null, setOpenKey: vi.fn() };
    const overlay = createHeaderFilterOverlay({ key: "status", host });
    overlay.setOpen(true);
    expect(host.setOpenKey).toHaveBeenLastCalledWith("status");
    overlay.setOpen(false);
    expect(host.setOpenKey).toHaveBeenLastCalledWith(null);
    expect(overlay.getSnapshot().localOpen).toBe(false);
    overlay.configure({ key: "team", host });
    overlay.dismiss();
    expect(host.setOpenKey).toHaveBeenLastCalledWith(null);
    expect(overlay.getSnapshot()).toEqual({ localOpen: false, resetKey: 1 });
  });

  it("reads the open state from the host when there is one", () => {
    const host: HeaderFilterOpenHost = {
      openKey: "status",
      setOpenKey: vi.fn(),
    };
    expect(isHeaderFilterOpen(host, "status", false)).toBe(true);
    expect(isHeaderFilterOpen(host, "team", true)).toBe(false);
    expect(isHeaderFilterOpen(null, "team", true)).toBe(true);
    expect(isHeaderFilterOpen(undefined, "team", false)).toBe(false);
  });
});
