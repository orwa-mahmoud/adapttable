import type { ExportRequest, TableSource } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  effectScope,
  type ShallowRef,
  shallowRef,
  toValue,
} from "vue";

import { EXPORT_CONTROL, EXPORT_MODEL } from "../src/actions/contracts";
import {
  type ExportAllControls,
  exportCsv,
  type ExportCsvOptions,
} from "../src/export-csv";
import { extendFeature, slotRender } from "../src/adapter";
import type { ComposedFeature } from "../src/features/tableFeature";
import { tree } from "../src/features/tree";
import { useFrontendData } from "../src/source/useFrontendData";
import { useServerData } from "../src/source/useServerData";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
}
const rows = [{ id: "a", name: "Ada" }];
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing export lifetime fixture");
  return value;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe.each(["frontend", "server"] as const)(
  "export source ownership: %s",
  (kind) => {
    it.each(["resolve", "reject"] as const)(
      "retains refreshes and callback wrappers, then retires a replaced source before late %s",
      async (outcome) => {
        const scope = effectScope();
        const data = shallowRef<readonly Row[]>(rows);
        const wrapper = shallowRef(0);
        const make = (): Readonly<ShallowRef<TableSource<Row>>> =>
          kind === "frontend"
            ? useFrontendData({
                data,
                columns: [{ key: "name" }],
                urlSync: false,
              })
            : useServerData({ rows: data, total: 10, urlSync: false });
        const first = required(scope.run(make));
        const second = required(scope.run(make));
        const selected = shallowRef({ source: first });
        const source = computed(() => {
          toValue(wrapper);
          const current = selected.value.source.value;
          return {
            ...current,
            setSearch: (value: string) => current.setSearch(value),
            refetch: () => current.refetch?.(),
          };
        });
        const job = deferred<{ url: string }>();
        let controls: ExportAllControls | undefined;
        const feature = extendFeature(
          exportCsv<Row>({
            scope: "all",
            onExportAll: (_query, control) => {
              controls = control;
              return job.promise;
            },
          }),
          [slotRender(EXPORT_CONTROL, () => null)]
        );
        const shell = required(
          scope.run(() =>
            useDataTableShell({
              source,
              columns: [{ key: "name" }],
              rowKey: (row: Row) => row.id,
              features: [feature],
              urlSync: false,
            })
          )
        );
        try {
          required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
          expect(required(controls).signal.aborted).toBe(false);
          data.value = [...rows, { id: "g", name: "Grace" }];
          wrapper.value++;
          expect(required(controls).signal.aborted).toBe(false);
          expect(required(shell.state.get(EXPORT_MODEL).value).exportBusy).toBe(
            true
          );
          selected.value = { source: second };
          expect(required(controls).signal.aborted).toBe(true);
          if (outcome === "resolve") job.resolve({ url: "/stale.csv" });
          else job.reject(new Error("Old source failed"));
          await Promise.resolve();
          await Promise.resolve();
          const model = required(shell.state.get(EXPORT_MODEL).value);
          expect(model.exportBusy).toBe(false);
          expect(model.exportStatus).toBe("idle");
          expect(model.exportProgressState?.downloadUrl).toBeUndefined();
          expect(model.exportAnnouncement).not.toContain("Old source failed");
        } finally {
          scope.stop();
        }
      }
    );
  }
);

describe("custom source mutator retirement", () => {
  it("conservatively cancels when an engine-free source replaces its page mutator", async () => {
    const scope = effectScope();
    const original = required(
      scope.run(() => useServerData({ rows, total: 10, urlSync: false }))
    );
    const source = shallowRef(original.value);
    const job = deferred<{ url: string }>();
    let controls: ExportAllControls | undefined;
    const feature = extendFeature(
      exportCsv<Row>({
        scope: "all",
        onExportAll: (_query, control) => {
          controls = control;
          return job.promise;
        },
      }),
      [slotRender(EXPORT_CONTROL, () => null)]
    );
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          source,
          columns: [{ key: "name" }],
          rowKey: (row: Row) => row.id,
          features: [feature],
          urlSync: false,
        })
      )
    );
    try {
      required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
      source.value = { ...original.value, setPage: vi.fn() };
      expect(required(controls).signal.aborted).toBe(true);
      job.resolve({ url: "/retired.csv" });
      await Promise.resolve();
      await Promise.resolve();
      expect(required(shell.state.get(EXPORT_MODEL).value).exportStatus).toBe(
        "idle"
      );
    } finally {
      scope.stop();
    }
  });
});

describe("export disposal", () => {
  it.each(["resolve", "reject"] as const)(
    "retires callbacks before a pending host job's late %s",
    async (outcome) => {
      const scope = effectScope();
      const job = deferred<{ url: string }>();
      let controls: ExportAllControls | undefined;
      const run = vi.fn<NonNullable<ExportCsvOptions<Row>["onExportAll"]>>(
        (_query, control) => {
          controls = control;
          return job.promise;
        }
      );
      const feature = extendFeature(
        exportCsv<Row>({ scope: "all", onExportAll: run }),
        [slotRender(EXPORT_CONTROL, () => null)]
      );
      const shell = required(
        scope.run(() =>
          useDataTableShell({
            data: rows,
            columns: [{ key: "name" }],
            rowKey: (row: Row) => row.id,
            features: [feature],
            urlSync: false,
          })
        )
      );
      const retained = required(
        shell.state.get(EXPORT_MODEL).value
      ).onExportCsv;
      retained?.();
      scope.stop();
      expect(required(controls).signal.aborted).toBe(true);
      retained?.();
      expect(run).toHaveBeenCalledOnce();
      if (outcome === "resolve") job.resolve({ url: "/disposed.csv" });
      else job.reject(new Error("Disposed job failed"));
      await Promise.resolve();
      await Promise.resolve();
      expect(run).toHaveBeenCalledOnce();
    }
  );
});

describe("non-cancelable host request retirement", () => {
  it.each(["resolve", "reject"] as const)(
    "ignores a replaced source request's late %s without claiming to undo its side effect",
    async (outcome) => {
      const scope = effectScope();
      const first = required(
        scope.run(() => useServerData({ rows, total: 10, urlSync: false }))
      );
      const second = required(
        scope.run(() => useServerData({ rows, total: 20, urlSync: false }))
      );
      const source = shallowRef(first.value);
      const job = deferred<void>();
      const request = vi.fn(() => job.promise);
      const feature = extendFeature(exportCsv<Row>({ request }), [
        slotRender(EXPORT_CONTROL, () => null),
      ]);
      const shell = required(
        scope.run(() =>
          useDataTableShell({
            source,
            columns: [{ key: "name" }],
            rowKey: (row: Row) => row.id,
            features: [feature],
            urlSync: false,
          })
        )
      );
      try {
        required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
        source.value = second.value;
        expect(request).toHaveBeenCalledOnce();
        expect(required(shell.state.get(EXPORT_MODEL).value).exportStatus).toBe(
          "idle"
        );
        if (outcome === "resolve") job.resolve();
        else job.reject(new Error("Old request failed"));
        await Promise.resolve();
        await Promise.resolve();
        expect(required(shell.state.get(EXPORT_MODEL).value).exportStatus).toBe(
          "idle"
        );
        expect(request).toHaveBeenCalledOnce();
      } finally {
        scope.stop();
      }
    }
  );
});

describe("retained export control ownership", () => {
  it.each(["busy", "failed"] as const)(
    "keeps retired %s controls from acting on a replacement job",
    async (status) => {
      const scope = effectScope();
      const first = required(
        scope.run(() => useServerData({ rows, total: 10, urlSync: false }))
      );
      const second = required(
        scope.run(() => useServerData({ rows, total: 20, urlSync: false }))
      );
      const source = shallowRef(first.value);
      const jobs = [deferred<{ url: string }>(), deferred<{ url: string }>()];
      const controls: ExportAllControls[] = [];
      const feature = extendFeature(
        exportCsv<Row>({
          scope: "all",
          onExportAll: (_query, control) => {
            controls.push(control);
            return required(jobs[controls.length - 1]).promise;
          },
        }),
        [slotRender(EXPORT_CONTROL, () => null)]
      );
      const shell = required(
        scope.run(() =>
          useDataTableShell({
            source,
            columns: [{ key: "name" }],
            rowKey: (row: Row) => row.id,
            features: [feature],
            urlSync: false,
          })
        )
      );
      try {
        required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
        if (status === "failed") {
          required(jobs[0]).reject(new Error("First job failed"));
          await Promise.resolve();
          await Promise.resolve();
        }
        const retired = required(shell.state.get(EXPORT_MODEL).value);
        expect(retired.exportStatus).toBe(status);
        source.value = second.value;
        required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
        retired.onExportCsv?.();
        retired.exportProgressState?.onCancel?.();
        retired.exportProgressState?.onRetry?.();
        retired.exportProgressState?.onDismiss?.();
        expect(controls).toHaveLength(2);
        expect(required(controls[1]).signal.aborted).toBe(false);
        expect(required(shell.state.get(EXPORT_MODEL).value).exportStatus).toBe(
          "busy"
        );
        if (status === "busy") required(jobs[0]).resolve({ url: "/old.csv" });
      } finally {
        scope.stop();
      }
    }
  );
});

describe("reentrant source retirement", () => {
  it("retires reentrant old controls and preserves the newest published controller", async () => {
    const scope = effectScope();
    const make = (name: string) =>
      required(
        scope.run(() =>
          useServerData({
            rows: [{ id: name, name }],
            total: 10,
            urlSync: false,
          })
        )
      );
    const first = make("first");
    const second = make("second");
    const newest = make("newest");
    const source = shallowRef(first.value);
    const jobs = [
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
    ];
    const controls: ExportAllControls[] = [];
    const feature = extendFeature(
      exportCsv<Row>({
        scope: "all",
        onExportAll: (_query, control) => {
          controls.push(control);
          return required(jobs[controls.length - 1]).promise;
        },
      }),
      [slotRender(EXPORT_CONTROL, () => null)]
    );
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          source,
          columns: [{ key: "name" }],
          rowKey: (row: Row) => row.id,
          features: [feature],
          urlSync: false,
        })
      )
    );
    required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
    let admissionsDuringCleanup = -1;
    required(controls[0]).signal.addEventListener(
      "abort",
      () => {
        source.value = newest.value;
        // The previously published action belongs to the retiring controller.
        // A replacement model is published after the cleanup stack unwinds.
        required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
        admissionsDuringCleanup = controls.length;
      },
      { once: true }
    );
    source.value = second.value;
    expect(admissionsDuringCleanup).toBe(1);
    expect(shell.source.value.setPage).toBe(newest.value.setPage);
    required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
    expect(controls).toHaveLength(2);
    expect(required(controls[1]).signal.aborted).toBe(false);
    expect(required(shell.state.get(EXPORT_MODEL).value).exportBusy).toBe(true);
    required(jobs[0]).resolve({ url: "/stale-first.csv" });
    await Promise.resolve();
    await Promise.resolve();
    expect(required(shell.state.get(EXPORT_MODEL).value).exportBusy).toBe(true);
    // Returning to the intermediate owner must still retire the current job.
    // This catches differing watch oldValue ordering across supported Vue versions.
    source.value = second.value;
    expect(required(controls[1]).signal.aborted).toBe(true);
    expect(required(shell.state.get(EXPORT_MODEL).value).exportStatus).toBe(
      "idle"
    );
    required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
    expect(controls).toHaveLength(3);
    expect(required(controls[2]).signal.aborted).toBe(false);
    scope.stop();
    expect(required(controls[2]).signal.aborted).toBe(true);
  });
});

describe("reentrant feature replacement", () => {
  it("rejects a retiring feature's abort-time action before scope cleanup callbacks finish", () => {
    const scope = effectScope();
    const jobs = [deferred<{ url: string }>(), deferred<{ url: string }>()];
    const controls: ExportAllControls[] = [];
    const run = vi.fn<NonNullable<ExportCsvOptions<Row>["onExportAll"]>>(
      (_query, control) => {
        controls.push(control);
        return required(jobs[controls.length - 1]).promise;
      }
    );
    const make = () =>
      extendFeature(exportCsv<Row>({ scope: "all", onExportAll: run }), [
        slotRender(EXPORT_CONTROL, () => null),
      ]);
    const features = shallowRef([make()]);
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          columns: [{ key: "name" }],
          rowKey: (row: Row) => row.id,
          features,
          urlSync: false,
        })
      )
    );
    try {
      const retired = required(shell.state.get(EXPORT_MODEL).value).onExportCsv;
      retired?.();
      required(controls[0]).signal.addEventListener(
        "abort",
        () => retired?.(),
        { once: true }
      );
      features.value = [make()];
      expect(required(controls[0]).signal.aborted).toBe(true);
      expect(run).toHaveBeenCalledOnce();
      required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
      expect(run).toHaveBeenCalledTimes(2);
      expect(required(controls[1]).signal.aborted).toBe(false);
    } finally {
      scope.stop();
    }
    expect(required(controls[1]).signal.aborted).toBe(true);
  });
});

interface TreeExportRow extends Row {
  children?: readonly TreeExportRow[];
  parent?: string;
}

it.each(["nested", "parent-id"] as const)(
  "exports off-page %s rows with current readers and retires removed trees",
  (kind) => {
    const firstChild: TreeExportRow = {
      id: "first-child",
      name: "First child",
      parent: "first",
    };
    const secondChild: TreeExportRow = {
      id: "second-child",
      name: "Second child",
      parent: "second",
    };
    const roots: readonly TreeExportRow[] = [
      { id: "first", name: "First", children: [firstChild] },
      { id: "second", name: "Second", children: [secondChild] },
    ];
    const data =
      kind === "nested" ? roots : [...roots, firstChild, secondChild];
    const request = vi.fn<(info: ExportRequest<TreeExportRow>) => void>();
    const exporter = extendFeature(
      exportCsv<TreeExportRow>({ scope: "all", request }),
      [slotRender(EXPORT_CONTROL, () => null)]
    );
    const features = shallowRef<readonly ComposedFeature<TreeExportRow>[]>([
      tree<TreeExportRow>(
        kind === "nested"
          ? { getChildren: (row) => row.children }
          : { getParentId: (row) => row.parent }
      ),
      exporter,
    ]);
    const scope = effectScope();
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data,
          columns: [{ key: "name" }],
          rowKey: (row: TreeExportRow) => row.id,
          defaults: { limit: 1 },
          features,
          urlSync: false,
        })
      )
    );
    const exportedIds = () =>
      request.mock.lastCall?.[0].rows.map((row) => row.id);
    const run = () =>
      required(shell.state.get(EXPORT_MODEL).value).onExportCsv?.();
    try {
      expect(shell.source.value.rows.map((row) => row.id)).toEqual(["first"]);
      const runtimeEntries = required(shell.tree.value).allEntries;
      run();
      expect(exportedIds()).toEqual([
        "first",
        "first-child",
        "second",
        "second-child",
      ]);
      expect(required(shell.tree.value).allEntries).toBe(runtimeEntries);
      features.value = [
        tree<TreeExportRow>(
          kind === "nested"
            ? { getChildren: () => undefined }
            : { getParentId: () => undefined }
        ),
        exporter,
      ];
      run();
      expect(exportedIds()).toEqual(data.map((row) => row.id));
      features.value = [exporter];
      expect(shell.tree.value).toBeUndefined();
      run();
      expect(exportedIds()).toEqual(data.map((row) => row.id));
      expect(request).toHaveBeenCalledTimes(3);
    } finally {
      scope.stop();
    }
  }
);
