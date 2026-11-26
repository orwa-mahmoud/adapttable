import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { expect } from "vitest";

/** The feature factories a kit publishes from their own entries. */
export interface VueEntryFactories {
  readonly columnMenu: unknown;
  readonly densityChooser: unknown;
  readonly editing: unknown;
  readonly exportCsv: unknown;
  readonly filters: unknown;
  readonly rowActions: unknown;
  readonly savedViews: unknown;
}

/** A Vue kit's entry points, as the shared entry suite reads them. */
export interface VueEntryKit {
  /** The kit's base entry. */
  readonly base: Readonly<Record<string, unknown>>;
  /** Each factory, imported from its own entry. */
  readonly factories: VueEntryFactories;
}

/**
 * The shared entry-point suite: each native factory is published from its
 * own entry, and the base entry carries no optional feature.
 *
 * @param kit - The kit's entry points.
 * @returns The tests, for the kit's runner to register.
 */
export function featuresEntryTests(
  kit: VueEntryKit
): readonly ConformanceTest[] {
  return collectConformanceTests(({ describe, it }) => {
    describe("native feature entries", () => {
      it("publishes each factory from its own entry", () => {
        for (const [name, factory] of Object.entries(kit.factories))
          expect(typeof factory, name).toBe("function");
      });
      it("leaves optional composition absent from the base entry", () => {
        expect(kit.base).not.toHaveProperty("filters");
        expect(kit.base).not.toHaveProperty("editing");
        expect(kit.base).not.toHaveProperty("savedViews");
        expect(kit.base).toHaveProperty("DataTable");
      });
    });
  });
}
