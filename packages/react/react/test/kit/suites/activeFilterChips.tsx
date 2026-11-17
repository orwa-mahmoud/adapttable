import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { defaultLabels } from "@adapttable/react/adapter";
import { act, fireEvent, screen } from "@testing-library/react";
import { expect, vi } from "vitest";

import { kitComponent, type ReactKitUnderTest } from "../kit";

/**
 * The shared `ActiveFilterChips.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function activeFilterChipsTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { render } = kit;
  const Chips = kitComponent(kit, "Chips");
  return collectConformanceTests(({ describe, it }) => {
    const CHIP_LABEL = "Status: Active";
    const REMOVE_NAME = defaultLabels.removeFilter(CHIP_LABEL);

    describe("Chips", () => {
      it("gives each chip a named remove button in the tab order", () => {
        const onRemove = vi.fn();
        render(
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

        act(() => remove.focus());
        expect(remove).toHaveFocus();

        fireEvent.keyDown(remove, { key: "Enter", code: "Enter" });
        fireEvent.click(remove);
        expect(onRemove).toHaveBeenCalled();
      });
    });
  });
}
