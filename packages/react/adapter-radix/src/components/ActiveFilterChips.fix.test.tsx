import { defaultLabels } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderRadix } from "../test-utils";
import { Chips } from "./ActiveFilterChips";

const CHIP_LABEL = "Status: Active";

describe("Chips remove button label", () => {
  it("names each remove button with removeFilter, not clearAll", () => {
    const onRemove = vi.fn();
    renderRadix(
      <Chips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove }]}
        onClearAll={vi.fn()}
        labels={defaultLabels}
      />
    );

    const remove = screen.getByRole("button", {
      name: `Remove filter: ${CHIP_LABEL}`,
    });
    expect(
      screen.queryByRole("button", {
        name: `${defaultLabels.clearAll}: ${CHIP_LABEL}`,
      })
    ).toBeNull();

    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("follows a translated removeFilter label", () => {
    renderRadix(
      <Chips
        chips={[{ key: "k", label: CHIP_LABEL, onRemove: vi.fn() }]}
        onClearAll={vi.fn()}
        labels={{ ...defaultLabels, removeFilter: (l) => `Quitar: ${l}` }}
      />
    );

    expect(
      screen.getByRole("button", { name: `Quitar: ${CHIP_LABEL}` })
    ).toBeInTheDocument();
  });
});
