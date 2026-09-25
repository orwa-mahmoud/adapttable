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

function sameFeatures(
  left: readonly TableFeature[] | undefined,
  right: readonly TableFeature[] | undefined
): boolean {
  if (left === right) return true;
  if (left?.length !== right?.length || !left || !right) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
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
  const cache = useRef<{
    list: readonly TableFeature[] | undefined;
    host: FeatureHostState;
  } | null>(null);

  let host: FeatureHostState;
  if (reused) {
    host = reused;
  } else if (cache.current && sameFeatures(cache.current.list, list)) {
    host = cache.current.host;
  } else {
    host = hostOf.get(applied) ?? createFeatureHost<SidePanelEntry>(list);
    cache.current = { list, host };
  }

  if (!reused) hostOf.set(applied, host);

  const props = reused ? incoming : overlayPanels(applied, host);
  if (!reused && props !== applied) {
    hostOf.set(props, host);
    rememberAppliedFeatures(props, getAppliedFeatures(applied) ?? []);
  }

  useLayoutEffect(() => {
    return () => disposeFeatureHost(host);
  }, [host]);

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
