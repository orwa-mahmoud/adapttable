import { describe, expect, it } from "vitest";

import { isRtlElement } from "./writingDirection";

describe("isRtlElement", () => {
  it("is false for a missing node", () => {
    expect(isRtlElement(null)).toBe(false);
  });

  it("reads an explicit dir=rtl ancestor", () => {
    const root = document.createElement("div");
    root.setAttribute("dir", "rtl");
    const grip = document.createElement("button");
    root.append(grip);
    expect(isRtlElement(grip)).toBe(true);
  });

  it("reads an explicit dir=ltr ancestor", () => {
    const root = document.createElement("div");
    root.setAttribute("dir", "ltr");
    const grip = document.createElement("button");
    root.append(grip);
    expect(isRtlElement(grip)).toBe(false);
  });

  it("skips a Radix ScrollArea dir=ltr so the table's rtl wins", () => {
    const table = document.createElement("div");
    table.setAttribute("dir", "rtl");
    table.className = "rt-TableRoot";
    const scroll = document.createElement("div");
    scroll.setAttribute("dir", "ltr");
    scroll.className = "rt-ScrollAreaRoot";
    const viewport = document.createElement("div");
    viewport.setAttribute("dir", "ltr");
    viewport.className = "rt-ScrollAreaViewport";
    const grip = document.createElement("button");
    viewport.append(grip);
    scroll.append(viewport);
    table.append(scroll);
    expect(isRtlElement(grip)).toBe(true);
  });
});
