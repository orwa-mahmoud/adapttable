import {
  featureLifecycleConformanceTests,
  type FeatureLifecycleDriver,
  type LifecycleDeclaration,
  type LifecycleObservation,
} from "@adapttable/core/conformance";
import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useFrontendData } from "../source/useFrontendData";
import {
  featureHostOf,
  takeFeatureRegistrationFailure,
  useTableFeatures,
} from "./featureHost";
import type { TableFeature } from "./tableFeature";

interface Row {
  readonly id: string;
}

interface Bridge {
  setList: (features: readonly TableFeature<Row>[]) => void;
  commands: readonly string[];
  publications: number;
  revisions: number;
  failure: unknown;
  seen: object | undefined;
  subscribed: boolean;
}

function Features({ bridge }: { readonly bridge: Bridge }): null {
  const [list, setList] = useState<readonly TableFeature<Row>[]>([]);
  const props = useTableFeatures({
    features: list,
    rowKey: (row: Row) => row.id,
  });
  const host = featureHostOf(props);
  if (host && host !== bridge.seen) {
    bridge.seen = host;
    bridge.publications += 1;
  }
  bridge.commands = host?.commands.map((command) => command.key) ?? [];
  bridge.failure = takeFeatureRegistrationFailure(host);
  bridge.setList = setList;
  return null;
}

function Table({ bridge }: { readonly bridge: Bridge }) {
  const source = useFrontendData<Row>({
    data: [{ id: "1" }],
    getRowId: (row) => row.id,
    urlSync: false,
  });
  if (!bridge.subscribed && source.tableEngine) {
    bridge.subscribed = true;
    source.tableEngine.subscribe("all", () => {
      bridge.revisions += 1;
    });
  }
  return <Features bridge={bridge} />;
}

function observationFor(
  bridge: Bridge,
  setups: Map<string, number>,
  cleanups: Map<string, number>,
  featuresFor: WeakMap<LifecycleDeclaration, TableFeature<Row>>,
  release: () => void
): LifecycleObservation {
  const declare = (spec: LifecycleDeclaration): TableFeature<Row> => {
    const existing = featuresFor.get(spec);
    if (existing) return existing;
    const created: TableFeature<Row> = {
      id: spec.id,
      setup: (host) => {
        setups.set(spec.id, (setups.get(spec.id) ?? 0) + 1);
        if (spec.command)
          host.registerCommand({
            key: spec.command,
            label: spec.command,
            onSelect: () => undefined,
          });
        const cleanup = (): void => {
          cleanups.set(spec.id, (cleanups.get(spec.id) ?? 0) + 1);
        };
        if (spec.fail) {
          host.onDispose(cleanup);
          throw new Error(`mount ${spec.id}`);
        }
        return cleanup;
      },
    };
    featuresFor.set(spec, created);
    return created;
  };
  let disposed = false;
  return {
    reconcile(list) {
      bridge.failure = undefined;
      act(() => {
        bridge.setList(list.map(declare));
      });
      if (bridge.failure instanceof Error)
        return Promise.reject(bridge.failure);
      return Promise.resolve();
    },
    dispose() {
      if (disposed) return Promise.resolve();
      disposed = true;
      release();
      return Promise.resolve();
    },
    commands: () => bridge.commands,
    setups: (id) => setups.get(id) ?? 0,
    cleanups: (id) => cleanups.get(id) ?? 0,
    hostPublications: () => bridge.publications,
    revisionNotifications: () => bridge.revisions,
  };
}

function blankBridge(): Bridge {
  return {
    setList: () => undefined,
    commands: [],
    publications: 0,
    revisions: 0,
    failure: undefined,
    seen: undefined,
    subscribed: false,
  };
}

const driver: FeatureLifecycleDriver = {
  name: "react",
  open() {
    const setups = new Map<string, number>();
    const cleanups = new Map<string, number>();
    const featuresFor = new WeakMap<LifecycleDeclaration, TableFeature<Row>>();
    const bridge = blankBridge();
    const view = render(<Table bridge={bridge} />);
    return Promise.resolve(
      observationFor(bridge, setups, cleanups, featuresFor, () => {
        view.unmount();
      })
    );
  },
  openNested() {
    const outerSetups = new Map<string, number>();
    const outerCleanups = new Map<string, number>();
    const outerFeatures = new WeakMap<
      LifecycleDeclaration,
      TableFeature<Row>
    >();
    const innerSetups = new Map<string, number>();
    const innerCleanups = new Map<string, number>();
    const innerFeatures = new WeakMap<
      LifecycleDeclaration,
      TableFeature<Row>
    >();
    const outerBridge = blankBridge();
    const innerBridge = blankBridge();
    const view = render(
      <>
        <Table bridge={outerBridge} />
        <Table bridge={innerBridge} />
      </>
    );
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      view.unmount();
    };
    return Promise.resolve({
      outer: observationFor(
        outerBridge,
        outerSetups,
        outerCleanups,
        outerFeatures,
        release
      ),
      inner: observationFor(
        innerBridge,
        innerSetups,
        innerCleanups,
        innerFeatures,
        release
      ),
    });
  },
};

describe("react feature registration conformance", () => {
  for (const test of featureLifecycleConformanceTests(driver, { expect }))
    it(test.name, test.run);
});
