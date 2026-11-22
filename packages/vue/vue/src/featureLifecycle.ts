/**
 * A Vue table's features: their registrations, read from the last
 * declaration of each id, and their mounted resources, each in its own
 * effect scope, kept by id across ordinary option changes and released
 * exactly once.
 */
import {
  createFeatureHost,
  createFeatureMounts,
  EMPTY_FEATURE_HOST,
  type FeatureHostState,
  invokeCleanups,
  LiveFeatureHost,
  projectFeatureHosts,
  resolveFeatureIds,
  type SidePanelEntry,
  type TableRuntime,
} from "@adapttable/core/binding";
import type { ComposedFeature, FeatureMountContext } from "@adapttable/vue";
import {
  type EffectScope,
  effectScope,
  onScopeDispose,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
} from "vue";

import { type TableFeatureState } from "./featureState";
import { requireScope } from "./store";
/** One feature's registrations, rebuilt only when its declaration changes. */
interface Registered<TRow> {
  readonly declaration: ComposedFeature<TRow>;
  readonly host: FeatureHostState<TRow>;
}
export interface FeatureLifecycle<TRow> {
  readonly host: Readonly<ShallowRef<FeatureHostState<TRow>>>;
  reconcile(features: readonly ComposedFeature<TRow>[]): void;
  dispose(): void;
}
export function useFeatureLifecycle<TRow>(options: {
  readonly bodyRows?: NonNullable<FeatureMountContext<TRow>["bodyRows"]>;
  readonly selection?: NonNullable<FeatureMountContext<TRow>["selection"]>;
  readonly scrollToRow?: NonNullable<FeatureMountContext<TRow>["scrollToRow"]>;
  readonly scrollToColumn?: NonNullable<
    FeatureMountContext<TRow>["scrollToColumn"]
  >;

  readonly bodyProjection?: NonNullable<
    FeatureMountContext<TRow>["bodyProjection"]
  >;
  readonly runtime: TableRuntime<TRow>;
  readonly root: FeatureMountContext<TRow>["root"];
  readonly urlAdapter: FeatureMountContext<TRow>["urlAdapter"];
  readonly flushViewState: () => void;
  readonly registerViewStateFlush: (flush: () => void) => () => void;
  readonly source?: FeatureMountContext<TRow>["source"];
  readonly density?: NonNullable<FeatureMountContext<TRow>["density"]>;
  readonly table: FeatureMountContext<TRow>["table"];
  readonly rowInventory?: NonNullable<
    FeatureMountContext<TRow>["rowInventory"]
  >;
  readonly featureHost?: FeatureMountContext<TRow>["featureHost"];
  readonly filterRuntime: FeatureMountContext<TRow>["filterRuntime"];
  readonly options: FeatureMountContext<TRow>["options"];
  readonly state: TableFeatureState;
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly reconcile: () => void;
  readonly flushAdmission: () => void | Promise<void>;
}): FeatureLifecycle<TRow> {
  requireScope("useFeatureLifecycle");
  const host = shallowRef<FeatureHostState<TRow>>(new LiveFeatureHost<TRow>());
  // Registrations are pure: a changed declaration registers again into a
  // fresh host, and nothing it registered needs releasing.
  let registered = new Map<string, Registered<TRow>>();
  let composed: readonly ComposedFeature<TRow>[] = [];
  let disposed = false;
  const contextFor = (
    latest: () => ComposedFeature<TRow>,
    scope: EffectScope,
    state: FeatureMountContext<TRow>["state"]
  ): FeatureMountContext<TRow> => ({
    bodyRows: options.bodyRows,
    selection: options.selection,
    scrollToRow: options.scrollToRow,
    scrollToColumn: options.scrollToColumn,
    runtime: options.runtime,
    bodyProjection: options.bodyProjection,
    root: options.root,
    urlAdapter: options.urlAdapter,
    flushViewState: options.flushViewState,
    registerViewStateFlush: (flush) => {
      onScopeDispose(options.registerViewStateFlush(flush));
    },
    source: options.source ?? options.table.source,
    density: options.density,
    table: options.table,
    rowInventory: options.rowInventory,
    filterRuntime: options.filterRuntime,
    featureHost: options.featureHost ?? host,
    options: options.options,
    feature: latest,
    state,
    scope,
    active: options.active,
    reconcile: options.reconcile,
    flushAdmission: options.flushAdmission,
    flush: (run) => {
      const result = run();
      options.reconcile();
      return result;
    },
  });
  // A feature's resource lives in its own effect scope with its own state
  // channel, kept by id across ordinary option changes.
  const mounts = createFeatureMounts<ComposedFeature<TRow>>((id, latest) => {
    const scope = effectScope(true);
    const state = options.state.owner();
    let cleanup: (() => void) | undefined;
    const release = (): void => {
      const failures = invokeCleanups(
        [state.dispose, cleanup, () => scope.stop()].filter(
          (step): step is () => void => step !== undefined
        )
      );
      if (failures.length)
        throw new AggregateError(
          failures,
          `AdaptTable: cleanup failed for feature "${id}".`
        );
    };
    try {
      scope.run(() => {
        cleanup =
          latest().mount?.(contextFor(latest, scope, state)) ?? undefined;
      });
    } catch (error) {
      try {
        release();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "AdaptTable: feature mount and rollback failed."
        );
      }
      throw error;
    }
    return release;
  });
  const reconcile = (features: readonly ComposedFeature<TRow>[]): void => {
    if (disposed) return;
    const resolved = resolveFeatureIds(features);
    const unchanged =
      composed.length === resolved.length &&
      resolved.every((declaration, index) => declaration === composed[index]);
    if (unchanged) return;
    const next = new Map<string, Registered<TRow>>();
    for (const declaration of resolved) {
      const prior = registered.get(declaration.id);
      // A declaration that registers nothing, like the one it replaces,
      // keeps the entry, so the host stays the same object.
      const keep =
        prior !== undefined &&
        (prior.declaration === declaration ||
          (prior.declaration.setup === undefined &&
            declaration.setup === undefined));
      next.set(
        declaration.id,
        keep
          ? prior
          : {
              declaration,
              host: createFeatureHost<SidePanelEntry>([declaration]),
            }
      );
    }
    mounts.reconcile(resolved);
    const sameRegistrations =
      next.size === registered.size &&
      resolved.every(
        (declaration, index) =>
          composed[index]?.id === declaration.id &&
          next.get(declaration.id) === registered.get(declaration.id)
      );
    registered = next;
    composed = resolved;
    if (sameRegistrations) return;
    host.value = projectFeatureHosts(
      resolved.flatMap((declaration) => {
        const part = next.get(declaration.id)?.host;
        return part && part !== EMPTY_FEATURE_HOST ? [part] : [];
      })
    );
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    try {
      mounts.dispose();
    } finally {
      options.state.clear();
    }
  };
  onScopeDispose(dispose);
  return { host: shallowReadonly(host), reconcile, dispose };
}
