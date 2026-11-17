import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { expect } from "vitest";

/** The feature factories a kit's combined entry re-exports. */
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
  /** The kit's combined `features` entry. */
  readonly combined: Readonly<Record<string, unknown>>;
  /** The kit's base entry. */
  readonly base: Readonly<Record<string, unknown>>;
  /** Each factory, imported from its own entry. */
  readonly factories: VueEntryFactories;
}

/**
 * The shared entry-point suite: a kit's combined feature entry re-exports
 * the native factories, and the base entry carries no optional feature.
 *
 * @param kit - The kit's entry points.
 * @returns The tests, for the kit's runner to register.
 */
export function featuresEntryTests(
  kit: VueEntryKit
): readonly ConformanceTest[] {
  return collectConformanceTests(({ describe, it }) => {
    describe("combined native feature entry", () => {
      it("retains canonical factory identity across individual imports", () => {
        for (const [name, factory] of Object.entries(kit.factories))
          expect(kit.combined[name], name).toBe(factory);
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
