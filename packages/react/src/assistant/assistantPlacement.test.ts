/**
 * Where the floating window sits, and when it stops floating.
 *
 * These are the rules a host cannot see until the window is on someone
 * else's screen: a container-bound window that quietly fixed itself to the
 * viewport would escape the shell it was scoped to, and a floating window
 * that never gave way on a phone would cover the table it is talking about.
 */
import { describe, expect, it } from "vitest";

import {
  FLOATING_MIN_WIDTH,
  floatingFits,
  floatingStyle,
  launcherStyle,
} from "./assistantPlacement";

describe("floatingFits", () => {
  it("floats where a table and a window both fit", () => {
    expect(floatingFits(FLOATING_MIN_WIDTH)).toBe(true);
    expect(floatingFits(1440)).toBe(true);
  });

  it("gives way one pixel below the threshold", () => {
    expect(floatingFits(FLOATING_MIN_WIDTH - 1)).toBe(false);
    expect(floatingFits(390)).toBe(false);
  });
});

describe("floatingStyle", () => {
  it("fixes to the viewport by default", () => {
    expect(floatingStyle("viewport").position).toBe("fixed");
  });

  it("stays inside a container the host scoped it to", () => {
    // `absolute` is what keeps the window in the host's own shell; `fixed`
    // would ignore that container and sit over the whole page.
    expect(floatingStyle({ current: null }).position).toBe("absolute");
  });

  it("anchors to the inline end, so RTL moves it without a second rule", () => {
    const style = floatingStyle("viewport");
    expect(style.insetInlineEnd).toContain("24px");
    expect(style.insetBlockEnd).toContain("24px");
    expect(style).not.toHaveProperty("right");
  });

  it("gives back size rather than overflowing a short viewport", () => {
    const style = floatingStyle("viewport");
    // Both axes are a `min()` against the space available, so the intended
    // 400x560 is a ceiling and never a demand.
    expect(String(style.inlineSize)).toMatch(/^min\(400px,/);
    expect(String(style.blockSize)).toMatch(/^min\(560px,/);
  });

  it("sits above sticky headers without an arbitrary z-index", () => {
    expect(floatingStyle("viewport").zIndex).toBe(30);
  });

  it("leaves room for the safe area on a notched screen", () => {
    const style = floatingStyle("viewport");
    expect(String(style.insetBlockEnd)).toContain("safe-area-inset-bottom");
  });
});

describe("launcherStyle", () => {
  it("rests in the corner the window opens into", () => {
    const launcher = launcherStyle("viewport");
    const window = floatingStyle("viewport");
    expect(launcher.insetInlineEnd).toBe(window.insetInlineEnd);
    expect(launcher.insetBlockEnd).toBe(window.insetBlockEnd);
  });

  it("follows the window into a host's container", () => {
    expect(launcherStyle({ current: null }).position).toBe("absolute");
  });
});
