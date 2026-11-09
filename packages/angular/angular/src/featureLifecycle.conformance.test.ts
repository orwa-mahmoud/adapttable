import {
  featureLifecycleConformanceTests,
  type FeatureLifecycleDriver,
  type LifecycleDeclaration,
  type LifecycleObservation,
} from "@adapttable/core/conformance";
import {
  DestroyRef,
  ErrorHandler,
  Injector,
  runInInjectionContext,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { type AdaptTableFeature, featureHostFor } from "./featureHost";
import { injectFrontendData } from "./source/frontendData";

function openTable(parent: Injector): LifecycleObservation {
  const injector = Injector.create({
    providers: [
      {
        provide: ErrorHandler,
        useValue: {
          handleError(error: unknown): void {
            if (error instanceof Error) return;
          },
        },
      },
    ],
    parent,
  });
  const features = signal<readonly AdaptTableFeature[]>([]);
  const setups = new Map<string, number>();
  const cleanups = new Map<string, number>();
  let publications = 0;
  let revisions = 0;
  let seen: object | undefined;
  const source = runInInjectionContext(injector, () =>
    injectFrontendData<{ id: string }>({
      data: [{ id: "1" }],
      urlSync: false,
      injector,
    })
  );
  source().tableEngine?.subscribe("all", () => {
    revisions += 1;
  });
  const host = runInInjectionContext(injector, () =>
    featureHostFor(injector, features)
  );
  let disposed = false;
  let published = host();
  if (published !== seen) {
    seen = published;
    publications += 1;
  }
  const featuresFor = new WeakMap<LifecycleDeclaration, AdaptTableFeature>();
  const declare = (spec: LifecycleDeclaration): AdaptTableFeature => {
    const existing = featuresFor.get(spec);
    if (existing) return existing;
    const created: AdaptTableFeature = {
      id: spec.id,
      setup: (registry) => {
        setups.set(spec.id, (setups.get(spec.id) ?? 0) + 1);
        if (spec.command)
          registry.registerCommand({
            key: spec.command,
            label: spec.command,
            onSelect: () => undefined,
          });
        registry.onDispose(() => {
          cleanups.set(spec.id, (cleanups.get(spec.id) ?? 0) + 1);
        });
        if (spec.fail) throw new Error(`mount ${spec.id}`);
      },
    };
    featuresFor.set(spec, created);
    return created;
  };
  const observation: LifecycleObservation = {
    reconcile(list) {
      features.set(list.map(declare));
      let thrown: unknown;
      try {
        const current = host();
        if (current !== seen) {
          seen = current;
          publications += 1;
        }
        published = current;
      } catch (error) {
        thrown = error;
      }
      try {
        TestBed.tick();
      } catch (error) {
        thrown ??= error;
      }
      if (thrown instanceof Error) return Promise.reject(thrown);
      return Promise.resolve();
    },
    dispose() {
      if (disposed) return Promise.resolve();
      disposed = true;
      injector.destroy();
      return Promise.resolve();
    },
    commands: () => published.commands.map((command) => command.key),
    setups: (id) => setups.get(id) ?? 0,
    cleanups: (id) => cleanups.get(id) ?? 0,
    hostPublications: () => publications,
    revisionNotifications: () => revisions,
  };
  injector.get(DestroyRef).onDestroy(() => {
    disposed = true;
  });
  return observation;
}

const driver: FeatureLifecycleDriver = {
  name: "angular",
  open() {
    return Promise.resolve(openTable(TestBed.inject(Injector)));
  },
  openNested() {
    const outerInjector = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const outer = openTable(outerInjector);
    const inner = openTable(outerInjector);
    const disposeOuter = outer.dispose;
    outer.dispose = async () => {
      await disposeOuter();
      await inner.dispose();
    };
    return Promise.resolve({ outer, inner });
  },
};

describe("angular feature registration conformance", () => {
  for (const test of featureLifecycleConformanceTests(driver, { expect }))
    it(test.name, test.run);
});
