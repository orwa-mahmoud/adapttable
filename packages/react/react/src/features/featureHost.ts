/**
 * Live {@link TableFeatureHost}: `setup(host)` registrations, collected by
 * `@adapttable/core`'s `LiveFeatureHost`. The host is stored on the resolved
 * props ({@link featureHostOf}) and provided to the tree by
 * {@link FeatureHostProvider}. Chrome that runs in the same render receives
 * it as an argument; it is not left on a module stack.
 */
import { type FeatureHostState } from "@adapttable/core";
import {
  appendByKey,
  createFeatureHost,
  createFeatureMounts,
  EMPTY_FEATURE_HOST,
  type FeatureMounts,
  planFeatureRegistration,
  projectFeatureHosts,
} from "@adapttable/core/binding";
import { useLayoutEffect, useRef } from "react";

import type { SidePanelEntry } from "../layout/SidePanelChrome";
import type { FeatureProps } from "../props";
import {
  applyTableFeatures,
  getAppliedFeatures,
  rememberAppliedFeatures,
  type TableFeature,
} from "./tableFeature";

const hostOf = new WeakMap<object, FeatureHostState>();
const registrationFailure = new WeakMap<FeatureHostState, unknown>();

/**
 * The setup error from the last failed update of this host, if the table
 * already had features. Reading it clears it. An initial failure still throws.
 */
export function takeFeatureRegistrationFailure(
  host: FeatureHostState | undefined
): unknown {
  if (!host) return undefined;
  const error = registrationFailure.get(host);
  registrationFailure.delete(host);
  return error;
}

function overlayPanels<P extends object>(props: P, host: FeatureHostState): P {
  if (host.panels.length === 0) return props;
  const current = (props as { sidePanel?: unknown }).sidePanel;
  if (!current || typeof current !== "object") return props;
  const options = current as { panels: readonly SidePanelEntry[] };
  return {
    ...props,
    sidePanel: {
      ...options,
      panels: appendByKey(options.panels, host.panels, (panel) => panel.key),
    },
  };
}

/**
 * The row type a props object is about, read off its own `rowKey`.
 *
 * Every table props type names the row exactly once, in the function that
 * identifies a row, so {@link useTableFeatures} can type what it hands back
 * without the caller repeating it.
 *
 * @public
 */
export type RowOf<P> = P extends { rowKey: (row: infer TRow) => string }
  ? TRow
  : unknown;

interface OwnedFeature {
  readonly feature: TableFeature;
  readonly host: FeatureHostState;
}

interface OwnedRecord {
  owned: Map<string, OwnedFeature>;
  host: FeatureHostState;
}

function projectedHost(
  pending: ReadonlyMap<string, OwnedFeature>
): FeatureHostState {
  const parts = [...pending.values()]
    .map((entry) => entry.host)
    .filter((entry) => entry !== EMPTY_FEATURE_HOST);
  return parts.length === 0 ? EMPTY_FEATURE_HOST : projectFeatureHosts(parts);
}

function registerPlanned(
  mount: readonly { id: string; feature: TableFeature }[],
  pending: Map<string, OwnedFeature>
): unknown {
  try {
    for (const entry of mount) {
      pending.set(entry.id, {
        feature: entry.feature,
        host: createFeatureHost<SidePanelEntry>([entry.feature]),
      });
    }
    return undefined;
  } catch (error) {
    return error;
  }
}

function ownedRecord(cache: { current: OwnedRecord | null }): OwnedRecord {
  const existing = cache.current;
  if (existing) return existing;
  const created: OwnedRecord = { owned: new Map(), host: EMPTY_FEATURE_HOST };
  cache.current = created;
  return created;
}

/**
 * The registrations of the composed features. Registration is pure, so this
 * runs during render; a declaration already registered keeps its host.
 */
function commitFeaturePlan(
  record: OwnedRecord,
  resolved: readonly TableFeature[]
): FeatureHostState {
  const plan = planFeatureRegistration(
    [...record.owned].map(([id, entry]) => ({ id, feature: entry.feature })),
    resolved.map((feature) => ({ id: feature.id, feature })),
    Object.is
  );
  if (plan.release.length === 0 && plan.mount.length === 0) return record.host;
  const pending = new Map(record.owned);
  const failure = registerPlanned(plan.mount, pending);
  if (failure !== undefined) {
    if (record.owned.size === 0) {
      throw failure instanceof Error
        ? failure
        : new Error("Feature setup failed");
    }
    registrationFailure.set(record.host, failure);
    return record.host;
  }
  for (const id of plan.release) pending.delete(id);
  record.owned = pending;
  record.host = projectedHost(pending);
  return record.host;
}

/**
 * Keep the composed features' mounted resources by id: acquired once the
 * table has mounted, kept across ordinary option changes with the latest
 * declaration, released exactly once when a feature leaves or the table
 * unmounts. A render React discards acquires nothing.
 */
function useFeatureMounts(
  resolved: readonly TableFeature[],
  owner: boolean
): void {
  const mounts = useRef<FeatureMounts<TableFeature> | null>(null);
  useLayoutEffect(() => {
    if (!owner) return undefined;
    const created = createFeatureMounts<TableFeature>((_id, latest) =>
      latest().mount?.({ feature: latest })
    );
    mounts.current = created;
    return () => {
      mounts.current = null;
      created.dispose();
    };
  }, [owner]);
  useLayoutEffect(() => {
    mounts.current?.reconcile(resolved);
  });
}

/**
 * Apply `features`, register their `setup(host)` registrations, mount their
 * resources, and overlay side-panel panels onto props.
 *
 * Safe to call from an adapter and again from `useDataTableShell`:
 * the second call reuses the host and neither registers nor mounts again.
 *
 * @public
 */
export function useTableFeatures<P extends object>(
  incoming: P
): P & FeatureProps<RowOf<P>> {
  const reused = hostOf.get(incoming);
  const applied = reused ? incoming : applyTableFeatures(incoming);
  const resolved = getAppliedFeatures(applied) ?? [];
  const cache = useRef<OwnedRecord | null>(null);
  const record = ownedRecord(cache);
  useFeatureMounts(resolved, reused === undefined);

  const host = reused ?? commitFeaturePlan(record, resolved);

  if (!reused) hostOf.set(applied, host);

  const props = reused ? incoming : overlayPanels(applied, host);
  if (!reused && props !== applied) {
    hostOf.set(props, host);
    rememberAppliedFeatures(props, getAppliedFeatures(applied) ?? []);
  }

  return props;
}

/**
 * The host {@link useTableFeatures} created for these resolved props.
 *
 * @public
 */
export function featureHostOf(props: object): FeatureHostState | undefined {
  return hostOf.get(props);
}

/**
 * Attach a host to a derived props object (chrome spreads a new one).
 *
 * @public
 */
export function rememberFeatureHost(
  props: object,
  host: FeatureHostState | undefined
): void {
  if (host) hostOf.set(props, host);
}
