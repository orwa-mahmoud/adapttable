/**
 * Live {@link TableFeatureHost}: `setup(host)` registrations, collected by
 * `@adapttable/core`'s `LiveFeatureHost`. The host is stored on the resolved
 * props ({@link featureHostOf}) and provided to the tree by
 * {@link FeatureHostProvider}. Chrome that runs in the same render receives
 * it as an argument; it is not left on a module stack.
 */
import { appendByKey, type FeatureHostState } from "@adapttable/core";
import {
  createFeatureHost,
  disposeFeatureHost,
  EMPTY_FEATURE_HOST,
  planFeatureRegistration,
  preferLastById,
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
  retire: FeatureHostState[];
}

function projectedHost(
  pending: ReadonlyMap<string, OwnedFeature>
): FeatureHostState {
  const parts = [...pending.values()]
    .map((entry) => entry.host)
    .filter((entry) => entry !== EMPTY_FEATURE_HOST);
  return parts.length === 0 ? EMPTY_FEATURE_HOST : projectFeatureHosts(parts);
}

function mountPlanned(
  mount: readonly { id: string; feature: TableFeature }[],
  pending: Map<string, OwnedFeature>
): unknown {
  const created: FeatureHostState[] = [];
  try {
    for (const entry of mount) {
      const createdHost = createFeatureHost<SidePanelEntry>([entry.feature]);
      pending.set(entry.id, { feature: entry.feature, host: createdHost });
      created.push(createdHost);
    }
    return undefined;
  } catch (error) {
    const rolledBack = [...created];
    rolledBack.reverse();
    for (const createdHost of rolledBack) disposeFeatureHost(createdHost);
    return error;
  }
}

function ownedRecord(cache: { current: OwnedRecord | null }): OwnedRecord {
  const existing = cache.current;
  if (existing) return existing;
  const created: OwnedRecord = {
    owned: new Map(),
    host: EMPTY_FEATURE_HOST,
    retire: [],
  };
  cache.current = created;
  return created;
}

function commitFeaturePlan(
  record: OwnedRecord,
  list: readonly TableFeature[] | undefined
): FeatureHostState {
  const resolved = preferLastById(list ?? []);
  const plan = planFeatureRegistration(
    [...record.owned].map(([id, entry]) => ({ id, feature: entry.feature })),
    resolved.map((feature) => ({ id: feature.id, feature })),
    Object.is
  );
  if (plan.release.length === 0 && plan.mount.length === 0) return record.host;
  const pending = new Map(record.owned);
  const failure = mountPlanned(plan.mount, pending);
  if (failure !== undefined) {
    if (record.owned.size === 0) {
      throw failure instanceof Error
        ? failure
        : new Error("Feature setup failed");
    }
    registrationFailure.set(record.host, failure);
    return record.host;
  }
  for (const id of plan.release) {
    const previous = record.owned.get(id);
    if (previous && previous.host !== EMPTY_FEATURE_HOST)
      record.retire.push(previous.host);
    pending.delete(id);
  }
  record.owned = pending;
  record.host = projectedHost(pending);
  return record.host;
}

/**
 * Apply `features`, run `setup(host)`, overlay side-panel panels onto props.
 *
 * Safe to call from an adapter and again from `useDataTableShell`:
 * the second call reuses the host and does not re-register.
 *
 * @public
 */
export function useTableFeatures<P extends object>(
  incoming: P
): P & FeatureProps<RowOf<P>> {
  const reused = hostOf.get(incoming);
  const applied = reused ? incoming : applyTableFeatures(incoming);
  const list = getAppliedFeatures(applied);
  const cache = useRef<OwnedRecord | null>(null);
  const record = ownedRecord(cache);

  useLayoutEffect(() => {
    const retired = record.retire.splice(0);
    for (const retiredHost of retired) disposeFeatureHost(retiredHost);
  });
  useLayoutEffect(() => {
    const current = cache.current;
    return () => {
      if (!current) return;
      for (const retiredHost of current.retire.splice(0))
        disposeFeatureHost(retiredHost);
      for (const entry of current.owned.values())
        disposeFeatureHost(entry.host);
      current.owned.clear();
    };
  }, [cache]);

  const host = reused ?? commitFeaturePlan(record, list);

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
