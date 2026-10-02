/** A table's generic feature lifecycle, independent of optional features. */
import type { TableRuntime } from "@adapttable/core";
import { orderedContributions } from "@adapttable/core/binding";
import {
  ApplicationRef,
  ChangeDetectorRef,
  DestroyRef,
  effect,
  Injector,
  isSignal,
  runInInjectionContext,
  untracked,
} from "@angular/core";

import type { AdaptTableFeature } from "./featureHost";
import { ADAPTTABLE_FEATURE_STATE, type FeatureState } from "./featureState";
import { type MaybeSignal, readMaybe } from "./store";

/**
 * One mounted feature's access to its table. Framework-neutral runtime reads
 * and per-table state keep optional features out of the binding's root graph.
 *
 * @public
 */
export interface FeatureMountContext {
  /** The current rendered table and its live operations. */
  readonly runtime: TableRuntime;
  /** Injection scope shared with the feature's state channel. */
  readonly injector: Injector;
  /** Typed state published to this table's slots. */
  readonly state: FeatureState;
  /** Run a mutation and synchronously commit its Angular host updates. */
  flush<T>(run: () => T): T;
  /** Commit pending host inputs before a reader takes an admission snapshot. */
  flushAdmission(): void;
}

/**
 * Mount a table's optional features after its runtime has been assembled.
 * The returned cleanup is idempotent and also runs when the table is destroyed.
 * Every cleanup runs even if another fails; failures are reported together.
 *
 * @public
 */
function mountFeaturesOnce<TRow>(
  features: readonly AdaptTableFeature[],
  options: {
    readonly runtime: TableRuntime<TRow>;
    readonly state: FeatureState;
    readonly injector: Injector;
  }
): () => void {
  const parent = options.injector;
  const injector = Injector.create({
    providers: [{ provide: ADAPTTABLE_FEATURE_STATE, useValue: options.state }],
    parent,
  });
  const application = parent.get(ApplicationRef);
  const detector = parent.get(ChangeDetectorRef, null);
  let flushing = false;
  let disposed = false;
  const flushAdmission = (): void => {
    if (disposed || flushing) return;
    flushing = true;
    try {
      // A table-local detectChanges alone misses queued parent signal inputs.
      // Public application change detection commits those inputs and source
      // effects before the runtime becomes the admission snapshot.
      untracked(() => {
        detector?.markForCheck();
        application.tick();
        detector?.detectChanges();
        options.runtime.view();
      });
    } finally {
      flushing = false;
    }
  };
  const context: FeatureMountContext = {
    runtime: options.runtime as unknown as TableRuntime,
    injector,
    state: options.state,
    flush: <T>(run: () => T): T => {
      const result = run();
      flushAdmission();
      return result;
    },
    flushAdmission,
  };
  const cleanups: (() => void)[] = [];
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    const failures: unknown[] = [];
    cleanups.reverse();
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    try {
      injector.destroy();
    } catch (error) {
      failures.push(error);
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, "Table feature cleanup failed");
    }
  };
  const removeDestroy = parent.get(DestroyRef).onDestroy(dispose);
  try {
    for (const { contribution } of orderedContributions(
      features.map((feature, index) => ({
        ...feature,
        id: feature.id ?? `feature-${String(index)}`,
      })),
      (feature) => feature.mount?.bind(feature),
      "mount"
    )) {
      const cleanup = runInInjectionContext(injector, () =>
        contribution(context)
      );
      if (cleanup) cleanups.push(cleanup);
    }
  } catch (error) {
    removeDestroy();
    try {
      dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Table feature mounting and cleanup failed"
      );
    }
    throw error;
  }
  return () => {
    removeDestroy();
    dispose();
  };
}

/**
 * Injection scopes retained across table feature recomposition. A resource
 * keeps its state until its dependencies change or an assembly omits it.
 *
 * @public
 */
export interface FeatureResources {
  /** Assemble the current resources, releasing resources no longer used. */
  reconcile<T>(assemble: () => T): T;
  /** Reuse a resource with identical dependencies, or create its new scope. */
  use<T>(
    key: string,
    dependencies: readonly unknown[],
    create: (injector: Injector) => T
  ): T;
  /** Release every resource once. Also called when the parent is destroyed. */
  dispose(): void;
}

/**
 * Keep optional Angular controllers in independent lifetimes while a table
 * recomposes its view. The controllers still own their state in core; this
 * helper owns only their Angular effects, subscriptions and cleanup scopes.
 *
 * @public
 */
export function createFeatureResources(parent: Injector): FeatureResources {
  interface Entry {
    readonly dependencies: readonly unknown[];
    readonly value: unknown;
    readonly injector: ReturnType<typeof Injector.create>;
  }
  const entries = new Map<string, Entry>();
  let used = new Set<string>();
  let disposed = false;
  const release = (keys: readonly string[]): void => {
    const failures: unknown[] = [];
    for (const key of keys) {
      const entry = entries.get(key);
      entries.delete(key);
      try {
        entry?.injector.destroy();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0)
      throw new AggregateError(
        failures,
        "Table feature resource cleanup failed"
      );
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    removeDestroy();
    release([...entries.keys()].reverse());
  };
  const removeDestroy = parent.get(DestroyRef).onDestroy(dispose);
  return {
    reconcile: <T>(assemble: () => T): T => {
      if (disposed)
        throw new Error("Table feature resources have been disposed");
      used = new Set();
      const result = assemble();
      release([...entries.keys()].filter((key) => !used.has(key)).reverse());
      return result;
    },
    use: <T>(
      key: string,
      dependencies: readonly unknown[],
      create: (injector: Injector) => T
    ): T => {
      if (disposed)
        throw new Error("Table feature resources have been disposed");
      used.add(key);
      const current = entries.get(key);
      if (
        current?.dependencies.length === dependencies.length &&
        current.dependencies.every((value, index) =>
          Object.is(value, dependencies[index])
        )
      ) {
        return current.value as T;
      }
      release([key]);
      const injector = Injector.create({ providers: [], parent });
      try {
        const value = untracked(() =>
          runInInjectionContext(injector, () => create(injector))
        );
        entries.set(key, { dependencies: [...dependencies], value, injector });
        return value;
      } catch (error) {
        try {
          injector.destroy();
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "Table feature creation and cleanup failed"
          );
        }
        throw error;
      }
    },
    dispose,
  };
}

/**
 * Mount optional features against the live table. A signal composition
 * retains unchanged mounts, releases removed or replaced mounts, and starts
 * added mounts in their own injection scopes. Cleanup is idempotent.
 *
 * @public
 */
export function mountTableFeatures<TRow>(
  features: MaybeSignal<readonly AdaptTableFeature[]>,
  options: {
    readonly runtime: TableRuntime<TRow>;
    readonly state: FeatureState;
    readonly injector: Injector;
  }
): () => void {
  if (!isSignal(features)) return mountFeaturesOnce(features, options);
  const mounted = new Map<
    string,
    { readonly feature: AdaptTableFeature; readonly dispose: () => void }
  >();
  let disposed = false;
  const release = (ids: readonly string[]): void => {
    const failures: unknown[] = [];
    for (const id of ids) {
      const current = mounted.get(id);
      mounted.delete(id);
      try {
        current?.dispose();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0)
      throw new AggregateError(failures, "Table feature cleanup failed");
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    removeDestroy();
    release([...mounted.keys()].reverse());
  };
  const removeDestroy = options.injector.get(DestroyRef).onDestroy(dispose);
  const update = (list: readonly AdaptTableFeature[]): void => {
    if (disposed) return;
    const contributions = orderedContributions(
      list.map((entry, index) => ({
        ...entry,
        id: entry.id ?? `feature-${String(index)}`,
        entry,
      })),
      (entry) => entry.mount?.bind(entry),
      "mount"
    );
    const next = new Map(
      contributions.map(({ id, feature }) => [id, feature.entry])
    );
    // Retract old publications before a new owner publishes the same state key.
    release(
      [...mounted.keys()]
        .filter((id) => mounted.get(id)?.feature !== next.get(id))
        .reverse()
    );
    for (const { id, feature } of contributions) {
      if (mounted.has(id)) continue;
      mounted.set(id, {
        feature: feature.entry,
        dispose: mountFeaturesOnce([feature.entry], options),
      });
    }
  };
  try {
    update(readMaybe(features));
  } catch (error) {
    try {
      dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Table feature mounting and cleanup failed"
      );
    }
    throw error;
  }
  const watch = effect(
    () => {
      const list = features();
      untracked(() => {
        update(list);
      });
    },
    { injector: options.injector }
  );
  return () => {
    watch.destroy();
    dispose();
  };
}
