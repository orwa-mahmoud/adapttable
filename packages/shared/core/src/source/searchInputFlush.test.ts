import { afterEach, describe, expect, it, vi } from "vitest";

import { commitSearchOnBlur } from "./searchInputFlush";

afterEach(() => {
  document.body.replaceChildren();
});

describe("commitSearchOnBlur", () => {
  it("commits once when the focused search box loses focus", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const commit = vi.fn();
    commitSearchOnBlur(commit);
    input.blur();
    input.focus();
    input.blur();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("commits nothing once disarmed", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const commit = vi.fn();
    const disarm = commitSearchOnBlur(commit);
    disarm();
    input.blur();
    expect(commit).not.toHaveBeenCalled();
  });

  it("arms nothing without a focused element", () => {
    (document.activeElement as HTMLElement | null)?.blur();
    const commit = vi.fn();
    const disarm = commitSearchOnBlur(commit);
    disarm();
    document.body.dispatchEvent(new FocusEvent("blur"));
    expect(commit).not.toHaveBeenCalled();
  });
});
