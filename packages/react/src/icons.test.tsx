import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExpandChevron, FiltersIcon, SearchIcon } from "./icons";

describe("chrome icons", () => {
  it("renders the funnel glyph", () => {
    const { container } = render(<FiltersIcon />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });

  it("renders the magnifier glyph with a circle and a path", () => {
    const { container } = render(<SearchIcon />);
    expect(container.querySelector("circle")).not.toBeNull();
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });

  it("rotates the expand chevron by open state and direction", () => {
    // Closed + LTR: points right, no rotation.
    const { container: closedLtr } = render(<ExpandChevron open={false} />);
    expect(closedLtr.querySelector("svg")?.getAttribute("style")).not.toContain(
      "rotate"
    );
    // Closed + RTL: mirror to point left.
    const { container: closedRtl } = render(
      <ExpandChevron open={false} dir="rtl" />
    );
    expect(closedRtl.querySelector("svg")?.getAttribute("style")).toContain(
      "rotate(180deg)"
    );
    // Open: points down.
    const { container: open } = render(<ExpandChevron open dir="ltr" />);
    expect(open.querySelector("svg")?.getAttribute("style")).toContain(
      "rotate(90deg)"
    );
  });
});
