import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { bindMobileCardList, mobileCardListStyle } from "./mobileCardList";

describe("mobileCardListStyle", () => {
  it("is omitted when the list is not a scroll box", () => {
    expect(mobileCardListStyle(undefined)).toBeUndefined();
  });

  it("clips the list to maxHeight so the virtualizer can track it", () => {
    expect(mobileCardListStyle(380)).toEqual({
      maxHeight: 380,
      overflowY: "auto",
    });
  });
});

describe("bindMobileCardList", () => {
  it("forwards the node to the virtualizer and an extra callback", () => {
    const virtualScrollRef = vi.fn();
    const extra = vi.fn();
    const node = document.createElement("ul");
    bindMobileCardList(virtualScrollRef, extra)(node);
    expect(virtualScrollRef).toHaveBeenCalledWith(node);
    expect(extra).toHaveBeenCalledWith(node);
  });

  it("writes an object ref and tolerates a missing virtualizer ref", () => {
    const extra = createRef<HTMLElement | null>();
    const node = document.createElement("div");
    bindMobileCardList(undefined, extra)(node);
    expect(extra.current).toBe(node);
    bindMobileCardList(undefined, extra)(null);
    expect(extra.current).toBeNull();
  });
});
