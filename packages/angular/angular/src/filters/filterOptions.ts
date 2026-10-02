/**
 * A definition's choices: a static list, an async loader, or nothing.
 */
import { devWarn, type FilterDef, type FilterOption } from "@adapttable/core";
import {
  DestroyRef,
  effect,
  type Injector,
  isSignal,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

import { type MaybeSignal, readMaybe } from "../store";

/**
 * A filter's choices, resolved.
 *
 * @public
 */
export interface FilterOptionsState {
  /** The choices. */
  readonly options: readonly FilterOption[];
  /** Whether a loader is still running. */
  readonly loading: boolean;
}

const NO_OPTIONS: readonly FilterOption[] = [];

/**
 * A definition's choices as a signal, loading them when they come from a
 * loader.
 *
 * @param def - The definition, or its live signal.
 * @param injector - Ends a load in flight when the caller is destroyed.
 * @returns The choices and whether they are loading.
 *
 * @public
 */
export function filterOptionsFor<TRow>(
  def: MaybeSignal<Pick<FilterDef<TRow>, "key" | "options">>,
  injector: Injector
): Signal<FilterOptionsState> {
  const state = signal<FilterOptionsState>({
    options: NO_OPTIONS,
    loading: false,
  });
  let ticket = 0;
  let current = untracked(() => readMaybe(def));
  const load = (next: Pick<FilterDef<TRow>, "key" | "options">): void => {
    const generation = ++ticket;
    const source = next.options;
    if (Array.isArray(source)) {
      state.set({ options: source, loading: false });
      return;
    }
    if (typeof source !== "function") {
      if (source === "auto") {
        devWarn(
          `filter "${next.key}" uses options: "auto" on a tier with no full dataset — provide an options array or loader.`
        );
      }
      state.set({ options: NO_OPTIONS, loading: false });
      return;
    }
    state.set({ options: NO_OPTIONS, loading: true });
    const isCurrent = (): boolean => {
      const latest = readMaybe(def);
      return (
        generation === ticket &&
        latest.key === next.key &&
        latest.options === source
      );
    };
    source().then(
      (options) => {
        if (isCurrent()) state.set({ options, loading: false });
      },
      () => {
        if (!isCurrent()) return;
        devWarn(`async options for filter "${next.key}" failed to load.`);
        state.set({ options: NO_OPTIONS, loading: false });
      }
    );
  };
  load(current);
  injector.get(DestroyRef).onDestroy(() => {
    ticket += 1;
  });
  if (isSignal(def)) {
    effect(
      () => {
        const next = def();
        if (next.key === current.key && next.options === current.options)
          return;
        current = next;
        untracked(() => load(next));
      },
      { injector }
    );
  }
  return state.asReadonly();
}
