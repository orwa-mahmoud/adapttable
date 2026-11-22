/**
 * Mount the base chrome and the composed chrome stages, and hand back what
 * the stages produced: the chrome they pass on and the feature state they
 * publish, read by key.
 */
import type { FeatureStateKey } from "@adapttable/core/binding";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

import type { TableChrome } from "./chrome/tableChromeContract";
import { ChromeExtrasGate } from "./features/chromeExtrasGate";
import { useFeatureState } from "./features/featureState";
import { FeatureProviders } from "./features/providers";
import {
  EDITING_STATE,
  FILTER_CHIPS_STATE,
  GROUPING_STATE,
  ROW_ACTIONS_STATE,
  ROW_DETAIL_STATE,
  ROW_PINNING_STATE,
  TREE_STATE,
} from "./features/stateKeys";
import { applyTableFeatures, type TableFeature } from "./features/tableFeature";
import { useTableChrome } from "./useTableChrome";

/** Every channel a chrome stage publishes. */
const CHANNEL_KEYS: readonly FeatureStateKey<unknown>[] = [
  FILTER_CHIPS_STATE,
  EDITING_STATE,
  ROW_DETAIL_STATE,
  ROW_ACTIONS_STATE,
  ROW_PINNING_STATE,
  GROUPING_STATE,
  TREE_STATE,
];

/** What the stages produced on the last render. */
export interface LiveChromeResult<TRow> {
  /** The chrome the last stage passed on. */
  current: TableChrome<TRow>;
  /** The state a stage published under `key`, if one did. */
  state<T>(key: FeatureStateKey<T>): T | undefined;
}

/**
 * @param features - The composed features.
 * @param build - The table's props, built inside the render.
 * @param capture - The feature-state keys to read after each render; every
 *   channel a chrome stage publishes by default.
 */
export function renderLiveChrome<TRow>(
  features: readonly TableFeature<TRow>[],
  build: () => Parameters<typeof useTableChrome<TRow>>[0],
  capture: readonly FeatureStateKey<unknown>[] = CHANNEL_KEYS
) {
  const applied = applyTableFeatures({ features });
  const captured = new Map<string, unknown>();
  const result: LiveChromeResult<TRow> = {
    current: undefined as unknown as TableChrome<TRow>,
    state: <T,>(key: FeatureStateKey<T>) =>
      captured.get(key.id) as T | undefined,
  };
  function StateProbe({
    stateKey,
  }: {
    readonly stateKey: FeatureStateKey<unknown>;
  }) {
    captured.set(stateKey.id, useFeatureState(stateKey));
    return null;
  }
  function Probe(): ReactNode {
    const props = { ...applied, ...build() };
    const base = useTableChrome<TRow>(props);
    return (
      <ChromeExtrasGate chrome={base} props={props}>
        {(overlaid) => {
          result.current = overlaid;
          return capture.map((key) => (
            <StateProbe key={key.id} stateKey={key} />
          ));
        }}
      </ChromeExtrasGate>
    );
  }
  const tree = (
    <FeatureProviders props={applied}>
      <Probe />
    </FeatureProviders>
  );
  const view = render(tree);
  return {
    result,
    unmount: view.unmount,
    rerender: () => view.rerender(tree),
  };
}
