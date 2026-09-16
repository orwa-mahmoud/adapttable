/**
 * The two close handlers this kit's overlays hand to Base UI.
 *
 * Driven directly rather than through a real popover: both answer a focus
 * event, and whether jsdom delivers one at all varies with how loaded the
 * machine is — which left the branches behind them covered on some runs and
 * uncovered on others, with the package's floor riding on the difference.
 */
import { describe, expect, it, vi } from "vitest";

import {
  headerFilterOpenChange,
  rowMoveMenuOpenChange,
} from "./components/kitControls";

const details = (reason: string) => ({ reason, cancel: vi.fn() });

describe("a header filter's popover", () => {
  it("holds itself open when its own field takes the focus", () => {
    for (const reason of ["focus-out", "outside-press"]) {
      const setOpen = vi.fn();
      const event = details(reason);
      headerFilterOpenChange(setOpen)(false, event);
      expect(event.cancel).toHaveBeenCalledOnce();
      expect(setOpen).not.toHaveBeenCalled();
    }
  });

  it("closes on a reason that means the reader is done", () => {
    const setOpen = vi.fn();
    const event = details("escape-key");
    headerFilterOpenChange(setOpen)(false, event);
    expect(event.cancel).not.toHaveBeenCalled();
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("never holds an opening", () => {
    const setOpen = vi.fn();
    const event = details("focus-out");
    headerFilterOpenChange(setOpen)(true, event);
    expect(event.cancel).not.toHaveBeenCalled();
    expect(setOpen).toHaveBeenCalledWith(true);
  });
});

describe("a row-move menu", () => {
  const wiring = (confirmation?: { onCancel: () => void }) => ({
    setOpen: vi.fn(),
    confirming: () => confirmation,
    restoreTriggerFocus: vi.fn(),
  });

  it("stays open while a confirmation is standing in it", () => {
    for (const reason of ["focus-out", "item-press"]) {
      const onCancel = vi.fn();
      const w = wiring({ onCancel });
      const event = details(reason);
      rowMoveMenuOpenChange(w)(false, event);
      expect(event.cancel).toHaveBeenCalledOnce();
      // The question is still on screen, so it was neither answered nor
      // withdrawn and focus has not moved.
      expect(onCancel).not.toHaveBeenCalled();
      expect(w.setOpen).not.toHaveBeenCalled();
      expect(w.restoreTriggerFocus).not.toHaveBeenCalled();
    }
  });

  it("withdraws the question and restores focus on a close that gets through", () => {
    const onCancel = vi.fn();
    const w = wiring({ onCancel });
    const event = details("escape-key");
    rowMoveMenuOpenChange(w)(false, event);
    expect(event.cancel).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(w.restoreTriggerFocus).toHaveBeenCalledOnce();
    expect(w.setOpen).toHaveBeenCalledWith(false);
  });

  it("closes like any menu when there is nothing to confirm", () => {
    const w = wiring();
    const event = details("item-press");
    rowMoveMenuOpenChange(w)(false, event);
    expect(event.cancel).not.toHaveBeenCalled();
    expect(w.restoreTriggerFocus).toHaveBeenCalledOnce();
    expect(w.setOpen).toHaveBeenCalledWith(false);
  });

  it("opens without touching the confirmation", () => {
    const onCancel = vi.fn();
    const w = wiring({ onCancel });
    const event = details("trigger-press");
    rowMoveMenuOpenChange(w)(true, event);
    expect(onCancel).not.toHaveBeenCalled();
    expect(w.setOpen).toHaveBeenCalledWith(true);
  });
});
