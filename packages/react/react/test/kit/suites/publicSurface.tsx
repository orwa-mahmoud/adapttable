import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type SelectionStats } from "@adapttable/react/adapter";
import { expect } from "vitest";

import { kitComponent, type ReactKitUnderTest } from "../kit";

/**
 * The shared `publicSurface.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function publicSurfaceTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { render } = kit;
  const SelectionStatsBar = kitComponent(kit, "SelectionStatsBar");
  const agentApproval = kitComponent(kit, "agentApproval");
  return collectConformanceTests(({ describe, it }) => {
    /**
     * Two public exports nothing inside the kit mounts.
     *
     * `SelectionStatsBar` is a strip a host drops next to its own status bar, and
     * `agentApproval()` is the feature that binds this kit's approval strip to the
     * agent slot. Neither is reached by any other test in the package, so a broken
     * export here would ship silently.
     */

    const STATS: SelectionStats = {
      cells: 4,
      numeric: 3,
      sum: 60,
      average: 20,
      min: 10,
      max: 30,
    };

    const part = (name: string) =>
      document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

    describe(`selection stats strip (${kit.name})`, () => {
      it("reports every figure the selection produced", () => {
        render(<SelectionStatsBar stats={STATS} locale="en-US" />);

        const strip = part("selection-stats");
        expect(strip).not.toBeNull();
        const text = strip?.textContent ?? "";
        expect(text).toContain("60");
        expect(text).toContain("20");
        expect(text).toContain("10");
        expect(text).toContain("30");
      });

      it("says nothing at all when nothing is selected", () => {
        render(<SelectionStatsBar stats={null} />);

        expect(part("selection-stats")).toBeNull();
      });

      it("drops the numeric figures when the selection holds no numbers", () => {
        render(
          <SelectionStatsBar
            stats={{
              cells: 2,
              numeric: 0,
              sum: null,
              average: null,
              min: null,
              max: null,
            }}
          />
        );

        expect(
          document.querySelectorAll('[data-adapttable-part="selection-stat"]')
        ).toHaveLength(1);
      });
    });

    describe(`agent approval feature (${kit.name})`, () => {
      it("binds this kit's approval strip to the agent slot", () => {
        const feature = agentApproval();

        expect(feature.id).toBe("agent-approval");
      });
    });
  });
}
