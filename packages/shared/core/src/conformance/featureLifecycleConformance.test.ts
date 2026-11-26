import { describe, expect, it } from "vitest";

import { createFeatureMounts } from "../features/featureMounts";
import { resolveFeatureIds } from "../features/featurePatch";
import {
  featureLifecycleConformanceTests,
  type FeatureLifecycleDriver,
  type LifecycleDeclaration,
  type LifecycleObservation,
} from "./featureLifecycleConformance";

interface MemoryFeature extends LifecycleDeclaration {
  readonly mount: () => void;
}

/**
 * A table built on core's own lifecycle: duplicate ids resolved once,
 * registrations read from the winning declarations, resources kept by
 * {@link createFeatureMounts}. Disposing an outer table disposes the nested
 * one.
 */
function createObservation(
  linked: LifecycleObservation[] = []
): LifecycleObservation {
  const mountCount = new Map<string, number>();
  const cleanupCount = new Map<string, number>();
  const latest = new Map<string, () => MemoryFeature>();
  let composed: readonly MemoryFeature[] = [];
  let revisions = 0;
  let disposed = false;
  const bump = (map: Map<string, number>, id: string): void => {
    map.set(id, (map.get(id) ?? 0) + 1);
  };
  const mounts = createFeatureMounts<MemoryFeature>((id, current) => {
    if (current().fail) throw new Error(`${id} failed`);
    bump(mountCount, id);
    latest.set(id, current);
    return () => {
      bump(cleanupCount, id);
    };
  });
  const declarations = new WeakMap<LifecycleDeclaration, MemoryFeature>();
  const declare = (spec: LifecycleDeclaration): MemoryFeature => {
    const known = declarations.get(spec);
    if (known) return known;
    const created = { ...spec, mount: () => undefined };
    declarations.set(spec, created);
    return created;
  };
  return {
    reconcile(features) {
      const next = resolveFeatureIds(features.map(declare));
      const changed =
        next.length !== composed.length ||
        next.some((feature, index) => feature !== composed[index]);
      if (!changed) return Promise.resolve();
      try {
        mounts.reconcile(next);
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error))
        );
      }
      const sameIds =
        next.length === composed.length &&
        next.every((feature) => composed.some((c) => c.id === feature.id));
      composed = next;
      if (!sameIds) revisions += 1;
      return Promise.resolve();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      mounts.dispose();
      for (const inner of linked) await inner.dispose();
    },
    commands: () =>
      composed.flatMap((feature) =>
        feature.command == null ? [] : [feature.command]
      ),
    mounts: (id) => mountCount.get(id) ?? 0,
    cleanups: (id) => cleanupCount.get(id) ?? 0,
    currentOption: (id) => latest.get(id)?.().option,
    hostPublications: () => 1,
    revisionNotifications: () => revisions,
  };
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
