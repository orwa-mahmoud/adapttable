import { defaultLabels } from "@adapttable/core";
import {
  fireEvent,
  render as renderChips,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Chips } from "./ActiveFilterChips";

const CHIP_LABEL = "Status: Active";
const REMOVE_NAME = defaultLabels.removeFilter(CHIP_LABEL);

describe("Chips", () => {
  it("gives each chip a named remove button in the tab order", () => {
    const onRemove = vi.fn();
    renderChips(
      <Chips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove }]}
        onClearAll={vi.fn()}
        labels={defaultLabels}
        classNames={{}}
      />
    );

    // `getByRole` searches the accessibility tree, so a control the kit
    // hides from assistive tech never turns up here.
    const remove = screen.getByRole("button", { name: REMOVE_NAME });
    expect(remove.tabIndex).toBe(0);

    remove.focus();
    expect(remove).toHaveFocus();

    fireEvent.keyDown(remove, { key: "Enter", code: "Enter" });
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalled();
  });
});
