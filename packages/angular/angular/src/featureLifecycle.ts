/** A table's generic feature lifecycle, independent of optional features. */
import type { TableRuntime } from "@adapttable/core";
import { orderedContributions } from "@adapttable/core/binding";
import {
  ApplicationRef,
  ChangeDetectorRef,
  DestroyRef,
  Injector,
  runInInjectionContext,
  untracked,
} from "@angular/core";

import type { AdaptTableFeature } from "./featureHost";
import { ADAPTTABLE_FEATURE_STATE, type FeatureState } from "./featureState";

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
export function mountTableFeatures<TRow>(
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
