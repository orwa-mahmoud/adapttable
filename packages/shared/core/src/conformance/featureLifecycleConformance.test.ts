import { describe, expect, it } from "vitest";

import {
  featureLifecycleConformanceTests,
  type FeatureLifecycleDriver,
  type LifecycleDeclaration,
  type LifecycleObservation,
} from "./featureLifecycleConformance";

/**
 * A table that follows the registration contract the cases describe:
 * the last id wins, a repeated or reordered list does not mount again,
 * a failed feature rolls back alone, and disposing an outer table
 * disposes the nested one once.
 */
function createObservation(
  linked: LifecycleObservation[] = []
): LifecycleObservation {
  const setups = new Map<string, number>();
  const cleanups = new Map<string, number>();
  let mounted: LifecycleDeclaration[] = [];
  let disposed = false;
  const publications = 1;
  let revisions = 0;

  const bump = (map: Map<string, number>, id: string): void => {
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  const observation: LifecycleObservation = {
    reconcile(features) {
      const byId = new Map<string, LifecycleDeclaration>();
      for (const feature of features) byId.set(feature.id, feature);
      const next = [...byId.values()];
      const same =
        next.length === mounted.length &&
        next.every((feature) =>
          mounted.some(
            (current) =>
              current.id === feature.id && current.command === feature.command
          )
        );
      if (same) return Promise.resolve();
      const failing = next.find((feature) => feature.fail);
      for (const feature of next) {
        if (mounted.some((current) => current.id === feature.id)) continue;
        bump(setups, feature.id);
        if (feature === failing) {
          bump(cleanups, feature.id);
          throw new Error(`${feature.id} failed`);
        }
      }
      mounted = next.filter((feature) => feature !== failing);
      revisions += 1;
      return Promise.resolve();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      for (const feature of mounted) bump(cleanups, feature.id);
      mounted = [];
      for (const inner of linked) await inner.dispose();
    },
    commands: () =>
      mounted.flatMap((feature) =>
        feature.command == null ? [] : [feature.command]
      ),
    setups: (id) => setups.get(id) ?? 0,
    cleanups: (id) => cleanups.get(id) ?? 0,
    hostPublications: () => publications,
    revisionNotifications: () => revisions,
  };
  return observation;
}

const driver: FeatureLifecycleDriver = {
  name: "memory",
  open: () => Promise.resolve(createObservation()),
  openNested() {
    const inner = createObservation();
    const outer = createObservation([inner]);
    return Promise.resolve({ outer, inner });
  },
};

describe("featureLifecycleConformanceTests", () => {
  it.each(featureLifecycleConformanceTests(driver, { expect }))(
    "$name",
    async (testCase) => {
      await testCase.run();
    }
  );
});
