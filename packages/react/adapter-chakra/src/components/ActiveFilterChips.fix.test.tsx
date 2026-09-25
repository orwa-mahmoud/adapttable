import { defaultLabels } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderChakra } from "../test-utils";
import { Chips } from "./ActiveFilterChips";

const CHIP_LABEL = "Status: Active";

describe("Chips remove button", () => {
  it("sits inside the tag's end element, which gives it a size", () => {
    const onRemove = vi.fn();
    renderChakra(
      <Chips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove }]}
        onClearAll={vi.fn()}
        labels={defaultLabels}
      />
    );

    const remove = screen.getByRole("button", {
      name: defaultLabels.removeFilter(CHIP_LABEL),
    });
    expect(remove.parentElement).toHaveClass("chakra-tag__endElement");
    expect(remove.closest(".chakra-tag__root")).not.toBeNull();

    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("names the button with removeFilter, not clearAll", () => {
    renderChakra(
      <Chips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove: vi.fn() }]}
        onClearAll={vi.fn()}
        labels={defaultLabels}
      />
    );

    expect(
      screen.getByRole("button", { name: `Remove filter: ${CHIP_LABEL}` })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `${defaultLabels.clearAll}: ${CHIP_LABEL}`,
      })
    ).toBeNull();
  });
});
