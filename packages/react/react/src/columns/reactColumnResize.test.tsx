/** The themed resize hook names the same live keyboard control it adapts. */
import { columnResizeHandleProps } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toReactColumnResizeHandleProps } from "./reactColumnResize";

describe("toReactColumnResizeHandleProps", () => {
  it("names the actual resize button without changing its host width callback", () => {
    const setWidth = vi.fn();
    const original = columnResizeHandleProps(
      "budget",
      setWidth,
      "Resize budget"
    );
    const props = toReactColumnResizeHandleProps(original);
    render(
      <table>
        <thead>
          <tr>
            <th>
              <span {...props} />
            </th>
          </tr>
        </thead>
      </table>
    );
    const button = screen.getByRole("button", { name: "Resize budget" });
    const header = screen.getByRole("columnheader");
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 120, 30)
    );
    expect(button).toHaveAttribute("data-adapttable-part", "resize-handle");
    expect(button).toHaveAttribute("tabindex", "0");
    expect(original).not.toHaveProperty("data-adapttable-part");
    button.focus();
    fireEvent.keyDown(button, { key: "ArrowRight" });
    expect(setWidth).toHaveBeenCalledExactlyOnceWith("budget", 136);
    expect(button).toHaveFocus();
  });
});
