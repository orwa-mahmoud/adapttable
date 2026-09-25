import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMountStagger } from "./animation/useMountStagger";

function StaggerHarness({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useMountStagger(ref, [], { enabled });
  return (
    <div ref={ref}>
      <span data-stagger="">a</span>
      <span data-stagger="">b</span>
    </div>
  );
}

describe("useMountStagger", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("animates data-stagger items when enabled", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    act(() => {
      render(<StaggerHarness enabled />);
    });
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("does nothing when disabled", () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    act(() => {
      render(<StaggerHarness enabled={false} />);
    });
    expect(animate).not.toHaveBeenCalled();
  });

  it("does nothing when the Web Animations API is unavailable", () => {
    act(() => {
      render(<StaggerHarness enabled />);
    });
    expect(
      (Element.prototype as { animate?: unknown }).animate
    ).toBeUndefined();
  });
});
