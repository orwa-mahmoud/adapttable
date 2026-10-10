/** Request-local state with scoped ownership and explicit publication. */
import type { FeatureStateKey } from "@adapttable/core/binding";
import {
  getCurrentInstance,
  inject,
  type InjectionKey,
  provide,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  triggerRef,
} from "vue";
export interface FeatureState {
  get<T>(key: FeatureStateKey<T>): Readonly<ShallowRef<T | undefined>>;
  set<T>(key: FeatureStateKey<T>, value: T | undefined): void;
}
export interface OwnedFeatureState extends FeatureState {
  dispose(this: void): void;
}
export interface TableFeatureState extends FeatureState {
  owner(): OwnedFeatureState;
  clear(): void;
}
export function createFeatureState(): TableFeatureState {
  const values = new Map<string, ShallowRef<unknown>>();
  const owners = new Map<string, object>();
  const getRef = (id: string): ShallowRef<unknown> => {
    let result = values.get(id);
    if (!result) {
      result = shallowRef<unknown>();
      values.set(id, result);
    }
    return result;
  };
  const publish = (id: string, value: unknown): void => {
    const result = getRef(id);
    if (Object.is(result.value, value)) triggerRef(result);
    else result.value = value;
  };
  const get = <T>(
    key: FeatureStateKey<T>
  ): Readonly<ShallowRef<T | undefined>> =>
    shallowReadonly(getRef(key.id)) as Readonly<ShallowRef<T | undefined>>;
  return {
    get,
    set: (key, value) => {
      owners.delete(key.id);
      publish(key.id, value);
    },
    owner: () => {
      const token = {};
      const keys = new Set<string>();
      let disposed = false;
      return {
        get,
        set: (key, value) => {
          if (disposed) return;
          keys.add(key.id);
          owners.set(key.id, token);
          publish(key.id, value);
        },
        dispose: () => {
          if (disposed) return;
          disposed = true;
          for (const id of keys)
            if (owners.get(id) === token) {
              owners.delete(id);
              publish(id, undefined);
            }
          keys.clear();
        },
      };
    },
    clear: () => {
      owners.clear();
      for (const id of values.keys()) publish(id, undefined);
    },
  };
}
const FEATURE_STATE: InjectionKey<FeatureState> = Symbol(
  "AdaptTable feature state"
);
export function provideFeatureState(state: FeatureState): void {
  provide(FEATURE_STATE, state);
}
/** Optional read for tools outside a table; no app-global mutable registry. */
export function useFeatureState<T>(
  key: FeatureStateKey<T>
): Readonly<ShallowRef<T | undefined>> {
  const state = getCurrentInstance()
    ? inject(FEATURE_STATE, undefined)
    : undefined;
  return state?.get(key) ?? shallowReadonly(shallowRef<T>());
}
