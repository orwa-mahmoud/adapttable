import { afterEach, describe, expect, it, vi } from "vitest";

import { staggerMounted } from "./mountStagger";

function host(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML =
    '<span data-stagger="">a</span><span data-stagger="">b</span>';
  return root;
}

describe("staggerMounted", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("animates data-stagger items when enabled", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    staggerMounted({
      root: host(),
      enabled: true,
      reduced: false,
      rows: 2,
      mobile: false,
    });
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[1]?.[1]).toMatchObject({ delay: 40 });
  });

  it("does nothing when disabled", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    staggerMounted({
      root: host(),
      enabled: false,
      reduced: false,
      rows: 2,
      mobile: false,
    });
    expect(animate).not.toHaveBeenCalled();
  });

  it("does nothing when the reader prefers reduced motion", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    staggerMounted({
      root: host(),
      enabled: true,
      reduced: true,
      rows: 2,
      mobile: true,
    });
    expect(animate).not.toHaveBeenCalled();
  });
});
