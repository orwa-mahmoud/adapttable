import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EyeIcon, GripIcon, PinIcon } from "./icons";

describe("column-menu icons", () => {
  it("renders the grip and pin glyphs", () => {
    const { container } = render(
      <>
        <GripIcon />
        <PinIcon />
      </>
    );
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });

  it("renders the eye glyph and adds a slash when off", () => {
    const { container: on } = render(<EyeIcon />);
    expect(on.querySelectorAll("path")).toHaveLength(1);
    const { container: off } = render(<EyeIcon off />);
    expect(off.querySelectorAll("path")).toHaveLength(2);
  });
});
