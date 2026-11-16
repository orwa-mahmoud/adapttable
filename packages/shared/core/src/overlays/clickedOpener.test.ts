import { describe, expect, it } from "vitest";

import { watchClickedOpener } from "./clickedOpener";

describe("watchClickedOpener", () => {
  it("returns the clicked button when focus is still on the document", () => {
    const button = document.createElement("button");
    document.body.append(button);
    const openers = watchClickedOpener(document);
    button.click();
    expect(openers.current()).toBe(button);
    openers.stop();
    button.remove();
  });

  it("returns the focused control ahead of an earlier click", () => {
    const button = document.createElement("button");
    const field = document.createElement("input");
    const panel = document.createElement("div");
    document.body.append(button, field);
    const openers = watchClickedOpener(document);
    button.click();
    field.focus();
    expect(openers.current(panel)).toBe(field);
    openers.stop();
    button.remove();
    field.remove();
  });

  it("ignores focus that sits inside the open panel", () => {
    const button = document.createElement("button");
    const panel = document.createElement("div");
    const inside = document.createElement("button");
    panel.append(inside);
    document.body.append(button, panel);
    const openers = watchClickedOpener(document);
    button.click();
    inside.focus();
    expect(openers.current(panel)).toBe(button);
    openers.stop();
    button.remove();
    panel.remove();
  });

  it("ignores a click that is not on a button", () => {
    const span = document.createElement("span");
    document.body.append(span);
    const openers = watchClickedOpener(document);
    span.click();
    expect(openers.current()).toBeNull();
    openers.stop();
    span.remove();
  });

  it("drops a clicked button that is no longer connected", () => {
    const button = document.createElement("button");
    document.body.append(button);
    const openers = watchClickedOpener(document);
    button.click();
    button.remove();
    expect(openers.current()).toBeNull();
    openers.stop();
  });

  it("ignores a click whose target is not an element", () => {
    const openers = watchClickedOpener(document);
    const event = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(event, "target", { get: () => "text" });
    document.body.dispatchEvent(event);
    expect(openers.current()).toBeNull();
    openers.stop();
  });

  it("stops listening after stop", () => {
    const button = document.createElement("button");
    document.body.append(button);
    const openers = watchClickedOpener(document);
    openers.stop();
    button.click();
    expect(openers.current()).toBeNull();
    button.remove();
  });
});
