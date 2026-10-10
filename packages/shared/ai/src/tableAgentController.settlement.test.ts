import {
  createNeutralTable,
  createTableEngine,
  initialColumnLayout,
  type TableEngine,
  withColumnMoved,
} from "@adapttable/core";
import type { TableRuntime, TableRuntimeView } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTableAgentController,
  type TableAgentControllerInputs,
  type TableAgentControllerOptions,
} from "./tableAgentController";
import type { AgentCapabilityDefinition, AgentObservation } from "./types";

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((done, failed) => {
    resolve = done;
    reject = failed;
  });
  return { promise, resolve, reject };
}
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((close) => close()));

function idOf(row: unknown): string {
  return String((row as { id: string }).id);
}
function engineFor(rows: readonly unknown[]) {
  const engine = createTableEngine<unknown>({
    data: rows,
    rowKey: idOf,
    columns: [{ key: "a" }, { key: "b" }, { key: "c" }],
  });
  cleanup.push(engine.dispose);
  return engine;
}
function tableFor(engine: TableEngine<unknown>) {
  return createNeutralTable(engine, "people", {
    operations: () => ({
      pinColumn: true,
      hideColumn: true,
      moveColumn: true,
      setColumnOrder: true,
      setSelection: true,
    }),
  });
}

function harness(
  tier: "engine" | "server",
  rows: readonly unknown[] = [{ id: "1", a: "A", b: "B", c: "C" }]
) {
  const engine = tier === "engine" ? engineFor(rows) : undefined;
  let alive = true;
  let state: TableRuntimeView;
  const requests: (() => void)[] = [];
  const setHidden = vi.fn((key: string, hidden: boolean) => {
    const layout = state.columnLayout;
    if (!layout) throw new Error("missing layout");
    const ids = new Set(layout.hidden);
    if (hidden) ids.add(key);
    else ids.delete(key);
    requests.push(() => {
      state = { ...state, columnLayout: { ...layout, hidden: [...ids] } };
    });
  });
  const setOrder = vi.fn((keys: readonly string[]) => {
    const layout = state.columnLayout;
    if (!layout) throw new Error("missing layout");
    const next = [...keys];
    requests.push(() => {
      state = { ...state, columnLayout: { ...layout, keys: next } };
    });
  });
  const move = vi.fn((key: string, index: number) => {
    const keys = state.columnLayout?.keys ?? [];
    const next = withColumnMoved(
      initialColumnLayout({ order: keys }),
      keys,
      key,
      index
    );
    if (next) setOrder(next.order);
  });
  const replace = vi.fn((ids: readonly string[] | undefined) => {
    const selection = state.selection;
    if (!selection) throw new Error("missing selection");
    const next = new Set(ids);
    requests.push(() => {
      state = {
        ...state,
        selection: { ...selection, selectedIds: next, allMatching: false },
      };
    });
  });
  const setColumnPin = vi.fn(
    (key: string, side: "start" | "end" | undefined) => {
      const pinning = state.pinning;
      if (!pinning) throw new Error("missing pinning");
      const columns =
        side === undefined
          ? Object.fromEntries(
              Object.entries(pinning.columns).filter(([id]) => id !== key)
            )
          : { ...pinning.columns, [key]: side };
      requests.push(() => {
        state = { ...state, pinning: { ...pinning, columns } };
      });
    }
  );
  state = {
    rows,
    getRowId: idOf,
    rowLabel: idOf,
    neutralTable: engine ? tableFor(engine) : undefined,
    query: {
      page: 1,
      limit: 10,
      search: "",
      setPage: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      setSort: vi.fn(),
    },
    columnLayout: {
      keys: ["a", "b", "c"],
      hidden: [],
      setHidden,
      setOrder,
      move,
    },
    selection: {
      selectedIds: new Set(["1"]),
      allMatching: false,
      acrossPages: true,
      replace,
    },
    pinning: { columns: {}, rows: { top: [], bottom: [] }, setColumnPin },
  };
  const read = vi.fn(() => {
    if (!alive) throw new Error("disposed runtime read");
    return state;
  });
  const runtime: TableRuntime = {
    view: read,
    rowAt: (index) => read().rows[index],
    labels: () => undefined,
    featureIds: () => [],
  };
  const options: { current: TableAgentControllerOptions } = {
    current: {
      tableId: "people",
      approval: "never",
      readMax: 50,
      columns: {
        a: { type: "string" },
        b: { type: "string" },
        c: { type: "string" },
      },
    },
  };
  type Capture = Parameters<
    NonNullable<TableAgentControllerInputs["settleApply"]>
  >[0];
  const deliveries: { capture: Capture; gate: ReturnType<typeof deferred> }[] =
    [];
  const flush = vi.fn((run: () => void) => run());
  const admission = vi.fn();
  const settlement = vi.fn((capture: Capture) => {
    const gate = deferred();
    deliveries.push({ capture, gate });
    return gate.promise;
  });
  const controller = createTableAgentController({
    options,
    runtime: { current: runtime },
    flushAdmission: admission,
    flush,
    settleApply: settlement,
  });
  cleanup.push(controller.disconnect);
  let calls = 0;
  const session = () => controller.session();
  const revision = () => session().manifest().viewRevision;
  const run = (
    key: string,
    args: unknown,
    expected = revision(),
    id?: string
  ) => {
    calls += 1;
    return session().execute(key, args, expected, id ?? `request-${calls}`);
  };
  const delivery = (index: number) => {
    const entry = deliveries[index];
    if (!entry) throw new Error(`missing delivery ${index}`);
    return entry;
  };
  const publish = (index: number) => {
    const request = requests[index];
    if (!request) throw new Error(`missing request ${index}`);
    request();
  };
  const deliver = (index: number, accepted = true) => {
    const entry = delivery(index);
    entry.capture(accepted ? () => publish(index) : undefined);
    entry.gate.resolve();
  };
  return {
    controller,
    options,
    session,
    revision,
    run,
    read,
    flush,
    admission,
    settlement,
    deliveries,
    delivery,
    publish,
    deliver,
    setHidden,
    setOrder,
    move,
    replace,
    setColumnPin,
    state: () => state,
    setRows: (next: readonly unknown[]) => {
      state = { ...state, rows: next };
    },
    setSource: (neutralTable: TableRuntimeView["neutralTable"]) => {
      state = { ...state, neutralTable };
    },
    scope: (allMatching: boolean) => {
      if (!state.selection) throw new Error("missing selection");
      state = { ...state, selection: { ...state.selection, allMatching } };
    },
    replaceSource: () => {
      state = { ...state, neutralTable: tableFor(engineFor(rows)) };
    },
    foreign: () => {
      state = { ...state, rows: [{ id: "1", a: "foreign", b: "B", c: "C" }] };
      engine?.invalidate(["data"]);
    },
    dispose: () => {
      alive = false;
    },
  };
}
async function delivered(h: ReturnType<typeof harness>, index = 0) {
  await vi.waitFor(() => expect(h.deliveries.length).toBeGreaterThan(index));
}

const operations = [
  {
    key: "view.hideColumn",
    args: { key: "a", hidden: true },
    field: "hidden",
    target: ["a"],
  },
  {
    key: "view.setColumnOrder",
    args: { order: ["c", "a", "b"] },
    field: "keys",
    target: ["c", "a", "b"],
  },
  {
    key: "view.setColumnOrder",
    args: { key: "a", index: 2 },
    field: "keys",
    target: ["b", "c", "a"],
  },
] as const;

describe.each(["engine", "server"] as const)(
  "%s controller-to-live settlement wiring",
  (tier) => {
    it.each(operations)(
      "delivers $key through the optional hook and supports its returned revision",
      async (operation) => {
        const h = harness(tier);
        const before = h.revision();
        const running = h.run(operation.key, operation.args);
        await delivered(h);
        expect(h.flush).toHaveBeenCalledTimes(1);
        expect(h.settlement).toHaveBeenCalledTimes(1);
        expect(h.admission).toHaveBeenCalledTimes(1);
        h.deliver(0);
        const result = await running;
        expect(result).toMatchObject({
          ok: true,
          revision: before + 1,
          result: { revision: before + 1 },
        });
        expect(h.state().columnLayout?.[operation.field]).toEqual(
          operation.target
        );
        const next = h.run(
          "view.setSelection",
          { ids: ["2"] },
          result.revision
        );
        await delivered(h, 1);
        h.deliver(1);
        expect(await next).toMatchObject({ ok: true, revision: before + 2 });
      }
    );

    it("confirms a real no-op at the unchanged captured revision", async () => {
      const h = harness(tier);
      const before = h.revision();
      const running = h.run("view.hideColumn", { key: "a", hidden: false });
      await delivered(h);
      h.deliver(0);
      expect(await running).toMatchObject({
        ok: true,
        revision: before,
        result: { revision: before },
      });
      expect(h.setHidden).toHaveBeenCalledTimes(1);
    });

    it("recognizes allMatching narrowing with unchanged IDs as a change", async () => {
      const h = harness(tier);
      h.scope(true);
      const before = h.revision();
      const running = h.run("view.setSelection", { ids: ["1"] });
      await delivered(h);
      h.deliver(0);
      expect(await running).toMatchObject({ ok: true, revision: before + 1 });
      expect(h.state().selection?.allMatching).toBe(false);
    });

    it("refuses an unchanged authoritative target after the host ignores its setter", async () => {
      const h = harness(tier);
      const before = h.revision();
      const running = h.run("view.hideColumn", { key: "a", hidden: true });
      await delivered(h);
      h.deliver(0, false);
      expect(await running).toMatchObject({
        ok: false,
        revision: before,
        error: { code: "apply-not-confirmed" },
      });
      expect(h.state().columnLayout?.hidden).toEqual([]);
    });

    it("preserves an explicit host override's asynchronous acknowledgment path", async () => {
      const h = harness(tier);
      const gate = deferred();
      const host = vi.fn((): unknown => gate.promise);
      h.options.current = { ...h.options.current, apply: { hideColumn: host } };
      let terminal = false;
      const running = h
        .run("view.hideColumn", { key: "a", hidden: true })
        .then((result) => {
          terminal = true;
          return result;
        });
      await vi.waitFor(() => expect(host).toHaveBeenCalledOnce());
      expect(terminal).toBe(false);
      expect(h.setHidden).not.toHaveBeenCalled();
      expect(h.settlement).not.toHaveBeenCalled();
      expect(h.flush).not.toHaveBeenCalled();
      gate.resolve();
      expect(await running).toMatchObject({ ok: true });
    });

    it("refuses a source with a replacement identity during delivery", async () => {
      const h = harness(tier);
      const before = h.revision();
      const running = h.run("view.hideColumn", { key: "a", hidden: true });
      await delivered(h);
      h.publish(0);
      h.replaceSource();
      h.delivery(0).capture();
      h.delivery(0).gate.resolve();
      expect(await running).toMatchObject({
        ok: false,
        revision: before,
        error: { code: "revision-mismatch" },
      });
    });

    it("refuses a changed declared contract during delivery", async () => {
      const h = harness(tier);
      const before = h.revision();
      const running = h.run("view.hideColumn", { key: "a", hidden: true });
      await delivered(h);
      h.options.current = { ...h.options.current, readMax: 2 };
      h.deliver(0);
      expect(await running).toMatchObject({
        ok: false,
        revision: before,
        error: { code: "revision-mismatch" },
      });
    });

    it("disconnects a pending hook before late delivery can reconcile disposed state", async () => {
      const h = harness(tier);
      const before = h.revision();
      const running = h.run("view.hideColumn", { key: "a", hidden: true });
      await delivered(h);
      h.dispose();
      const reads = h.read.mock.calls.length;
      h.controller.disconnect();
      expect(await running).toMatchObject({
        ok: false,
        revision: before,
        error: { code: "cancelled" },
      });
      const reconcile = vi.fn(() => h.read());
      h.delivery(0).capture(reconcile);
      h.delivery(0).gate.reject(new Error("late failure"));
      await Promise.resolve();
      await Promise.resolve();
      expect(reconcile).not.toHaveBeenCalled();
      expect(h.read).toHaveBeenCalledTimes(reads);
    });

    it("keeps the captured revision when a foreign change lands before the hook promise completes", async () => {
      const h = harness(tier);
      const before = h.revision();
      const args = { key: "a", hidden: true };
      const running = h.run("view.hideColumn", args, before, "isolated");
      await delivered(h);
      h.delivery(0).capture(() => h.publish(0));
      await Promise.resolve();
      h.foreign();
      expect(h.revision()).toBe(before + 2);
      h.delivery(0).gate.resolve();
      const result = await running;
      expect(result).toMatchObject({
        ok: true,
        revision: before + 1,
        result: { revision: before + 1 },
      });
      expect(
        await h.session().execute("view.hideColumn", args, before, "isolated")
      ).toEqual(result);
      expect(
        await h.run("view.setSelection", { ids: ["2"] }, result.revision)
      ).toMatchObject({ ok: false, error: { code: "revision-mismatch" } });
    });
  }
);

it("actual controller wiring drains ignored dependent custom setters in order", async () => {
  const h = harness("engine");
  const capability: AgentCapabilityDefinition = {
    key: "custom.hide",
    summary: "Hide two columns",
    guide: {
      guide: "Hide two columns",
      input: { type: "object" },
      output: { type: "object" },
    },
    isEnabled: () => true,
    execute(context) {
      context.apply.hideColumn?.("a", true);
      context.apply.hideColumn?.("b", true);
      return { done: true };
    },
  };
  h.options.current = { ...h.options.current, capabilities: [capability] };
  const before = h.revision();
  const running = h.run(capability.key, {});
  await delivered(h);
  expect(h.setHidden).toHaveBeenCalledTimes(1);
  h.deliver(0);
  await delivered(h, 1);
  h.deliver(1);
  expect(await running).toMatchObject({
    ok: true,
    revision: before + 2,
    result: { done: true },
  });
  expect(h.state().columnLayout?.hidden).toEqual(["a", "b"]);
});

describe.each(["engine", "server"] as const)(
  "%s controlled column pin wiring",
  (tier) => {
    it("captures pin/no-op/unpin revisions from authoritative delivery", async () => {
      const h = harness(tier);
      let revision = h.revision();
      for (const [index, side, changed] of [
        [0, "start", true],
        [1, "start", false],
        [2, null, true],
      ] as const) {
        const running = h.run("view.pinColumn", { key: "a", side }, revision);
        await delivered(h, index);
        h.deliver(index);
        revision += Number(changed);
        expect(await running).toMatchObject({
          ok: true,
          revision,
          result: { revision },
        });
        expect(h.state().pinning?.columns).toEqual(side ? { a: side } : {});
      }
      expect(h.setColumnPin).toHaveBeenCalledTimes(3);
      expect(h.settlement).toHaveBeenCalledTimes(3);
    });
    it("does not turn a refused pin into an executed receipt", async () => {
      const h = harness(tier);
      const revision = h.revision();
      const running = h.run(
        "view.pinColumn",
        { key: "a", side: "start" },
        revision
      );
      await delivered(h);
      h.deliver(0, false);
      expect(await running).toMatchObject({
        ok: false,
        revision,
        error: { code: "apply-not-confirmed" },
      });
      expect(h.state().pinning?.columns).toEqual({});
    });
  }
);

it("reserves an explicit async apply callback before cancellation can make its key retryable", async () => {
  const h = harness("server");
  const gate = deferred();
  const host = vi.fn((): unknown => gate.promise);
  h.options.current = { ...h.options.current, apply: { hideColumn: host } };
  h.controller.sync();
  const session = h.session();
  const abort = new AbortController();
  const revision = h.revision();
  const first = session.execute(
    "view.hideColumn",
    { key: "a", hidden: true },
    revision,
    "host-once",
    abort.signal
  );
  await vi.waitFor(() => expect(host).toHaveBeenCalledTimes(1));
  abort.abort();
  expect(await first).toMatchObject({
    ok: false,
    error: { code: "cancelled" },
  });
  const replay = session.execute(
    "view.hideColumn",
    { key: "a", hidden: true },
    revision,
    "host-once"
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(host).toHaveBeenCalledTimes(1);
  expect(await replay).toMatchObject({
    ok: false,
    error: { code: "cancelled" },
  });
  for (let index = 0; index < 205; index += 1)
    await session.execute("columns.describe", {}, revision, `read-${index}`);
  expect(
    await session.execute(
      "view.hideColumn",
      { key: "a", hidden: true },
      revision,
      "host-once"
    )
  ).toMatchObject({ ok: false, error: { code: "replay-expired" } });
  expect(host).toHaveBeenCalledTimes(1);
  gate.resolve();
});

it.each(["URL", "ABA"] as const)(
  "refuses an observed foreign server %s change during controlled delivery",
  async (kind) => {
    const original = [
      {
        id: "1",
        a: kind === "URL" ? new URL("https://example.test/old") : "A",
        b: "B",
        c: "C",
      },
    ];
    const h = harness("server", original);
    const revision = h.revision();
    const running = h.run(
      "view.hideColumn",
      { key: "a", hidden: true },
      revision
    );
    await delivered(h);
    h.setRows([
      {
        id: "1",
        a: kind === "URL" ? new URL("https://example.test/FOREIGN") : "FOREIGN",
        b: "B",
        c: "C",
      },
    ]);
    expect(h.revision()).toBeGreaterThan(revision);
    if (kind === "ABA") {
      h.setRows(original);
      expect(h.revision()).toBeGreaterThan(revision + 1);
    }
    h.deliver(0);
    expect(await running).toMatchObject({
      ok: false,
      revision,
      error: { code: "revision-mismatch" },
    });
  }
);

it("preserves the core clamped move semantics for a custom capability", async () => {
  const h = harness("server");
  const capability: AgentCapabilityDefinition = {
    key: "test.move",
    summary: "Move",
    guide: {
      guide: "Move",
      input: { type: "object" },
      output: { type: "object" },
    },
    isEnabled: () => true,
    execute: ({ apply }) => {
      apply.moveColumn?.("a", 99);
      return {};
    },
  };
  h.options.current = { ...h.options.current, capabilities: [capability] };
  h.controller.sync();
  const revision = h.revision();
  const running = h.run(capability.key, {}, revision);
  await Promise.resolve();
  await Promise.resolve();
  expect(h.move).toHaveBeenCalledWith("a", 99);
  await delivered(h);
  h.deliver(0);
  expect(await running).toMatchObject({ ok: true, revision: revision + 1 });
  expect(h.state().columnLayout?.keys).toEqual(
    withColumnMoved(initialColumnLayout(undefined), ["a", "b", "c"], "a", 99)
      ?.order
  );
});

it("does not read unrelated row getters when the engine owns revisions", async () => {
  let reads = 0;
  const row = {
    id: "1",
    a: "A",
    b: "B",
    c: "C",
    get unrelated() {
      reads += 1;
      throw new Error("unrelated getter");
    },
  };
  const h = harness("engine", [row]);
  const revision = h.revision();
  const running = h.run(
    "view.hideColumn",
    { key: "a", hidden: true },
    revision
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(reads).toBe(0);
  await delivered(h);
  h.deliver(0);
  expect(await running).toMatchObject({ ok: true, revision: revision + 1 });
  expect(reads).toBe(0);
});

function customObservation(
  h: ReturnType<typeof harness>,
  revision: () => number
): () => AgentObservation {
  const manifest = h.session().manifest();
  return () => ({
    tableId: "people",
    viewRevision: revision(),
    featureIds: [],
    columns: manifest.columns,
    source: manifest.source,
    writePolicy: "deny",
    approval: "never",
    hasPagination: false,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    hasColumnHide: true,
    page: 1,
    limit: 10,
    search: "",
    rowAddressScope: "visible",
    pageMax: 1,
    hiddenColumns: h.state().columnLayout?.hidden,
  });
}
it("preserves a custom non-unit observation revision and a subsequent no-op", async () => {
  const h = harness("server");
  let revision = 7;
  const observe = customObservation(h, () => revision);
  h.options.current = { ...h.options.current, observe };
  h.controller.sync();
  expect(h.revision()).toBe(7);
  const first = h.run("view.hideColumn", { key: "a", hidden: true }, 7);
  await delivered(h);
  revision = 700;
  h.deliver(0);
  expect(await first).toMatchObject({
    ok: true,
    revision: 700,
    result: { revision: 700 },
  });
  const noop = h.run("view.hideColumn", { key: "a", hidden: true }, 700);
  await delivered(h, 1);
  h.deliver(1);
  expect(await noop).toMatchObject({
    ok: true,
    revision: 700,
    result: { revision: 700 },
  });
});
it("does not accept decreasing custom observation revisions", async () => {
  const h = harness("server");
  let revision = 7;
  h.options.current = {
    ...h.options.current,
    observe: customObservation(h, () => revision),
  };
  h.controller.sync();
  const running = h.run("view.hideColumn", { key: "a", hidden: true }, 7);
  await delivered(h);
  revision = 6;
  h.deliver(0);
  expect(await running).toMatchObject({
    ok: false,
    revision: 7,
    error: { code: "revision-mismatch" },
  });
});
it("tracks source ABA even when custom observation numbers stay fixed between sources", async () => {
  const h = harness("server");
  let revision = 7;
  h.options.current = {
    ...h.options.current,
    observe: customObservation(h, () => revision),
  };
  h.controller.sync();
  const source = h.state().neutralTable;
  const running = h.run("view.hideColumn", { key: "a", hidden: true }, 7);
  await delivered(h);
  h.replaceSource();
  expect(h.revision()).toBe(7);
  h.setSource(source);
  expect(h.revision()).toBe(7);
  revision = 17;
  h.deliver(0);
  expect(await running).toMatchObject({
    ok: false,
    revision: 7,
    error: { code: "revision-mismatch" },
  });
});
it("does not traverse 100,000 row payloads during engine-backed delivery", async () => {
  let reads = 0;
  const data = Array.from({ length: 100_000 }, (_, id) => ({
    get id() {
      reads += 1;
      return String(id);
    },
    a: "A",
    b: "B",
    c: "C",
    d: 4,
    e: 5,
    f: 6,
    g: 7,
    h: 8,
    get unrelated() {
      reads += 1;
      return 9;
    },
  }));
  const work = { rowAccesses: 0, traversalLookups: 0, enumerations: 0 };
  const traversals = new Set<PropertyKey>([
    Symbol.iterator,
    "map",
    "forEach",
    "entries",
    "values",
    "keys",
    "filter",
    "reduce",
    "reduceRight",
    "some",
    "every",
    "find",
    "findIndex",
    "findLast",
    "findLastIndex",
    "slice",
    "includes",
    "indexOf",
    "lastIndexOf",
    "at",
  ]);
  const isIndex = (key: PropertyKey): boolean =>
    typeof key === "string" && /^(0|[1-9]\d*)$/.test(key);
  const rows = new Proxy(data, {
    get(target, key, receiver): unknown {
      if (isIndex(key)) work.rowAccesses += 1;
      if (traversals.has(key)) work.traversalLookups += 1;
      const value: unknown = Reflect.get(target, key, receiver);
      return value;
    },
    has(target, key) {
      if (isIndex(key)) work.rowAccesses += 1;
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      work.enumerations += 1;
      return Reflect.ownKeys(target);
    },
  });
  const h = harness("engine", rows);
  const revision = h.revision();
  reads = 0;
  work.rowAccesses = 0;
  work.traversalLookups = 0;
  work.enumerations = 0;
  const running = h.run(
    "view.hideColumn",
    { key: "a", hidden: true },
    revision
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(h.deliveries).toHaveLength(1);
  h.deliver(0);
  expect(await running).toMatchObject({ ok: true, revision: revision + 1 });
  expect(reads).toBe(0);
  expect(work).toEqual({
    rowAccesses: 0,
    traversalLookups: 0,
    enumerations: 0,
  });
});
