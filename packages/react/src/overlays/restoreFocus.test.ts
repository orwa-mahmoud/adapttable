/**
 * What restoration will and will not take.
 *
 * Tested here rather than through a kit's overlay: a real panel runs its own
 * focus handling as it closes, so the two cases race and the test measures
 * the library instead of this rule.
 */
import { describe, expect, it } from "vitest";

import { focusWasDropped, restoreFocusSoon } from "./restoreFocus";

const frames = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)));
  });

function scene() {
  const shell = document.createElement("div");
  shell.tabIndex = -1;
  const trigger = document.createElement("button");
  const elsewhere = document.createElement("button");
  shell.append(trigger);
  document.body.append(shell, elsewhere);
  return {
    shell,
    trigger,
    elsewhere,
    cleanup: () => {
      shell.remove();
      elsewhere.remove();
    },
  };
}

describe("focusWasDropped", () => {
  it("counts the document body as dropped", () => {
    const { trigger, cleanup } = scene();
    document.body.focus();
    expect(focusWasDropped(trigger)).toBe(true);
    cleanup();
  });

  it("counts a container still holding the trigger as dropped", () => {
    const { shell, trigger, cleanup } = scene();
    shell.focus();
    expect(focusWasDropped(trigger)).toBe(true);
    cleanup();
  });

  it("does not count another control as dropped", () => {
    const { trigger, elsewhere, cleanup } = scene();
    elsewhere.focus();
    expect(focusWasDropped(trigger)).toBe(false);
    cleanup();
  });

  it("does not count the trigger itself as dropped", () => {
    const { trigger, cleanup } = scene();
    trigger.focus();
    expect(focusWasDropped(trigger)).toBe(false);
    cleanup();
  });
});

describe("restoreFocusSoon", () => {
  it("focuses the trigger a frame later", async () => {
    const { trigger, cleanup } = scene();
    restoreFocusSoon(trigger);
    await frames();
    expect(document.activeElement).toBe(trigger);
    cleanup();
  });

  it("reclaims focus a focus scope parked on a container", async () => {
    const { shell, trigger, cleanup } = scene();
    restoreFocusSoon(trigger);
    shell.focus();
    await frames();
    expect(document.activeElement).toBe(trigger);
    cleanup();
  });

  it("leaves focus that was deliberately moved elsewhere", async () => {
    const { trigger, elsewhere, cleanup } = scene();
    restoreFocusSoon(trigger);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    // The first frame has restored; the reader then moves on.
    elsewhere.focus();
    await frames();
    expect(document.activeElement).toBe(elsewhere);
    cleanup();
  });

  it("never focuses a trigger that has been removed", async () => {
    const { trigger, cleanup } = scene();
    restoreFocusSoon(trigger);
    trigger.remove();
    await frames();
    expect(document.activeElement).not.toBe(trigger);
    cleanup();
  });

  it("can be cancelled before it runs", async () => {
    const { trigger, elsewhere, cleanup } = scene();
    elsewhere.focus();
    const cancel = restoreFocusSoon(trigger);
    cancel();
    await frames();
    expect(document.activeElement).toBe(elsewhere);
    cleanup();
  });

  it("does nothing without a trigger", () => {
    expect(() => restoreFocusSoon(null)()).not.toThrow();
  });
});
