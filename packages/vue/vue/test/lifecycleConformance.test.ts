import { createMemoryAdapter } from "@adapttable/core";
import type { TableRuntime } from "@adapttable/core/binding";
import {
  featureLifecycleConformanceTests,
  type FeatureLifecycleDriver,
  type LifecycleDeclaration,
  type LifecycleObservation,
} from "@adapttable/core/conformance";
import { describe, expect, it } from "vitest";
import { effectScope, shallowRef } from "vue";

import { useFeatureLifecycle } from "../src/featureLifecycle";
import type { TableFeature } from "../src/features/tableFeature";
import { createFeatureState } from "../src/featureState";
import { useFrontendData } from "../src/source/useFrontendData";
import { useDataTable } from "../src/useDataTable";
import type { ResolvedTableOptions } from "../src/useDataTableShell";

interface Row {
  readonly id: string;
}

const columns = [{ key: "id", sortable: true }];
const rowKey = (row: Row): string => row.id;
const rows: readonly Row[] = [{ id: "1" }];
const runtime: TableRuntime<Row> = {
  view: () => undefined,
  rowAt: () => undefined,
  labels: () => undefined,
  featureIds: () => [],
};

function openTable(scope = effectScope()): LifecycleObservation {
  const setups = new Map<string, number>();
  const cleanups = new Map<string, number>();
  let publications = 0;
  let revisions = 0;
  let seen: object | undefined;
  const opened = scope.run(() => {
    const source = useFrontendData<Row>({
      data: rows,
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    source.value.tableEngine?.subscribe("all", () => {
      revisions += 1;
    });
    const options = shallowRef<ResolvedTableOptions<Row>>({
      source,
      columns,
      rowKey,
      urlSync: false,
    });
    const table = useDataTable({ source, columns, rowKey });
    return useFeatureLifecycle({
      runtime,
      state: createFeatureState(),
      active: shallowRef(true),
      reconcile: () => undefined,
      flushAdmission: () => undefined,
      root: shallowRef(null),
      urlAdapter: shallowRef(createMemoryAdapter()),
      flushViewState: () => undefined,
      registerViewStateFlush: () => () => undefined,
      source,
      table,
      filterRuntime: shallowRef(undefined),
      options,
    });
  });
  if (!opened) throw new Error("missing lifecycle");
  let disposed = false;
  const current = opened.host.value;
  if (current !== seen) {
    seen = current;
    publications += 1;
  }
  const featuresFor = new WeakMap<LifecycleDeclaration, TableFeature<Row>>();
  const declare = (spec: LifecycleDeclaration): TableFeature<Row> => {
    const existing = featuresFor.get(spec);
    if (existing) return existing;
    const created: TableFeature<Row> = {
      id: spec.id,
      setup: (registry) => {
        setups.set(spec.id, (setups.get(spec.id) ?? 0) + 1);
        if (spec.command)
          registry.registerCommand({
            key: spec.command,
            label: spec.command,
            onSelect: () => undefined,
          });
        return () => {
          cleanups.set(spec.id, (cleanups.get(spec.id) ?? 0) + 1);
        };
      },
      mount: () => {
        if (spec.fail) throw new Error(`mount ${spec.id}`);
      },
    };
    featuresFor.set(spec, created);
    return created;
  };
  return {
    reconcile(list) {
      opened.reconcile(list.map(declare));
      const next = opened.host.value;
      if (next !== seen) {
        seen = next;
        publications += 1;
      }
      return Promise.resolve();
    },
    dispose() {
      if (disposed) return Promise.resolve();
      disposed = true;
      opened.dispose();
      scope.stop();
      return Promise.resolve();
    },
    commands: () => opened.host.value.commands.map((command) => command.key),
    setups: (id) => setups.get(id) ?? 0,
    cleanups: (id) => cleanups.get(id) ?? 0,
    hostPublications: () => publications,
    revisionNotifications: () => revisions,
  };
}

const driver: FeatureLifecycleDriver = {
  name: "vue",
  open() {
    return Promise.resolve(openTable());
  },
  openNested() {
    const scope = effectScope();
    return Promise.resolve({
      outer: openTable(scope),
      inner: openTable(scope),
    });
  },
};

describe("vue feature registration conformance", () => {
  for (const test of featureLifecycleConformanceTests(driver, { expect }))
    it(test.name, test.run);
});
