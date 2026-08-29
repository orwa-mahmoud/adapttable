/**
 * The chevron's footprint, on a row that has no chevron.
 *
 * A footer or a "show more" row would start one control's width left of its
 * header without this, so what this covers is that the spacer is there, inert,
 * and the size of a toggle.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GroupToggleSpacer } from "./GroupToggleSpacer";

describe("GroupToggleSpacer", () => {
  it("reserves a toggle's width without being a control", () => {
    render(<GroupToggleSpacer />);
    const spacer = document.querySelector<HTMLElement>(
      '[data-adapttable-part="group-toggle-spacer"]'
    );
    expect(spacer).not.toBeNull();
    expect(spacer).toHaveAttribute("aria-hidden", "true");
    expect(spacer?.style.width).toBe("1.5em");
  });
});
