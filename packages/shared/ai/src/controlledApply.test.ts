import type { TableRuntimeView } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ApplyCallLedger,
  ControlledApplyError,
  type ControlledApplyReceipt,
  createLiveApplyCoordinator,
  type LiveApplyInputs,
} from "./controlledApply";
import type { ControlledMethod } from "./controlledApplySnapshot";
import { createAgentSessionInternal } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
} from "./types";

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((done, failed) => {
    resolve = done;
    reject = failed;
  });
  return { promise, resolve, reject };
}
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((close) => close()));

function harness() {
  let revision = 1;
  let alive = true;
  let contract = "initial";
  const retirement = new AbortController();
  let state: TableRuntimeView = {
    rows: [{ id: "1" }],
    getRowId: () => "1",
    rowLabel: () => "One",
    columnLayout: {
      keys: ["a", "b", "c"],
      hidden: [],
      setHidden: vi.fn(),
      setOrder: vi.fn(),
      move: vi.fn(),
    },
    selection: {
      selectedIds: new Set(),
      allMatching: false,
      acrossPages: true,
      replace: vi.fn(),
    },
  };
  const view = vi.fn(() => {
    if (!alive) throw new Error("disposed runtime read");
    return state;
  });
  const observe = vi.fn((): AgentObservation => {
    const current = view();
    return {
      tableId: "people",
      viewRevision: revision,
      featureIds: [],
      columns: ["a", "b", "c"].map((id) => ({
        id,
        label: id,
        type: "string",
        readable: true,
        writable: false,
        sortable: false,
        hideable: true,
        visible: !current.columnLayout?.hidden.includes(id),
      })),
      source: {
        fullDataset: false,
        grouping: false,
        selectAcrossPages: false,
        exportScope: "page",
        totalCount: "loaded",
      },
      writePolicy: "deny",
      approval: "never",
      commit: "immediate",
      hasPagination: false,
      hasSearch: false,
      hasSort: false,
      hasFilters: false,
      hasExport: true,
      hasEdit: false,
      hasReorder: false,
      hasSelection: true,
      hasColumnHide: true,
      hasColumnOrder: true,
      hiddenColumns: current.columnLayout?.hidden,
      columnOrder: current.columnLayout?.keys,
      page: 1,
      limit: 10,
      search: "",
      pageMax: 1,
      rowAddressScope: "visible",
    };
  });
  const pending: (() => void)[] = [];
  const invokes: {
    method: ControlledMethod;
    args: readonly unknown[];
    hidden: readonly string[];
    order: readonly string[];
  }[] = [];
  const deliveries: {
    capture: Parameters<LiveApplyInputs["settle"]>[0];
    gate: ReturnType<typeof deferred<void>>;
  }[] = [];
  const inputs: LiveApplyInputs = {
    view,
    observe,
    contract: () => contract,
    sourceEpoch: () => 0,
    revisionEpoch: () => revision,
    isCurrent: () => alive,
    retirementSignal: retirement.signal,
    bindingOwned: () => true,
    invoke(method, args) {
      const layout = state.columnLayout;
      if (!layout) throw new Error("missing layout");
      invokes.push({
        method,
        args,
        hidden: [...layout.hidden],
        order: [...layout.keys],
      });
      let next = state;
      if (method === "hideColumn") {
        const ids = new Set(layout.hidden);
        if (args[1]) ids.add(String(args[0]));
        else ids.delete(String(args[0]));
        next = { ...state, columnLayout: { ...layout, hidden: [...ids] } };
      } else if (method === "setColumnOrder" || method === "moveColumn") {
        const keys =
          method === "setColumnOrder"
            ? [...(args[0] as readonly string[])]
            : [...layout.keys];
        if (method === "moveColumn") {
          keys.splice(keys.indexOf(String(args[0])), 1);
          keys.splice(Number(args[1]), 0, String(args[0]));
        }
        next = { ...state, columnLayout: { ...layout, keys } };
      } else if (state.selection) {
        next = {
          ...state,
          selection: {
            ...state.selection,
            selectedIds: new Set(args[0] as readonly string[] | undefined),
            allMatching: false,
          },
        };
      }
      const oldStamp = JSON.stringify({
        hidden: state.columnLayout?.hidden,
        keys: state.columnLayout?.keys,
        ids: [...(state.selection?.selectedIds ?? [])],
        allMatching: state.selection?.allMatching,
      });
      const newStamp = JSON.stringify({
        hidden: next.columnLayout?.hidden,
        keys: next.columnLayout?.keys,
        ids: [...(next.selection?.selectedIds ?? [])],
        allMatching: next.selection?.allMatching,
      });
      pending.push(() => {
        state = next;
        if (oldStamp !== newStamp) revision += 1;
      });
    },
    flush: (run) => run(),
    settle(capture) {
      const gate = deferred<void>();
      deliveries.push({ capture, gate });
      return gate.promise;
    },
  };
  const coordinator = createLiveApplyCoordinator(inputs);
  const begin = (signal?: AbortSignal) => {
    const receipts: ControlledApplyReceipt[] = [];
    const reserve = vi.fn();
    const call = coordinator.beginCall({
      admitted: observe(),
      signal,
      guard(expected) {
        if (observe().viewRevision !== expected)
          throw new ControlledApplyError(
            "revision-mismatch",
            "stale baseline",
            expected
          );
      },
      reserveEffect: reserve,
      accept: (receipt) => receipts.push(receipt),
    });
    cleanups.push(call.close);
    return { call, receipts, reserve };
  };
  const delivery = (index: number) => {
    const entry = deliveries[index];
    if (!entry) throw new Error(`missing delivery ${index}`);
    return entry;
  };
  const publish = (index: number) => {
    const apply = pending[index];
    if (!apply) throw new Error(`missing apply ${index}`);
    apply();
  };
  const deliver = async (index: number, accept = true) => {
    if (accept) publish(index);
    const entry = delivery(index);
    entry.capture();
    entry.gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  const progress = vi.fn();
  const session = (
    capabilities: readonly AgentCapabilityDefinition[] = [],
    apply: AgentApply = {},
    replayCacheSize = 1
  ) =>
    createAgentSessionInternal(
      {
        observe,
        apply: {
          hideColumn: vi.fn(),
          moveColumn: vi.fn(),
          setColumnOrder: vi.fn(),
          setSelection: vi.fn(),
          ...apply,
        },
        capabilities,
        replayCacheSize,
        onProgress: progress,
      },
      coordinator
    );
  return {
    inputs,
    progress,
    begin,
    observe,
    view,
    invokes,
    deliveries,
    delivery,
    publish,
    deliver,
    session,
    state: () => state,
    revision: () => revision,
    foreign: () => {
      state = { ...state, rows: [{ id: "1", foreign: true }] };
      revision += 1;
    },
    changeContract: () => {
      contract = "changed";
    },
    dispose: () => {
      alive = false;
    },
    retirement,
  };
}

function submit(
  call: ApplyCallLedger,
  method: ControlledMethod,
  args: readonly unknown[]
) {
  const ticket = call.submit(method, args);
  if (!ticket) throw new Error("expected controlled ticket");
  return ticket.completion;
}
async function started(h: ReturnType<typeof harness>, count = 1) {
  await vi.waitFor(() => expect(h.invokes).toHaveLength(count));
}

function custom(
  execute: AgentCapabilityDefinition["execute"]
): AgentCapabilityDefinition {
  return {
    key: "custom.controlled",
    summary: "Exercise controlled requests",
    guide: {
      guide: "Test controlled view requests",
      input: { type: "object", properties: {} },
      output: {},
    },
    isEnabled: () => true,
    execute,
  };
}

describe("controlled apply lane", () => {
  it("serializes ignored same-call setters and derives each from accepted state", async () => {
    const h = harness();
    const { call, receipts, reserve } = h.begin();
    submit(call, "hideColumn", ["a", true]);
    submit(call, "hideColumn", ["b", true]);
    call.seal();
    expect(h.invokes).toHaveLength(1);
    await h.deliver(0);
    expect(h.invokes).toHaveLength(2);
    expect(h.invokes[1]?.hidden).toEqual(["a"]);
    await h.deliver(1);
    await call.drain();
    expect(h.state().columnLayout?.hidden).toEqual(["a", "b"]);
    expect(receipts.map((receipt) => receipt.producedRevision)).toEqual([2, 3]);
    expect(reserve).toHaveBeenCalledTimes(2);
  });

  it("serializes dependent moves", async () => {
    const h = harness();
    const { call } = h.begin();
    submit(call, "moveColumn", ["a", 2]);
    submit(call, "moveColumn", ["b", 1]);
    await h.deliver(0);
    expect(h.invokes[1]?.order).toEqual(["b", "c", "a"]);
    await h.deliver(1);
    await call.drain();
    expect(h.state().columnLayout?.keys).toEqual(["c", "b", "a"]);
  });

  it("refuses another call's stale queued setter before callback invocation", async () => {
    const h = harness();
    const a = h.begin();
    const b = h.begin();
    submit(a.call, "hideColumn", ["a", true]);
    const rejected = submit(b.call, "hideColumn", ["b", true]).catch(
      (error) => error
    );
    await h.deliver(0);
    expect((await rejected).code).toBe("revision-mismatch");
    expect(h.invokes).toHaveLength(1);
    expect(b.reserve).not.toHaveBeenCalled();
  });

  it("makes first-operation refusal sticky and prevents later callbacks", async () => {
    const h = harness();
    const { call, receipts } = h.begin();
    const first = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    const second = submit(call, "hideColumn", ["b", true]).catch(
      (error) => error
    );
    await h.deliver(0, false);
    expect((await first).code).toBe("apply-not-confirmed");
    expect((await second).code).toBe("apply-not-confirmed");
    await expect(call.whenApplied()).rejects.toMatchObject({
      code: "apply-not-confirmed",
    });
    expect(h.invokes).toHaveLength(1);
    expect(receipts).toEqual([]);
  });

  it("captures a true no-op at its unchanged revision and reserves its invocation", async () => {
    const h = harness();
    const { call, receipts, reserve } = h.begin();
    submit(call, "hideColumn", ["a", false]);
    await h.deliver(0);
    await call.drain();
    expect(receipts).toEqual([
      { ordinal: 1, producedRevision: 1, changed: false },
    ]);
    expect(reserve).toHaveBeenCalledOnce();
  });

  it("keeps capture's revision when a foreign microtask precedes delivery resolution", async () => {
    const h = harness();
    const { call, receipts } = h.begin();
    submit(call, "hideColumn", ["a", true]);
    h.publish(0);
    h.delivery(0).capture();
    await Promise.resolve();
    h.foreign();
    h.delivery(0).gate.resolve();
    await call.drain();
    expect(call.revision).toBe(2);
    expect(receipts[0]?.producedRevision).toBe(2);
    expect(h.revision()).toBe(3);
  });

  it("revalidates a same-call queued setter after a post-capture foreign change", async () => {
    const h = harness();
    const { call } = h.begin();
    submit(call, "hideColumn", ["a", true]);
    const next = submit(call, "hideColumn", ["b", true]).catch(
      (error) => error
    );
    h.publish(0);
    h.delivery(0).capture();
    h.foreign();
    h.delivery(0).gate.resolve();
    expect((await next).code).toBe("revision-mismatch");
    expect(h.invokes).toHaveLength(1);
    expect(call.revision).toBe(2);
  });

  it("refuses a changed contract at capture without adopting its revision", async () => {
    const h = harness();
    const { call, receipts } = h.begin();
    const result = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    h.publish(0);
    h.changeContract();
    h.delivery(0).capture();
    h.delivery(0).gate.resolve();
    expect((await result).code).toBe("revision-mismatch");
    expect(call.revision).toBe(1);
    expect(receipts).toEqual([]);
  });

  it("cancels never-settling delivery without observing disposed state or reviving late capture", async () => {
    const h = harness();
    const abort = new AbortController();
    const { call, receipts } = h.begin(abort.signal);
    submit(call, "hideColumn", ["a", true]);
    submit(call, "hideColumn", ["b", true]);
    const waiting = call
      .race(new Promise<void>(() => undefined))
      .catch((error) => error);
    h.dispose();
    const reads = h.view.mock.calls.length;
    abort.abort();
    expect((await waiting).code).toBe("cancelled");
    await expect(call.whenApplied()).rejects.toMatchObject({
      code: "cancelled",
    });
    h.delivery(0).capture();
    h.delivery(0).gate.reject(new Error("late delivery failure"));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.view).toHaveBeenCalledTimes(reads);
    expect(receipts).toEqual([]);
    expect(h.invokes).toHaveLength(1);
  });

  it("retires a never-settling delivery and removes listeners on close", async () => {
    const h = harness();
    const remove = vi.spyOn(h.retirement.signal, "removeEventListener");
    const { call } = h.begin();
    const completion = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    h.retirement.abort();
    expect((await completion).code).toBe("not-wired");
    call.close();
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("cancels a queued call without cancelling the other lane owner", async () => {
    const h = harness();
    const a = h.begin();
    const abort = new AbortController();
    const b = h.begin(abort.signal);
    submit(a.call, "hideColumn", ["a", true]);
    const rejected = submit(b.call, "hideColumn", ["b", true]).catch(
      (error) => error
    );
    abort.abort();
    await h.deliver(0);
    await a.call.drain();
    expect((await rejected).code).toBe("cancelled");
    expect(h.invokes).toHaveLength(1);
  });

  it("fails if delivery completes without capture", async () => {
    const h = harness();
    const { call } = h.begin();
    const result = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    h.publish(0);
    h.delivery(0).gate.resolve();
    expect((await result).code).toBe("apply-not-confirmed");
    expect(call.revision).toBe(1);
  });

  it("rejects a duplicate capture and retains only the first receipt revision", async () => {
    const h = harness();
    const { call, receipts } = h.begin();
    const result = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    h.publish(0);
    h.delivery(0).capture();
    h.delivery(0).capture();
    h.delivery(0).gate.resolve();
    expect((await result).code).toBe("apply-failed");
    expect(receipts).toHaveLength(1);
    expect(call.revision).toBe(2);
  });

  it("releases a cancelled never-settling legacy lane for a fresh call", async () => {
    const h = harness();
    const abort = new AbortController();
    const first = h.begin(abort.signal);
    const gate = deferred<void>();
    const legacy = Promise.resolve(
      first.call.trackLegacy(
        () => gate.promise,
        () => undefined
      )
    ).catch((error) => error);
    abort.abort();
    first.call.close();
    const second = h.begin();
    const ticket = submit(second.call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    try {
      expect(h.invokes).toHaveLength(1);
      await h.deliver(0);
      expect(await ticket).toBeUndefined();
    } finally {
      gate.resolve();
      await legacy;
    }
  });

  it("does not run the delivery reconciliation thunk after cancellation", async () => {
    const h = harness();
    const abort = new AbortController();
    const { call } = h.begin(abort.signal);
    const rejected = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    abort.abort();
    expect((await rejected).code).toBe("cancelled");
    const reconcile = vi.fn(() => {
      throw new Error("disposed reconciliation");
    });
    h.delivery(0).capture(reconcile);
    h.delivery(0).gate.resolve();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("runs an accepted reconciliation thunk immediately before receipt capture", async () => {
    const h = harness();
    const { call, receipts } = h.begin();
    submit(call, "hideColumn", ["a", true]);
    h.delivery(0).capture(() => h.publish(0));
    expect(receipts[0]?.producedRevision).toBe(2);
    h.delivery(0).gate.resolve();
    await call.drain();
  });

  it("refuses new legacy mutations after the handler sealed its ledger", () => {
    const h = harness();
    const { call } = h.begin();
    call.seal();
    const run = vi.fn();
    expect(() => call.trackLegacy(run, () => undefined)).toThrow();
    expect(run).not.toHaveBeenCalled();
  });

  it("supports a synchronous delivery hook without losing its captured receipt", async () => {
    const h = harness();
    h.inputs.settle = (capture) => capture(() => h.publish(0));
    const { call, receipts } = h.begin();
    await submit(call, "hideColumn", ["a", true]);
    await call.drain();
    expect(receipts).toEqual([
      { ordinal: 1, producedRevision: 2, changed: true },
    ]);
  });

  it("normalizes non-Error host delivery rejection and preserves its invocation", async () => {
    const h = harness();
    const { call, reserve } = h.begin();
    const result = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    h.delivery(0).gate.reject("host delivery rejected");
    expect(await result).toMatchObject({ code: "apply-failed", revision: 1 });
    expect(reserve).toHaveBeenCalledOnce();
    expect(call.invoked).toBe(true);
  });

  it("rejects a setter exception before requesting framework delivery", async () => {
    const h = harness();
    h.inputs.invoke = () => {
      throw new Error("setter failed");
    };
    const { call, reserve } = h.begin();
    await expect(submit(call, "hideColumn", ["a", true])).rejects.toMatchObject(
      { code: "apply-failed", message: "setter failed" }
    );
    expect(h.deliveries).toEqual([]);
    expect(reserve).toHaveBeenCalledOnce();
  });

  it("preserves synchronous legacy return values and uses their accepted baseline", async () => {
    const h = harness();
    const { call } = h.begin();
    const receipt = { acknowledged: true };
    const returned = call.trackLegacy(
      () => {
        h.foreign();
        return receipt;
      },
      () => call.observeLegacy(h.revision())
    );
    expect(returned).toBe(receipt);
    expect(call.revision).toBe(2);
    submit(call, "hideColumn", ["a", true]);
    await h.deliver(0);
    await call.drain();
    expect(call.revision).toBe(3);
  });

  it.each(["seal", "close"] as const)(
    "rejects newly submitted controlled work after %s",
    async (method) => {
      const h = harness();
      const { call } = h.begin();
      call[method]();
      await expect(
        submit(call, "hideColumn", ["a", true])
      ).rejects.toMatchObject({ code: "cancelled" });
      expect(h.invokes).toEqual([]);
    }
  );

  it("refuses a queued method whose host ownership changed", async () => {
    const h = harness();
    const { call } = h.begin();
    submit(call, "hideColumn", ["a", true]);
    const second = submit(call, "moveColumn", ["b", 0]).catch((error) => error);
    h.inputs.bindingOwned = (method) => method !== "moveColumn";
    await h.deliver(0);
    expect(await second).toMatchObject({ code: "not-wired" });
    expect(h.invokes).toHaveLength(1);
  });

  it("refuses source-epoch replacement before touching its setter", async () => {
    const h = harness();
    const { call } = h.begin();
    h.inputs.sourceEpoch = () => 1;
    await expect(submit(call, "hideColumn", ["a", true])).rejects.toMatchObject(
      { code: "revision-mismatch" }
    );
    expect(h.invokes).toEqual([]);
  });

  it("does not accept changed target data carrying the old observation revision", async () => {
    const h = harness();
    const { call } = h.begin();
    const rejected = submit(call, "hideColumn", ["a", true]).catch(
      (error) => error
    );
    h.publish(0);
    h.inputs.observe = () => ({ ...h.observe(), viewRevision: 1 });
    h.delivery(0).capture();
    h.delivery(0).gate.resolve();
    expect(await rejected).toMatchObject({ code: "revision-mismatch" });
    expect(call.revision).toBe(1);
  });

  it("rejects a flush that never invokes its callback, including a target already satisfied", async () => {
    const h = harness();
    h.inputs.flush = () => undefined;
    const { call, reserve } = h.begin();
    const result = submit(call, "hideColumn", ["a", false]).catch(
      (error) => error
    );
    if (h.deliveries.length) {
      h.delivery(0).capture();
      h.delivery(0).gate.resolve();
    }
    expect(await result).toMatchObject({ code: "apply-failed" });
    expect(reserve).not.toHaveBeenCalled();
  });
});

describe("controlled session results and reservations", () => {
  it("waits for ignored custom setter promises before success", async () => {
    const h = harness();
    const session = h.session([
      custom((context) => {
        context.apply.hideColumn?.("a", true);
        context.apply.hideColumn?.("b", true);
        return { done: true };
      }),
    ]);
    const result = session.execute("custom.controlled", {}, 1, "custom");
    await started(h);
    await h.deliver(0);
    await h.deliver(1);
    expect(await result).toMatchObject({
      ok: true,
      revision: 3,
      result: { done: true },
    });
  });

  it("returns/replays the captured revision and fixes the built-in no-op payload revision", async () => {
    const h = harness();
    const session = h.session();
    const running = session.execute(
      "view.hideColumn",
      { key: "a", hidden: false },
      1,
      "noop"
    );
    await started(h);
    await h.deliver(0);
    const result = await running;
    expect(result).toMatchObject({
      ok: true,
      revision: 1,
      result: { revision: 1 },
    });
    h.foreign();
    expect(
      await session.execute(
        "view.hideColumn",
        { key: "a", hidden: false },
        1,
        "noop"
      )
    ).toEqual(result);
    expect(h.invokes).toHaveLength(1);
  });

  it.each(["accepted", "noop", "unconfirmed", "cancelled"] as const)(
    "retains %s invocation identity through cache eviction",
    async (kind) => {
      const h = harness();
      const session = h.session();
      const abort = new AbortController();
      const request = { key: "a", hidden: kind !== "noop" };
      const result = session.execute(
        "view.hideColumn",
        request,
        1,
        "reserved",
        abort.signal
      );
      await started(h);
      if (kind === "cancelled") abort.abort();
      else await h.deliver(0, kind === "accepted" || kind === "noop");
      await result;
      await session.execute("view.describe", {}, h.revision(), "evict");
      expect(
        await session.execute(
          "view.hideColumn",
          request,
          h.revision(),
          "reserved"
        )
      ).toMatchObject({ ok: false, error: { code: "replay-expired" } });
      expect(h.invokes).toHaveLength(1);
    }
  );

  it("does not run controlled work after an unresolved explicit host mutator", async () => {
    const h = harness();
    const gate = deferred<void>();
    const session = h.session(
      [
        custom((context) => {
          context.apply.runExport?.("csv");
          context.apply.hideColumn?.("a", true);
          return { done: true };
        }),
      ],
      { runExport: () => gate.promise }
    );
    const result = session.execute("custom.controlled", {}, 1, "mixed");
    await Promise.resolve();
    await Promise.resolve();
    if (h.deliveries.length) await h.deliver(0);
    gate.resolve();
    expect(await result).toMatchObject({
      ok: false,
      error: { code: "apply-pending" },
    });
    expect(h.invokes).toHaveLength(0);
  });

  it("cancels execute already draining an ignored never-settling legacy promise", async () => {
    const h = harness();
    const gate = deferred<void>();
    const entered = deferred<void>();
    const abort = new AbortController();
    const session = h.session(
      [
        custom((context) => {
          context.apply.runExport?.("csv");
          return { done: true };
        }),
      ],
      {
        runExport: () => {
          entered.resolve();
          return gate.promise;
        },
      }
    );
    const running = session.execute(
      "custom.controlled",
      {},
      1,
      "draining",
      abort.signal
    );
    let terminal = false;
    void running.then(() => {
      terminal = true;
    });
    await entered.promise;
    for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    abort.abort();
    for (let tick = 0; tick < 12; tick += 1) await Promise.resolve();
    try {
      expect(terminal).toBe(true);
      expect(await running).toMatchObject({
        ok: false,
        error: { code: "cancelled" },
      });
    } finally {
      gate.resolve();
      await running;
    }
  });

  it("does not publish late progress from a cancelled handler", async () => {
    const h = harness();
    const gate = deferred<void>();
    const abort = new AbortController();
    const session = h.session([
      custom(async (context) => {
        context.apply.hideColumn?.("a", true);
        await gate.promise;
        context.reportProgress?.({ done: 1, total: 1 });
        return { done: true };
      }),
    ]);
    const running = session.execute(
      "custom.controlled",
      {},
      1,
      "progress",
      abort.signal
    );
    await started(h);
    abort.abort();
    await running;
    gate.resolve();
    for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    expect(h.progress).not.toHaveBeenCalled();
  });

  it("guards retained readRows and context.observe before touching a disposed runtime", async () => {
    const h = harness();
    const abort = new AbortController();
    const retained: {
      read?: NonNullable<AgentApply["readRows"]>;
      observe?: () => AgentObservation;
      apply?: AgentApply;
    } = {};
    const hostRead = vi.fn(() => ({
      rows: [],
      offset: 0,
      limit: 1,
      redacted: [],
    }));
    const session = h.session(
      [
        custom((context) => {
          retained.read = context.apply.readRows;
          retained.observe = context.observe;
          retained.apply = context.apply;
          context.apply.hideColumn?.("a", true);
          return new Promise<void>(() => undefined);
        }),
      ],
      { readRows: hostRead }
    );
    const running = session.execute(
      "custom.controlled",
      {},
      1,
      "retained-read",
      abort.signal
    );
    await started(h);
    abort.abort();
    await running;
    h.dispose();
    const reads = h.view.mock.calls.length;
    expect(() => retained.read?.({ offset: 0, limit: 1 })).toThrow();
    expect(() => retained.observe?.()).toThrow();
    expect(() => retained.apply?.readRows).toThrow();
    expect(hostRead).not.toHaveBeenCalled();
    expect(h.view).toHaveBeenCalledTimes(reads);
  });

  it("does not observe disposed state when a legacy promise resolves after cancellation", async () => {
    const h = harness();
    const gate = deferred<void>();
    const abort = new AbortController();
    const begun = deferred<void>();
    let legacy: Promise<unknown> = Promise.resolve();
    const session = h.session(
      [
        custom((context) => {
          legacy = Promise.resolve(context.apply.runExport?.("csv")).catch(
            (error) => error
          );
          context.apply.hideColumn?.("a", true);
          begun.resolve();
          return new Promise<void>(() => undefined);
        }),
      ],
      { runExport: () => gate.promise }
    );
    const result = session.execute(
      "custom.controlled",
      {},
      1,
      "late",
      abort.signal
    );
    await begun.promise;
    h.dispose();
    const reads = h.view.mock.calls.length;
    abort.abort();
    await result;
    gate.resolve();
    await legacy;
    await Promise.resolve();
    expect(h.view).toHaveBeenCalledTimes(reads);
  });
});
