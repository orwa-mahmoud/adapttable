/** Typed, per-table signals published by mounted features. */
import type { FeatureStateKey } from "@adapttable/core/binding";
import {
  inject,
  InjectionToken,
  type Injector,
  type Signal,
  signal,
  type WritableSignal,
} from "@angular/core";

/**
 * The state channel shared by a table's mounted features and slot components.
 * A key always returns the same signal, including before its first value.
 *
 * @public
 */
export interface FeatureState {
  /** Read one feature's current value, reactively. */
  get<T>(key: FeatureStateKey<T>): Signal<T | undefined>;
  /**
   * Publish a value, or retract it when the feature is disposed. Every call
   * notifies readers, including a stable handle whose contents have changed.
   */
  set<T>(key: FeatureStateKey<T>, value: T | undefined): void;
}

/**
 * Create an isolated state channel for one table.
 *
 * @public
 */
export function createFeatureState(): FeatureState {
  const values = new Map<string, WritableSignal<unknown>>();
  const reads = new Map<string, Signal<unknown>>();
  const entry = (id: string): WritableSignal<unknown> => {
    let value = values.get(id);
    if (!value) {
      // A stable session or controller can expose changed contents without
      // changing identity. An explicit publication must still reach readers.
      value = signal<unknown>(undefined, { equal: () => false });
      values.set(id, value);
      reads.set(id, value.asReadonly());
    }
    return value;
  };
  return {
    get: <T>(key: FeatureStateKey<T>): Signal<T | undefined> => {
      entry(key.id);
      return reads.get(key.id)! as Signal<T | undefined>;
    },
    set: <T>(key: FeatureStateKey<T>, value: T | undefined): void => {
      entry(key.id).set(value);
    },
  };
}

/**
 * The state of the table a mounted feature or slot belongs to.
 *
 * @public
 */
export const ADAPTTABLE_FEATURE_STATE = new InjectionToken<FeatureState>(
  "ADAPTTABLE_FEATURE_STATE"
);

/**
 * Read feature state from inside a mounted feature or table slot. Outside a
 * table, the returned signal remains undefined.
 *
 * @public
 */
export function injectFeatureState<T>(
  key: FeatureStateKey<T>,
  injector?: Injector
): Signal<T | undefined> {
  const state = injector
    ? injector.get(ADAPTTABLE_FEATURE_STATE, null)
    : inject(ADAPTTABLE_FEATURE_STATE, { optional: true });
  return state?.get(key) ?? signal<T | undefined>(undefined).asReadonly();
}
