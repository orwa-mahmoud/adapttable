/** One retained effect scope and registry per feature resource. */
import {
  type FeatureHostState,
  invokeCleanups,
  LiveFeatureHost,
  planFeatureRegistration,
  preferLastById,
  projectFeatureHosts,
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

import { type OwnedFeatureState, type TableFeatureState } from "./featureState";
import { requireScope } from "./store";
interface MountedFeature<TRow> {
  readonly declaration: ComposedFeature<TRow>;
  readonly scope: EffectScope;
  readonly host: LiveFeatureHost<TRow>;
  readonly state: OwnedFeatureState;
  readonly cleanup?: () => void;
}
function sameResource<TRow>(
  left: ComposedFeature<TRow>,
  right: ComposedFeature<TRow>
): boolean {
  return (
    left.setup === right.setup &&
    left.mount === right.mount &&
    (left.dependencies?.length ?? 0) === (right.dependencies?.length ?? 0) &&
    (left.dependencies ?? []).every((value, index) =>
      Object.is(value, right.dependencies?.[index])
    )
  );
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
  const retained = new Map<string, MountedFeature<TRow>>();
  const host = shallowRef<FeatureHostState<TRow>>(new LiveFeatureHost<TRow>());
  let disposed = false;
  let order: readonly string[] = [];
  const release = (resource: MountedFeature<TRow>): void => {
    const failures = invokeCleanups(
      [
        resource.state.dispose,
        resource.cleanup,
        () => resource.host.dispose(),
        () => resource.scope.stop(),
      ].filter((cleanup): cleanup is () => void => cleanup !== undefined)
    );
    if (failures.length)
      throw new AggregateError(
        failures,
        `AdaptTable: cleanup failed for feature "${resource.declaration.id}".`
      );
  };
  const project = (features: readonly ComposedFeature<TRow>[]): void => {
    host.value = projectFeatureHosts(
      features.flatMap((declaration) => {
        const part = retained.get(declaration.id)?.host;
        return part ? [part] : [];
      })
    );
  };
  const removeChanged = (features: readonly ComposedFeature<TRow>[]): void => {
    const plan = planFeatureRegistration(
      [...retained].map(([id, resource]) => ({
        id,
        feature: resource.declaration,
      })),
      features.map((feature) => ({ id: feature.id, feature })),
      sameResource
    );
    const failures: unknown[] = [];
    for (const id of plan.release) {
      const resource = retained.get(id);
      retained.delete(id);
      if (!resource) continue;
      try {
        release(resource);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) {
      project(features);
      throw new AggregateError(failures, "AdaptTable: feature cleanup failed.");
    }
  };
  const mount = (declaration: ComposedFeature<TRow>): MountedFeature<TRow> => {
    const scope = effectScope(true);
    const registry = new LiveFeatureHost<TRow>();
    const state = options.state.owner();
    let cleanup: (() => void) | undefined;
    const context: FeatureMountContext<TRow> = {
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
    };
    try {
      scope.run(() => {
        const typed = declaration;
        const setupCleanup = typed.setup?.(registry);
        if (setupCleanup) registry.onDispose(setupCleanup);
        cleanup = typed.mount?.(context) ?? undefined;
      });
    } catch (error) {
      try {
        release({ declaration, scope, host: registry, state, cleanup });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "AdaptTable: feature mount and rollback failed."
        );
      }
      throw error;
    }
    const resource = { declaration, scope, host: registry, state, cleanup };
    return resource;
  };
  const reconcile = (features: readonly ComposedFeature<TRow>[]): void => {
    if (disposed) return;
    const resolved = preferLastById(features);
    const unchanged =
      order.length === resolved.length &&
      resolved.every((declaration, index) => {
        const prior = retained.get(declaration.id);
        return (
          order[index] === declaration.id &&
          prior !== undefined &&
          sameResource(prior.declaration, declaration)
        );
      });
    if (unchanged) return;
    order = resolved.map((declaration) => declaration.id);
    removeChanged(resolved);
    const added: MountedFeature<TRow>[] = [];
    try {
      for (const declaration of resolved) {
        if (retained.has(declaration.id)) continue;
        const resource = mount(declaration);
        retained.set(declaration.id, resource);
        added.push(resource);
      }
    } catch (error) {
      const errors = [error];
      added.reverse();
      for (const resource of added) {
        retained.delete(resource.declaration.id);
        try {
          release(resource);
        } catch (cleanupError) {
          errors.push(cleanupError);
        }
      }
      project(resolved);
      if (errors.length > 1)
        throw new AggregateError(
          errors,
          "AdaptTable: feature composition and rollback failed."
        );
      throw error;
    }
    project(resolved);
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    const errors: unknown[] = [];
    const resources = [...retained.values()];
    retained.clear();
    for (const resource of resources)
      try {
        release(resource);
      } catch (error) {
        errors.push(error);
      }
    options.state.clear();
    if (errors.length)
      throw new AggregateError(errors, "AdaptTable: feature disposal failed.");
  };
  onScopeDispose(dispose);
  return { host: shallowReadonly(host), reconcile, dispose };
}
