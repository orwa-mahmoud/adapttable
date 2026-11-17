import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `cellNavigation.options.test.ts` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function cellNavigationOptionsTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { cellNavigation, editHistory } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /** The kit's factories hand the host callbacks to the shared features. */
    describe(`host callbacks through the ${kit.name} factories`, () => {
      it("passes onRangeChange through cellNavigation", () => {
        const onRangeChange = vi.fn();
        expect(cellNavigation({ onRangeChange }).apply?.({})).toEqual({
          cellNavigation: true,
          onCellRangeChange: onRangeChange,
        });
        expect(cellNavigation().apply?.({})).toEqual({ cellNavigation: true });
      });

      it("passes onChange through editHistory", () => {
        const onChange = vi.fn();
        expect(editHistory({ onChange }).apply?.({})).toEqual({
          editHistory: { onChange },
        });
      });
    });
  });
}
