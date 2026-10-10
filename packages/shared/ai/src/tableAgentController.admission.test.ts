import { createNeutralTable, createTableEngine } from "@adapttable/core";
import type { TableRuntimeView } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTableAgentController,
  type TableAgentControllerOptions,
} from "./tableAgentController";
import type { AgentCapabilityDefinition } from "./types";
const releases: (() => void)[] = [];
afterEach(() => releases.splice(0).forEach((release) => release()));
const view: TableRuntimeView = {
  rows: [{ id: "1", name: "Ada" }],
  getRowId: () => "1",
  rowLabel: () => "Ada",
};
const options: TableAgentControllerOptions = {
  tableId: "people",
  columns: { name: { type: "string", readable: true } },
  approval: "never",
};
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve: () => resolve() };
}
function harness(flushAdmission: () => void | Promise<void>) {
  const run = vi.fn();
  const read = vi.fn(() => view);
  const capabilities: AgentCapabilityDefinition[] = [
    {
      key: "test.read",
      summary: "Read",
      kind: "read",
      guide: {
        guide: "Read",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: () => {
        run();
        return {};
      },
    },
  ];
  const controller = createTableAgentController({
    options: { current: { ...options, capabilities } },
    runtime: {
      current: {
        view: read,
        labels: () => undefined,
        rowAt: () => undefined,
        featureIds: () => [],
      },
    },
    flushAdmission,
    flush: (run) => run(),
  });
  releases.push(controller.disconnect);
  return { controller, run, read, session: controller.session() };
}
describe("optional async admission", () => {
  it("waits before new-call admission while preserving the synchronous hook fast path", async () => {
    const barrier = deferred();
    const asyncHost = harness(() => barrier.promise);
    const pending = asyncHost.session.execute(
      "test.read",
      {},
      asyncHost.session.manifest().viewRevision,
      "async"
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(asyncHost.run).not.toHaveBeenCalled();
    barrier.resolve();
    expect((await pending).ok).toBe(true);
    expect(asyncHost.run).toHaveBeenCalledOnce();
    const events: string[] = [];
    const syncHost = harness(() => {
      events.push("flush");
    });
    const promise = syncHost.session.execute(
      "test.read",
      {},
      syncHost.session.manifest().viewRevision,
      "sync"
    );
    events.push("returned");
    queueMicrotask(() =>
      events.push(
        syncHost.run.mock.calls.length
          ? "handler-before-marker"
          : "marker-before-handler"
      )
    );
    await promise;
    expect(events).toEqual(["flush", "returned", "handler-before-marker"]);
  });
  it("does not touch a disconnected runtime after an awaited barrier", async () => {
    const barrier = deferred();
    const host = harness(() => barrier.promise);
    const pending = host.session.execute(
      "test.read",
      {},
      host.session.manifest().viewRevision,
      "disconnect"
    );
    host.controller.disconnect();
    const reads = host.read.mock.calls.length;
    barrier.resolve();
    expect((await pending).error?.code).toBe("cancelled");
    expect(host.run).not.toHaveBeenCalled();
    expect(host.read).toHaveBeenCalledTimes(reads);
  });
  it("keeps an old call cancelled after disconnect and reconnect", async () => {
    const barrier = deferred();
    const host = harness(() => barrier.promise);
    const pending = host.session.execute(
      "test.read",
      {},
      host.session.manifest().viewRevision,
      "reconnect"
    );
    host.controller.disconnect();
    host.controller.sync();
    barrier.resolve();
    expect((await pending).error?.code).toBe("cancelled");
    expect(host.run).not.toHaveBeenCalled();
  });
  it("checks caller cancellation after waiting", async () => {
    const barrier = deferred();
    const host = harness(() => barrier.promise);
    const abort = new AbortController();
    const pending = host.session.execute(
      "test.read",
      {},
      host.session.manifest().viewRevision,
      "abort",
      abort.signal
    );
    abort.abort();
    barrier.resolve();
    expect((await pending).error?.code).toBe("cancelled");
    expect(host.run).not.toHaveBeenCalled();
  });
  it("reads the newest policy after the barrier rather than adopting the old permission", async () => {
    const barrier = deferred();
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier.promise,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const pending = session.execute(
      "columns.describe",
      {},
      session.manifest().viewRevision,
      "policy"
    );
    current.current = {
      ...options,
      columns: { name: { type: "string", readable: false } },
    };
    barrier.resolve();
    expect(JSON.stringify((await pending).result)).toContain(
      '"readable":false'
    );
  });
  it("refuses an existing session when queued exclusions revoke its replay", async () => {
    const barrier = deferred();
    const pendingBarrier: { current: Promise<void> | undefined } = {
      current: undefined,
    };
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => pendingBarrier.current,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const revision = session.manifest().viewRevision;
    await session.execute("columns.describe", {}, revision, "cached-revoked");
    pendingBarrier.current = barrier.promise;
    const pending = session.execute(
      "columns.describe",
      {},
      revision,
      "cached-revoked"
    );
    current.current = { ...options, excludeCapabilities: ["columns.describe"] };
    controller.sync();
    expect(controller.session()).not.toBe(session);
    barrier.resolve();
    expect((await pending).error?.code).toBe("not-wired");
  });

  it("does not let a retained session bypass a reconciled required approval policy", async () => {
    const barrier = deferred();
    const run = vi.fn();
    const approve = vi.fn(() => Promise.resolve(false));
    const operation: AgentCapabilityDefinition = {
      key: "test.write",
      summary: "Write",
      kind: "write",
      guide: {
        guide: "Write",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: () => {
        run();
        return { applied: true };
      },
    };
    const current: { current: TableAgentControllerOptions } = {
      current: {
        ...options,
        writePolicy: "allow",
        commit: "immediate",
        capabilities: [operation],
        capabilityApproval: {
          "test.write": { approval: { policy: "automatic" } },
        },
        onApprove: approve,
      },
    };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier.promise,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const pending = session.execute(
      "test.write",
      {},
      session.manifest().viewRevision,
      "approval-change"
    );
    current.current = {
      ...current.current,
      capabilityApproval: {
        "test.write": { approval: { policy: "required" } },
      },
    };
    controller.sync();
    expect(controller.session()).not.toBe(session);
    barrier.resolve();
    await pending;
    expect(run).not.toHaveBeenCalled();
  });

  it("retains a valid session when only host callbacks change", async () => {
    const barrier = deferred();
    const before = vi.fn();
    const after = vi.fn();
    const current: { current: TableAgentControllerOptions } = {
      current: { ...options, bridge: { attach: before } },
    };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier.promise,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    controller.sync();
    const session = controller.session();
    const pending = session.execute(
      "columns.describe",
      {},
      session.manifest().viewRevision,
      "callbacks"
    );
    current.current = { ...current.current, bridge: { attach: after } };
    controller.sync();
    expect(controller.session()).toBe(session);
    barrier.resolve();
    expect((await pending).ok).toBe(true);
    expect(after).toHaveBeenCalledWith(session);
  });
  it("refuses a retained session after table identity replacement", async () => {
    const barrier = deferred();
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier.promise,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const pending = session.execute(
      "columns.describe",
      {},
      session.manifest().viewRevision,
      "table-change"
    );
    current.current = { ...options, tableId: "another" };
    controller.sync();
    barrier.resolve();
    expect((await pending).error?.code).toBe("not-wired");
  });
  it("keeps cancellation truthful if a barrier rejects after disconnect", async () => {
    let reject: (reason: Error) => void = (_reason) => undefined;
    const barrier = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    const host = harness(() => barrier);
    const pending = host.session.execute(
      "test.read",
      {},
      host.session.manifest().viewRevision,
      "reject-after-disconnect"
    );
    host.controller.disconnect();
    reject(new Error("binding disposed"));
    expect((await pending).error?.code).toBe("cancelled");
    expect(host.run).not.toHaveBeenCalled();
  });

  it("refuses an old revision after same-revision source replacement during admission", async () => {
    const first = createTableEngine<unknown>({
      data: [{ id: "one" }],
      columns: [{ key: "id" }],
      rowKey: (row) => String((row as { id: string }).id),
    });
    const second = createTableEngine<unknown>({
      data: [{ id: "two" }],
      columns: [{ key: "id" }],
      rowKey: (row) => String((row as { id: string }).id),
    });
    releases.push(first.dispose, second.dispose);
    let current: TableRuntimeView = {
      ...view,
      neutralTable: createNeutralTable(first, "people"),
    };
    const barrier = deferred();
    const controller = createTableAgentController({
      options: { current: options },
      runtime: {
        current: {
          view: () => current,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier.promise,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const pending = session.execute(
      "columns.describe",
      {},
      session.manifest().viewRevision,
      "source-change"
    );
    current = {
      ...current,
      neutralTable: createNeutralTable(second, "people"),
    };
    controller.sync();
    expect(controller.session()).toBe(session);
    barrier.resolve();
    expect((await pending).error?.code).toBe("revision-mismatch");
  });
  it("cancels promptly while admission never settles", async () => {
    const host = harness(() => new Promise<void>(() => undefined));
    const abort = new AbortController();
    const pending = host.session.execute(
      "test.read",
      {},
      host.session.manifest().viewRevision,
      "never",
      abort.signal
    );
    const reads = host.read.mock.calls.length;
    abort.abort();
    expect((await pending).error?.code).toBe("cancelled");
    expect(host.read).toHaveBeenCalledTimes(reads);
    expect(host.run).not.toHaveBeenCalled();
  }, 1000);
  it("disconnects promptly while admission never settles", async () => {
    const host = harness(() => new Promise<void>(() => undefined));
    const pending = host.session.execute(
      "test.read",
      {},
      host.session.manifest().viewRevision,
      "never-disconnect"
    );
    host.controller.disconnect();
    const reads = host.read.mock.calls.length;
    expect((await pending).error?.code).toBe("cancelled");
    expect(host.read).toHaveBeenCalledTimes(reads);
    expect(host.run).not.toHaveBeenCalled();
  }, 1000);
  it("never invokes admission for an already-aborted controller call", async () => {
    const flush = vi.fn(() => {
      throw new Error("disposed hook");
    });
    const host = harness(flush);
    const revision = host.session.manifest().viewRevision;
    const abort = new AbortController();
    abort.abort();
    const reads = host.read.mock.calls.length;
    expect(
      (
        await host.session.execute(
          "test.read",
          {},
          revision,
          "already-aborted",
          abort.signal
        )
      ).error?.code
    ).toBe("cancelled");
    expect(flush).not.toHaveBeenCalled();
    expect(host.read).toHaveBeenCalledTimes(reads);
  });
  it.each(["resolve", "reject", "abort"] as const)(
    "removes admission abort listeners after %s",
    async (outcome) => {
      const add = vi.spyOn(AbortSignal.prototype, "addEventListener");
      const remove = vi.spyOn(AbortSignal.prototype, "removeEventListener");
      let resolve: () => void = () => undefined;
      let reject: (error: Error) => void = (_error) => undefined;
      const barrier = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
      });
      const host = harness(() => barrier);
      const abort = new AbortController();
      const pending = host.session.execute(
        "test.read",
        {},
        host.session.manifest().viewRevision,
        `listeners-${outcome}`,
        abort.signal
      );
      const assertion =
        outcome === "reject"
          ? expect(pending).rejects.toThrow("barrier failed")
          : expect(pending).resolves.toHaveProperty(
              "ok",
              outcome === "resolve"
            );
      if (outcome === "resolve") resolve();
      else if (outcome === "reject") reject(new Error("barrier failed"));
      else abort.abort();
      await assertion;
      for (const [event, listener] of add.mock.calls)
        if (event === "abort")
          expect(
            remove.mock.calls.some(
              ([removedEvent, removedListener]) =>
                removedEvent === "abort" && removedListener === listener
            )
          ).toBe(true);
      if (outcome === "abort") {
        reject(new Error("late failure"));
        await Promise.resolve();
      }
      add.mockRestore();
      remove.mockRestore();
    }
  );
  it.each(["table", "exclusion", "capability", "approval"] as const)(
    "never revives a retired session after an A-B-A %s transition",
    async (kind) => {
      const write = vi.fn();
      const capability: AgentCapabilityDefinition = {
        key: "test.write",
        summary: "Write",
        kind: "write",
        guide: {
          guide: "Write",
          input: { type: "object" },
          output: { type: "object" },
        },
        isEnabled: () => true,
        execute: () => {
          write();
          return { applied: true };
        },
      };
      const initial: TableAgentControllerOptions = {
        ...options,
        writePolicy: "allow",
        commit: "immediate",
        capabilities: [capability],
        capabilityApproval: {
          "test.write": { approval: { policy: "automatic" } },
        },
      };
      const current = { current: initial };
      const controller = createTableAgentController({
        options: current,
        runtime: {
          current: {
            view: () => view,
            labels: () => undefined,
            rowAt: () => undefined,
            featureIds: () => [],
          },
        },
        flushAdmission: () => undefined,
        flush: (run) => run(),
      });
      releases.push(controller.disconnect);
      controller.sync();
      const retired = controller.session();
      const revision = retired.manifest().viewRevision;
      expect(
        (await retired.execute("columns.describe", {}, revision, "old-cache"))
          .ok
      ).toBe(true);
      let replacement: TableAgentControllerOptions;
      switch (kind) {
        case "table":
          replacement = { ...initial, tableId: "other" };
          break;
        case "exclusion":
          replacement = { ...initial, excludeCapabilities: ["test.write"] };
          break;
        case "capability":
          replacement = { ...initial, capabilities: [] };
          break;
        case "approval":
          replacement = {
            ...initial,
            capabilityApproval: {
              "test.write": { approval: { policy: "required" } },
            },
          };
          break;
      }
      current.current = replacement;
      controller.sync();
      expect(controller.session()).not.toBe(retired);
      current.current = initial;
      controller.sync();
      const restored = controller.session();
      expect(restored).not.toBe(retired);
      expect(
        (await retired.execute("columns.describe", {}, revision, "old-cache"))
          .error?.code
      ).toBe("not-wired");
      expect(
        (await retired.execute("test.write", {}, revision, "retired-write"))
          .error?.code
      ).toBe("not-wired");
      expect(write).not.toHaveBeenCalled();
      expect(
        (
          await restored.execute(
            "test.write",
            {},
            restored.manifest().viewRevision,
            "restored-write"
          )
        ).ok
      ).toBe(true);
      expect(write).toHaveBeenCalledOnce();
    }
  );
  it("does not revive an awaiting call when an identical registry returns", async () => {
    const barrier = deferred();
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier.promise,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    controller.sync();
    const retired = controller.session();
    const pending = retired.execute(
      "columns.describe",
      {},
      retired.manifest().viewRevision,
      "waiting-A"
    );
    current.current = { ...options, excludeCapabilities: ["columns.describe"] };
    controller.sync();
    current.current = options;
    controller.sync();
    expect(controller.session()).not.toBe(retired);
    barrier.resolve();
    expect((await pending).error?.code).toBe("not-wired");
  });
  it("retains the same session for legitimate disconnect and reconnect", async () => {
    const host = harness(() => undefined);
    host.controller.sync();
    const initial = host.session;
    const revision = initial.manifest().viewRevision;
    host.controller.disconnect();
    expect(
      (await initial.execute("test.read", {}, revision, "while-detached")).error
        ?.code
    ).toBe("cancelled");
    host.controller.sync();
    expect(host.controller.session()).toBe(initial);
    expect(
      (await initial.execute("test.read", {}, revision, "after-reconnect")).ok
    ).toBe(true);
    expect(host.run).toHaveBeenCalledOnce();
  });
  it("ends a retired session's permanently pending admission after replacement", async () => {
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => new Promise<void>(() => undefined),
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const retired = controller.session();
    const pending = retired.execute(
      "columns.describe",
      {},
      retired.manifest().viewRevision,
      "retired-pending"
    );
    current.current = { ...options, tableId: "replacement" };
    controller.sync();
    expect((await pending).error?.code).toBe("not-wired");
  }, 1000);

  it("removes retirement listeners and consumes a late rejection", async () => {
    const add = vi.spyOn(AbortSignal.prototype, "addEventListener");
    const remove = vi.spyOn(AbortSignal.prototype, "removeEventListener");
    let reject: (error: Error) => void = (_error) => undefined;
    const barrier = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const pending = session.execute(
      "columns.describe",
      {},
      session.manifest().viewRevision,
      "retirement-listeners"
    );
    current.current = { ...options, tableId: "replacement" };
    controller.sync();
    expect((await pending).error?.code).toBe("not-wired");
    for (const [event, listener] of add.mock.calls)
      if (event === "abort")
        expect(
          remove.mock.calls.some(
            ([removedEvent, removedListener]) =>
              removedEvent === "abort" && removedListener === listener
          )
        ).toBe(true);
    reject(new Error("late retired failure"));
    await Promise.resolve();
    add.mockRestore();
    remove.mockRestore();
  });
  it("does not call a retired session's admission hook again", async () => {
    const current = { current: options };
    const flush = vi.fn();
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: flush,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const revision = session.manifest().viewRevision;
    current.current = { ...options, tableId: "replacement" };
    controller.sync();
    flush.mockClear();
    expect(
      (
        await session.execute(
          "columns.describe",
          {},
          revision,
          "already-retired"
        )
      ).error?.code
    ).toBe("not-wired");
    expect(flush).not.toHaveBeenCalled();
  });
  it("reports retirement when a rejected admission races with replacement", async () => {
    let reject: (error: Error) => void = (_error) => undefined;
    const barrier = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    const current = { current: options };
    const controller = createTableAgentController({
      options: current,
      runtime: {
        current: {
          view: () => view,
          labels: () => undefined,
          rowAt: () => undefined,
          featureIds: () => [],
        },
      },
      flushAdmission: () => barrier,
      flush: (run) => run(),
    });
    releases.push(controller.disconnect);
    const session = controller.session();
    const pending = session.execute(
      "columns.describe",
      {},
      session.manifest().viewRevision,
      "reject-then-retire"
    );
    reject(new Error("old binding failed"));
    current.current = { ...options, tableId: "replacement" };
    controller.sync();
    expect((await pending).error?.code).toBe("not-wired");
  });
});
