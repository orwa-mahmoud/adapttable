/**
 * The table agent controller, driven the way a binding drives it.
 *
 * No framework here: the test plays the binding — it keeps the options and
 * runtime current, calls `sync` where a binding would after a commit, and
 * reads `getState` where a binding would render. What is proven is that the
 * decisions the React provider used to make are the controller's now, and
 * make the same way.
 */
import {
  type AgentApprovalPending,
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
} from "@adapttable/core";
import type { TableRuntime, TableRuntimeView } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTableAgentController,
  type TableAgentController,
  type TableAgentControllerOptions,
} from "./tableAgentController";
import type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentSession,
  ApprovalResult,
  ApprovalSubject,
  CapabilityPlan,
  ExecuteResult,
  RowWindow,
} from "./types";
import type { ModelContextLike, WebMcpTool } from "./webmcp";

interface Row {
  readonly id: string;
  readonly name: string;
}

const ROWS: readonly Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
  { id: "3", name: "Alan" },
];

function idOf(row: unknown): string {
  return (row as Row).id;
}

function viewOf(patch: Partial<TableRuntimeView> = {}): TableRuntimeView {
  return {
    rows: ROWS,
    getRowId: idOf,
    rowLabel: (row) => (row as Row).name,
    editing: { onCellEdit: vi.fn() },
    ...patch,
  };
}

function sourceTable(name = "Ada", sample = false) {
  const rows: readonly Row[] = [{ id: "1", name }];
  const engine = createTableEngine<Row>({
    data: rows,
    columns: [{ key: "name", header: "Name", ai: { sample } }],
    rowKey: (row) => row.id,
  });
  const table = createNeutralTable(engine, "staff", {
    operations: () => ({ editCells: true }),
  }) as NeutralTable<unknown>;
  return { engine, table, rows };
}

function deferred<T>() {
  let resolve: (value: T) => void = (_value) => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve: (value: T) => resolve(value) };
}

function sampledRows(name: string): RowWindow {
  return {
    rows: [{ rowKey: "1", cells: { name } }],
    offset: 0,
    limit: 1,
    redacted: [],
  };
}

/** A write the table parks as one operation, and records when it runs. */
function operation(key = "staff.archive"): {
  readonly ran: unknown[];
  readonly capability: AgentCapabilityDefinition;
} {
  const ran: unknown[] = [];
  return {
    ran,
    capability: {
      key,
      summary: "Archive a person",
      kind: "write",
      presentation: { title: "Archive" },
      guide: {
        guide: "Archive.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: (_context, args) => {
        ran.push(args);
        return { proposals: [], applied: true, approval: "not-required" };
      },
    },
  };
}

/** Reports progress twice, then settles. */
const PROGRESS: AgentCapabilityDefinition = {
  key: "test.progress",
  summary: "Report progress.",
  kind: "read",
  guide: {
    guide: "Reports progress, then settles.",
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: (context) => {
    context.reportProgress?.({ done: 1, total: 2, label: "rows" });
    return { done: true };
  },
};

interface Harness {
  readonly controller: TableAgentController;
  readonly runtime: TableRuntime;
  readonly options: { current: TableAgentControllerOptions };
  readonly setView: (next: TableRuntimeView | undefined) => void;
  readonly flushAdmission: ReturnType<typeof vi.fn>;
  /** The session as a surface reads it. */
  readonly session: () => AgentSession;
  /** The open approval, as a surface reads it. */
  readonly pending: () => AgentApprovalPending | null;
  /** Run one call, stamped at the table's current revision. */
  readonly run: (
    key: string,
    args: unknown,
    signal?: AbortSignal
  ) => Promise<ExecuteResult>;
}

let calls = 0;

function harness(
  options: Partial<TableAgentControllerOptions> = {},
  view: TableRuntimeView | null = viewOf()
): Harness {
  let current: TableRuntimeView | undefined = view ?? undefined;
  const runtime: TableRuntime = {
    rowAt: () => undefined,
    labels: () => undefined,
    view: () => current,
    featureIds: () => ["editing"],
  };
  const optionsRef = {
    current: {
      tableId: "staff",
      columns: { name: { type: "string", writable: true } },
      commit: "immediate",
      ...options,
    } as TableAgentControllerOptions,
  };
  const flushAdmission = vi.fn();
  const controller = createTableAgentController({
    options: optionsRef,
    runtime: { current: runtime },
    flushAdmission,
    flush: (run) => {
      run();
    },
  });
  const session = () => controller.getState().session;
  return {
    controller,
    runtime,
    options: optionsRef,
    setView: (next) => {
      current = next;
    },
    flushAdmission,
    session,
    pending: () => controller.getState().approval,
    run: (key, args, signal) => {
      calls += 1;
      return session().execute(
        key,
        args,
        session().manifest().viewRevision,
        `${key}-${String(calls)}`,
        signal
      );
    },
  };
}

const editOne = { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] };
const editThree = {
  edits: [
    { rowKey: "1", column: "name", value: "A." },
    { rowKey: "2", column: "name", value: "G." },
    { rowKey: "3", column: "name", value: "Al." },
  ],
};

/** Let a parked write reach the controller. */
async function parked(h: Harness): Promise<AgentApprovalPending> {
  await vi.waitFor(() => {
    expect(h.pending()).not.toBeNull();
  });
  const open = h.pending();
  if (!open) throw new Error("nothing parked");
  return open;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the session", () => {
  it("is stable until what the agent may use changes", () => {
    const h = harness();
    const first = h.controller.session();
    expect(h.controller.session()).toBe(first);
    expect(h.session()).toBe(first);

    h.options.current = { ...h.options.current, excludeCapabilities: ["x"] };
    const second = h.controller.session();
    expect(second).not.toBe(first);

    h.options.current = { ...h.options.current, tableId: "other" };
    expect(h.controller.session()).not.toBe(second);
    expect(h.controller.session().manifest().tableId).toBe("other");
  });

  it("refreshes added and removed custom definitions without retaining permission", async () => {
    const { capability, ran } = operation();
    const h = harness({ approval: "never" });
    const empty = h.session();
    h.options.current = { ...h.options.current, capabilities: [capability] };
    const offered = h.session();
    expect(offered).not.toBe(empty);
    expect(offered.catalog().map((entry) => entry.key)).toContain(
      capability.key
    );
    expect((await h.run(capability.key, {})).ok).toBe(true);
    expect(ran).toHaveLength(1);

    h.options.current = { ...h.options.current, capabilities: [] };
    const removed = h.session();
    expect(removed).not.toBe(offered);
    expect(removed.catalog().map((entry) => entry.key)).not.toContain(
      capability.key
    );
    const stale = await offered.execute(
      capability.key,
      {},
      offered.manifest().viewRevision,
      "removed-custom-definition"
    );
    expect(stale.error?.code).toBe("not-wired");
    expect(ran).toHaveLength(1);
  });

  it("keeps equivalent custom definitions and refreshes a replaced handler", async () => {
    const first = operation();
    const second = operation();
    const h = harness({ approval: "never", capabilities: [first.capability] });
    const original = h.session();
    h.options.current = {
      ...h.options.current,
      capabilities: [
        { ...first.capability, guide: { ...first.capability.guide } },
      ],
    };
    expect(h.session()).toBe(original);
    h.options.current = {
      ...h.options.current,
      capabilities: [
        { ...first.capability, execute: second.capability.execute },
      ],
    };
    const replaced = h.session();
    expect(replaced).not.toBe(original);
    const stale = await original.execute(
      first.capability.key,
      {},
      original.manifest().viewRevision,
      "replaced-custom-handler"
    );
    expect(stale.error?.code).toBe("not-wired");
    expect(first.ran).toHaveLength(0);
    expect((await h.run(first.capability.key, {})).ok).toBe(true);
    expect(second.ran).toHaveLength(1);
  });

  it("keeps equivalent nested schemas regardless of object key order", () => {
    const { capability } = operation();
    const h = harness({
      capabilities: [
        {
          ...capability,
          guide: {
            ...capability.guide,
            input: {
              type: "object",
              properties: { who: { type: "string", description: "Person" } },
            },
          },
        },
      ],
    });
    const original = h.session();
    h.options.current = {
      ...h.options.current,
      capabilities: [
        {
          ...capability,
          guide: {
            input: {
              properties: { who: { description: "Person", type: "string" } },
              type: "object",
            },
            output: capability.guide.output,
            guide: capability.guide.guide,
          },
        },
      ],
    };
    expect(h.session()).toBe(original);
    expect(original.catalog().map((entry) => entry.key)).toContain(
      capability.key
    );
  });

  it("preserves class-backed custom metadata and handler receivers", async () => {
    const seen: string[] = [];
    class Capability implements AgentCapabilityDefinition {
      readonly key = "staff.method";
      readonly guide: AgentCapabilityDefinition["guide"] = {
        guide: "Run a class-backed operation.",
        input: { type: "object" },
        output: { type: "object" },
      };
      readonly #name: string;
      readonly #kind = "write";

      constructor(name: string) {
        this.#name = name;
      }

      get summary(): string {
        return this.#name.length > 0 ? "Class-backed operation" : "";
      }

      get kind(): "write" {
        return this.#kind;
      }

      isEnabled(): boolean {
        return this.#name.length > 0;
      }

      plan() {
        seen.push(`plan:${this.#name}`);
        return { proposals: [] };
      }

      execute() {
        seen.push(`execute:${this.#name}`);
        return { applied: true };
      }
    }
    const capability = new Capability("first");
    const h = harness({ approval: "writes", capabilities: [capability] });
    const original = h.session();
    const pending = h.run(capability.key, {});
    const open = await parked(h);
    expect(seen).toEqual(["plan:first"]);
    open.approve();
    expect((await pending).ok).toBe(true);
    expect(seen).toEqual(["plan:first", "execute:first"]);

    h.options.current = {
      ...h.options.current,
      capabilities: [new Capability("second")],
    };
    expect(h.session()).not.toBe(original);
    const stale = await original.execute(
      capability.key,
      {},
      original.manifest().viewRevision,
      "replaced-class-receiver"
    );
    expect(stale.error?.code).toBe("not-wired");
    const replacement = h.run(capability.key, {});
    (await parked(h)).approve();
    expect((await replacement).ok).toBe(true);
    expect(seen).toEqual([
      "plan:first",
      "execute:first",
      "plan:second",
      "execute:second",
    ]);
  });

  it("accepts frozen custom definitions without changing them", async () => {
    const { capability, ran } = operation();
    const h = harness({
      approval: "never",
      capabilities: [Object.freeze(capability)],
    });
    expect((await h.run(capability.key, {})).ok).toBe(true);
    expect(ran).toHaveLength(1);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  it("refreshes a changed custom schema, planner and permission predicate", () => {
    const { capability } = operation();
    const h = harness({ capabilities: [capability] });
    let previous = h.session();
    const replacements: readonly AgentCapabilityDefinition[] = [
      {
        ...capability,
        guide: {
          ...capability.guide,
          input: { type: "object", required: ["who"] },
        },
      },
      { ...capability, plan: () => ({ proposals: [] }) },
      { ...capability, isEnabled: () => false },
    ];
    for (const definition of replacements) {
      h.options.current = {
        ...h.options.current,
        capabilities: [definition],
      };
      const current = h.session();
      expect(current).not.toBe(previous);
      expect(previous.catalog().map((entry) => entry.key)).not.toContain(
        capability.key
      );
      previous = current;
    }
    expect(
      h
        .session()
        .catalog()
        .map((entry) => entry.key)
    ).not.toContain(capability.key);
  });

  it("commits the binding's own state before a call", async () => {
    const h = harness();
    await h.run("view.describe", {});
    expect(h.flushAdmission).toHaveBeenCalled();
  });

  it("keeps the snapshot until something in it changes", () => {
    const h = harness();
    const state = h.controller.getState();
    expect(h.controller.getState()).toBe(state);
    h.setView(viewOf({ rows: ROWS.slice(0, 1) }));
    expect(h.controller.getState()).not.toBe(state);
  });

  it("reads the stamp from a neutral table and follows it", () => {
    const engine = createTableEngine<Row>({
      data: [...ROWS],
      columns: [{ key: "name", header: "Name" }],
      rowKey: (row) => row.id,
    });
    const table = createNeutralTable(engine, "staff") as NeutralTable<unknown>;
    const h = harness({}, viewOf({ neutralTable: table }));
    const listener = vi.fn();
    const stop = h.controller.subscribeTable(listener);
    const before = h.controller.tableStamp();
    engine.invalidate(["data"], { data: [...ROWS].reverse() });
    expect(listener).toHaveBeenCalled();
    expect(h.controller.tableStamp()).not.toBe(before);
    stop();
  });

  it("has nothing to subscribe to without a neutral table", () => {
    const h = harness({}, null);
    const stop = h.controller.subscribeTable(vi.fn());
    expect(stop()).toBeUndefined();
    expect(h.controller.getState().view.read().view).toEqual({});
  });
});

describe("approval through the table's own surface", () => {
  it("parks a write, applies it on approve, and tells subscribers", async () => {
    const onCellEdit = vi.fn();
    const h = harness(
      { approval: "writes" },
      viewOf({ editing: { onCellEdit } })
    );
    const listener = vi.fn();
    const stop = h.controller.subscribe(listener);

    const result = h.run("edit.cells", editOne);
    const open = await parked(h);
    expect(listener).toHaveBeenCalled();
    expect(open.proposals).toHaveLength(1);
    expect(open.proposals[0]?.rowLabel).toBe("Ada");
    expect(h.pending()).toBe(open);
    expect(onCellEdit).not.toHaveBeenCalled();

    open.approve();
    expect((await result).ok).toBe(true);
    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(h.pending()).toBeNull();
    stop();
  });

  it("refuses a pending edit after a same-revision source replacement", async () => {
    const first = sourceTable();
    const second = sourceTable("Bea");
    expect(second.table.revisions).toEqual(first.table.revisions);
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    const h = harness(
      { approval: "writes" },
      viewOf({ neutralTable: first.table, editing: { onCellEdit: onFirst } })
    );
    const session = h.session();
    const pending = h.run("edit.cells", editOne);
    const open = await parked(h);
    h.setView(
      viewOf({ neutralTable: second.table, editing: { onCellEdit: onSecond } })
    );
    expect(h.session()).toBe(session);
    open.approve();
    expect((await pending).error?.code).toBe("revision-mismatch");
    expect(onFirst).not.toHaveBeenCalled();
    expect(onSecond).not.toHaveBeenCalled();

    const current = h.run("edit.cells", editOne);
    (await parked(h)).approve();
    expect((await current).ok).toBe(true);
    expect(onSecond).toHaveBeenCalledExactlyOnceWith(
      second.rows[0],
      "name",
      "Ada L."
    );
  });

  it.each(["removed", "handler", "schema"])(
    "refuses a pending custom write after its definition is %s",
    async (change) => {
      const first = operation();
      const second = operation();
      const h = harness({
        approval: "writes",
        capabilities: [first.capability],
      });
      const original = h.session();
      const pending = h.run(first.capability.key, {});
      const open = await parked(h);
      const replacement =
        change === "handler"
          ? { ...first.capability, execute: second.capability.execute }
          : {
              ...first.capability,
              guide: {
                ...first.capability.guide,
                input: { type: "object", required: ["who"] },
              },
            };
      h.options.current = {
        ...h.options.current,
        capabilities: change === "removed" ? [] : [replacement],
      };
      expect(h.session()).not.toBe(original);
      open.approve();
      expect((await pending).error?.code).toBe("not-wired");
      expect(first.ran).toHaveLength(0);
      expect(second.ran).toHaveLength(0);
    }
  );

  it("keeps a pending custom approval valid for an equivalent definition", async () => {
    const { capability, ran } = operation();
    const h = harness({ approval: "writes", capabilities: [capability] });
    const original = h.session();
    const pending = h.run(capability.key, {});
    const open = await parked(h);
    h.options.current = {
      ...h.options.current,
      capabilities: [{ ...capability }],
    };
    expect(h.session()).toBe(original);
    open.approve();
    expect((await pending).ok).toBe(true);
    expect(ran).toHaveLength(1);
  });

  it("refuses on reject, with a stated reason and without a click event", async () => {
    const h = harness({ approval: "writes" });
    const first = h.run("edit.cells", editOne);
    (await parked(h)).reject("  not today  ");
    expect(JSON.stringify((await first).result)).toContain("not today");

    const second = h.run("edit.cells", editOne);
    ((await parked(h)).reject as (value: unknown) => void)({ type: "click" });
    expect((await second).result).toMatchObject({ applied: false });
  });

  it("refuses a second write while one is waiting", async () => {
    const h = harness({ approval: "writes" });
    const first = h.run("edit.cells", editOne);
    const open = await parked(h);
    const second = await h.run("edit.cells", editOne);
    expect(second.error?.message).toMatch(/already pending/);
    open.reject();
    await first;
  });

  it("abandons a write whose caller aborts, and never parks one already aborted", async () => {
    const h = harness({ approval: "writes" });
    const controller = new AbortController();
    const result = h.run("edit.cells", editOne, controller.signal);
    await parked(h);
    controller.abort();
    expect((await result).ok).toBe(false);
    expect(h.pending()).toBeNull();

    const gone = new AbortController();
    gone.abort();
    expect((await h.run("edit.cells", editOne, gone.signal)).ok).toBe(false);
    expect(h.pending()).toBeNull();
  });

  it("publishes nothing when the host answers", async () => {
    const onApprove = vi.fn().mockResolvedValue(true);
    const h = harness({ approval: "writes", onApprove });
    expect((await h.run("edit.cells", editOne)).ok).toBe(true);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(h.pending()).toBeNull();
  });

  it("settles row by row once the last row is answered", async () => {
    const onCellEdit = vi.fn();
    const h = harness(
      { approval: "writes" },
      viewOf({ editing: { onCellEdit } })
    );
    const result = h.run("edit.cells", editThree);
    const open = await parked(h);
    expect(open.decisions).toEqual(["pending", "pending", "pending"]);

    open.decideAt?.(0, true);
    const moved = h.pending();
    expect(moved).not.toBe(open);
    expect(open.identity).toBeDefined();
    expect(Object.isFrozen(open.identity)).toBe(true);
    expect(Object.keys(open.identity ?? {})).toEqual([]);
    expect(moved?.identity).toBe(open.identity);
    expect(moved?.approve).not.toBe(open.approve);
    expect(moved?.decisions).toEqual(["approved", "pending", "pending"]);
    // A position outside the plan, or a repeat, changes nothing.
    moved?.decideAt?.(9, true);
    moved?.decideAt?.(0, true);
    expect(h.pending()).toBe(moved);

    moved?.decideAt?.(1, false);
    h.pending()?.decideAt?.(2, true);
    const settled = await result;
    expect((settled.result as { approval: string }).approval).toBe("partial");
    expect(onCellEdit.mock.calls.map((call) => idOf(call[0]))).toEqual([
      "1",
      "3",
    ]);
  });

  it("approves the rest and refuses the rest around what was decided", async () => {
    const onCellEdit = vi.fn();
    const h = harness(
      { approval: "writes" },
      viewOf({ editing: { onCellEdit } })
    );
    const first = h.run("edit.cells", editThree);
    (await parked(h)).decideAt?.(1, false);
    h.pending()?.approve();
    await first;
    expect(onCellEdit.mock.calls.map((call) => idOf(call[0]))).toEqual([
      "1",
      "3",
    ]);

    onCellEdit.mockClear();
    const second = h.run("edit.cells", editThree);
    (await parked(h)).decideAt?.(0, true);
    h.pending()?.reject("only the first");
    await second;
    expect(onCellEdit.mock.calls.map((call) => idOf(call[0]))).toEqual(["1"]);
  });

  it("gives each transaction a private fresh presentation token even when the same request is repeated", async () => {
    const h = harness({ approval: "writes" });
    const first = h.run("edit.cells", editThree);
    const original = await parked(h);
    original.reject();
    await first;
    const second = h.run("edit.cells", editThree);
    const replacement = await parked(h);
    expect(replacement.proposals).toEqual(original.proposals);
    expect(replacement.identity).not.toBe(original.identity);
    replacement.reject();
    await second;
  });

  it("waits for a whole decision on a write that names no rows", async () => {
    const { ran, capability } = operation();
    const h = harness({ approval: "writes", capabilities: [capability] });
    const first = h.run("staff.archive", { who: "1" });
    const open = await parked(h);
    expect(open.proposals).toEqual([]);
    expect(open.operation).toMatchObject({
      capability: "staff.archive",
      title: "Archive",
    });
    expect(open.alwaysAllow).toBeUndefined();
    open.reject();
    expect(ran).toHaveLength(0);
    await first;

    const second = h.run("staff.archive", {});
    (await parked(h)).reject("no");
    await second;
    expect(ran).toHaveLength(0);
  });
});

describe("always allow", () => {
  it("remembers a waved-through write and asks again once revoked", async () => {
    const { ran, capability } = operation();
    const h = harness({
      approval: { policy: "writes", alwaysAllow: ["staff.archive"] },
      capabilities: [capability],
    });
    expect(h.controller.getState().alwaysAllow.capabilities).toEqual([]);

    const first = h.run("staff.archive", {});
    (await parked(h)).alwaysAllow?.();
    expect((await first).ok).toBe(true);
    expect(h.controller.getState().alwaysAllow.capabilities).toEqual([
      "staff.archive",
    ]);

    expect((await h.run("staff.archive", {})).ok).toBe(true);
    expect(ran).toHaveLength(2);
    expect(h.pending()).toBeNull();

    const listener = vi.fn();
    h.controller.subscribe(listener);
    h.controller.getState().alwaysAllow.revoke("staff.archive");
    expect(listener).toHaveBeenCalled();
    expect(h.controller.getState().alwaysAllow.capabilities).toEqual([]);

    const third = h.run("staff.archive", {});
    (await parked(h)).reject();
    await third;
    expect(ran).toHaveLength(2);
  });

  it("refuses a key the table does not offer", () => {
    const h = harness({
      approval: { policy: "writes", alwaysAllow: ["staff.nothing"] },
    });
    expect(() => {
      h.controller.sync();
    }).toThrow(/staff\.nothing/);
  });
});

describe("progress", () => {
  it("reaches the snapshot and the bridge, and clears when the call ends", async () => {
    const progress = vi.fn();
    const h = harness({ capabilities: [PROGRESS], bridge: { progress } });
    await h.run("test.progress", {});
    expect(progress.mock.calls[0]?.[0]).toMatchObject({ done: 1, total: 2 });
    expect(progress).toHaveBeenLastCalledWith(null);
    expect(h.controller.getState().progress).toBeNull();
  });
});

describe("sync", () => {
  it("publishes a changed manifest once and attaches the session once", () => {
    const publish = vi.fn();
    const attach = vi.fn();
    const viewInputs = vi.fn();
    const alwaysAllowed = vi.fn();
    const bridge = { publish, attach, viewInputs, alwaysAllowed };
    const h = harness({ bridge });
    h.controller.sync();
    h.controller.sync();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith(h.controller.session());
    expect(attach).toHaveBeenCalledTimes(1);
    expect(viewInputs).toHaveBeenCalledTimes(1);
    expect(alwaysAllowed).toHaveBeenCalledTimes(1);
    const read = viewInputs.mock.calls[0]?.[0] as () => unknown;
    expect(read()).toHaveProperty("view");

    h.setView(viewOf({ rows: ROWS.slice(0, 2) }));
    h.controller.sync();
    expect(publish).toHaveBeenCalledTimes(2);
    expect(attach).toHaveBeenCalledTimes(1);

    // A new bridge object is a new host to hand the session to.
    h.options.current = { ...h.options.current, bridge: { ...bridge } };
    h.controller.sync();
    expect(attach).toHaveBeenCalledTimes(2);
  });

  it("republishes a replacement source while retaining the logical session", () => {
    const first = sourceTable();
    const second = sourceTable("Bea");
    const publish = vi.fn();
    const attach = vi.fn();
    const h = harness(
      { bridge: { publish, attach } },
      viewOf({ neutralTable: first.table })
    );
    const session = h.session();
    const before = h.controller.getState();
    const stamp = h.controller.tableStamp();
    h.controller.sync();
    h.setView(viewOf({ neutralTable: second.table }));
    expect(h.session()).toBe(session);
    expect(h.controller.tableStamp()).not.toBe(stamp);
    expect(h.controller.getState()).not.toBe(before);
    h.controller.sync();
    h.controller.sync();
    expect(publish).toHaveBeenCalledTimes(2);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[1]?.[0]).toMatchObject({ viewRevision: 2 });
  });

  it("announces an approval, each decision, and the close", async () => {
    const approvals = vi.fn();
    const h = harness({ approval: "writes", bridge: { approvals } });
    h.controller.sync();
    expect(approvals).not.toHaveBeenCalled();

    const result = h.run("edit.cells", editThree);
    const open = await parked(h);
    h.controller.sync();
    h.controller.sync();
    expect(approvals).toHaveBeenCalledTimes(1);
    expect(approvals).toHaveBeenLastCalledWith(open);

    open.decideAt?.(0, true);
    h.controller.sync();
    expect(approvals).toHaveBeenCalledTimes(2);

    h.pending()?.reject();
    await result;
    h.controller.sync();
    expect(approvals).toHaveBeenLastCalledWith(null);
    expect(approvals).toHaveBeenCalledTimes(3);
  });

  it("retracts from a subscriber being replaced and tells the new one", async () => {
    const before = vi.fn();
    const after = vi.fn();
    const h = harness({ approval: "writes", bridge: { approvals: before } });
    const result = h.run("edit.cells", editOne);
    const open = await parked(h);
    h.controller.sync();
    expect(before).toHaveBeenLastCalledWith(open);

    h.options.current = { ...h.options.current, bridge: { approvals: after } };
    h.controller.sync();
    expect(before).toHaveBeenLastCalledWith(null);
    expect(after).toHaveBeenLastCalledWith(open);

    open.reject();
    await result;
  });

  it("releases everything on disconnect and sets it up again after", async () => {
    const approvals = vi.fn();
    const attach = vi.fn();
    const h = harness({ approval: "writes", bridge: { approvals, attach } });
    h.controller.sync();
    const result = h.run("edit.cells", editOne);
    await parked(h);
    h.controller.sync();

    h.controller.disconnect();
    expect((await result).result).toMatchObject({ applied: false });
    expect(approvals).toHaveBeenLastCalledWith(null);
    expect(h.pending()).toBeNull();

    h.controller.disconnect();
    h.controller.sync();
    expect(attach).toHaveBeenCalledTimes(2);
  });

  it("cancels retained server writes before reading a disconnected runtime", async () => {
    const { capability, ran } = operation();
    const onCellEdit = vi.fn();
    const h = harness(
      { approval: "never", capabilities: [capability] },
      viewOf({ editing: { onCellEdit } })
    );
    h.controller.sync();
    const retained = h.session();
    const revision = retained.manifest().viewRevision;
    h.controller.disconnect();
    h.flushAdmission.mockClear();
    const readView = vi.spyOn(h.runtime, "view").mockImplementation(() => {
      throw new Error("runtime disposed");
    });
    const results = await Promise.allSettled([
      retained.execute("edit.cells", editOne, revision, "disconnected-edit"),
      retained.execute(capability.key, {}, revision, "disconnected-custom"),
    ]);

    expect(results).toEqual([
      {
        status: "fulfilled",
        value: expect.objectContaining({
          ok: false,
          revision,
          idempotencyKey: "disconnected-edit",
          error: expect.objectContaining({ code: "cancelled" }),
        }),
      },
      {
        status: "fulfilled",
        value: expect.objectContaining({
          ok: false,
          revision,
          idempotencyKey: "disconnected-custom",
          error: expect.objectContaining({ code: "cancelled" }),
        }),
      },
    ]);
    expect(readView).not.toHaveBeenCalled();
    expect(h.flushAdmission).not.toHaveBeenCalled();
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(ran).toHaveLength(0);

    readView.mockRestore();
    h.controller.sync();
    expect(h.session()).toBe(retained);
    expect((await h.run("edit.cells", editOne)).ok).toBe(true);
    expect((await h.run(capability.key, {})).ok).toBe(true);
    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(ran).toHaveLength(1);
  });

  it("does not revive a pending custom plan when reconnecting", async () => {
    const { capability, ran } = operation();
    const planned = deferred<CapabilityPlan>();
    let admittedSignal: AbortSignal | undefined;
    const plan = vi.fn((context: AgentCapabilityContext) => {
      admittedSignal = context.signal;
      return planned.promise;
    });
    const h = harness({
      approval: "never",
      capabilities: [{ ...capability, plan }],
    });
    h.controller.sync();
    const retained = h.session();
    const pending = h.run(capability.key, {});
    await vi.waitFor(() => {
      expect(plan).toHaveBeenCalledTimes(1);
    });
    h.controller.disconnect();
    h.controller.sync();
    planned.resolve({ proposals: [] });

    expect((await pending).error?.code).toBe("cancelled");
    expect(admittedSignal?.aborted).toBe(true);
    expect(ran).toHaveLength(0);
    expect(h.session()).toBe(retained);
    expect((await h.run(capability.key, {})).ok).toBe(true);
    expect(ran).toHaveLength(1);
  });

  it("does not revive a pending host approval when reconnecting", async () => {
    const { capability, ran } = operation();
    const approval = deferred<ApprovalResult>();
    let admittedSignal: AbortSignal | undefined;
    const onApprove = vi.fn(
      (_subject: ApprovalSubject, signal?: AbortSignal) => {
        admittedSignal = signal;
        return approval.promise;
      }
    );
    const h = harness({
      approval: "writes",
      onApprove,
      capabilities: [capability],
    });
    h.controller.sync();
    const retained = h.session();
    const pending = h.run(capability.key, {});
    await vi.waitFor(() => {
      expect(onApprove).toHaveBeenCalledTimes(1);
    });
    h.controller.disconnect();
    h.controller.sync();
    approval.resolve(true);

    expect((await pending).error?.code).toBe("cancelled");
    expect(admittedSignal?.aborted).toBe(true);
    expect(ran).toHaveLength(0);
    expect(h.session()).toBe(retained);
    expect((await h.run(capability.key, {})).ok).toBe(true);
    expect(ran).toHaveLength(1);
  });

  it("cancels when the admission flush disconnects the table", async () => {
    const { capability, ran } = operation();
    const h = harness({ approval: "never", capabilities: [capability] });
    const retained = h.session();
    const revision = retained.manifest().viewRevision;
    h.flushAdmission.mockImplementationOnce(() => {
      h.controller.disconnect();
    });
    const result = await retained.execute(
      capability.key,
      {},
      revision,
      "disconnect-during-admission"
    );

    expect(result.error?.code).toBe("cancelled");
    expect(ran).toHaveLength(0);
    h.controller.sync();
    expect(h.session()).toBe(retained);
    expect((await h.run(capability.key, {})).ok).toBe(true);
    expect(ran).toHaveLength(1);
  });

  it("samples the columns that asked, and abandons a read nobody wants", async () => {
    const engine = createTableEngine<Row>({
      data: [...ROWS],
      columns: [{ key: "name", header: "Name", ai: { sample: true } }],
      rowKey: (row) => row.id,
    });
    const table = createNeutralTable(engine, "staff") as NeutralTable<unknown>;
    const h = harness({}, viewOf({ neutralTable: table }));
    h.controller.sync();
    await vi.waitFor(() => {
      expect(h.controller.getState().view.read().samples).toBeDefined();
    });
    expect(h.controller.getState().view.read().samples?.name).toContain("Ada");

    // Nothing asks any more: the samples go.
    const plain = createTableEngine<Row>({
      data: [...ROWS],
      columns: [{ key: "name", header: "Name" }],
      rowKey: (row) => row.id,
    });
    h.setView(
      viewOf({
        neutralTable: createNeutralTable(
          plain,
          "staff"
        ) as NeutralTable<unknown>,
      })
    );
    h.controller.sync();
    expect(h.controller.getState().view.read().samples).toBeUndefined();
  });

  it("resamples a replacement source but not an ordinary data revision", async () => {
    const first = sourceTable("Ada", true);
    const second = sourceTable("Bea", true);
    const h = harness({}, viewOf({ neutralTable: first.table }));
    const execute = vi.spyOn(h.session(), "execute");
    h.controller.sync();
    await vi.waitFor(() => {
      expect(h.controller.getState().view.read().samples?.name).toEqual([
        "Ada",
      ]);
    });
    first.engine.invalidate(["data"]);
    h.controller.sync();
    expect(execute).toHaveBeenCalledTimes(1);

    h.setView(viewOf({ neutralTable: second.table }));
    expect(h.controller.getState().view.read().samples).toBeUndefined();
    h.controller.sync();
    expect(h.controller.getState().view.read().samples).toBeUndefined();
    await vi.waitFor(() => {
      expect(h.controller.getState().view.read().samples?.name).toEqual([
        "Bea",
      ]);
    });
    expect(execute).toHaveBeenCalledTimes(2);
    h.controller.disconnect();
  });

  it("does not expose old samples after disconnecting into a server view", async () => {
    const source = sourceTable("Ada", true);
    const h = harness({}, viewOf({ neutralTable: source.table }));
    h.controller.sync();
    await vi.waitFor(() => {
      expect(h.controller.getState().view.read().samples?.name).toEqual([
        "Ada",
      ]);
    });
    h.controller.disconnect();
    h.setView(viewOf());
    expect(h.controller.getState().view.read().samples).toBeUndefined();
  });

  it("abandons a pending sample from the replaced source", async () => {
    const first = sourceTable("Ada", true);
    const second = sourceTable("Bea", true);
    const oldRead = deferred<RowWindow>();
    const readRows = vi
      .fn()
      .mockImplementationOnce(() => oldRead.promise)
      .mockResolvedValue(sampledRows("Bea"));
    const h = harness(
      { apply: { readRows } },
      viewOf({ neutralTable: first.table })
    );
    const execute = vi.spyOn(h.session(), "execute");
    h.controller.sync();
    await vi.waitFor(() => {
      expect(readRows).toHaveBeenCalledTimes(1);
    });
    const oldExecution = execute.mock.results[0];
    if (oldExecution?.type !== "return") throw new Error("no pending sample");
    h.setView(viewOf({ neutralTable: second.table }));
    h.controller.sync();
    await vi.waitFor(() => {
      expect(h.controller.getState().view.read().samples?.name).toEqual([
        "Bea",
      ]);
    });
    oldRead.resolve(sampledRows("Ada"));
    await oldExecution.value;
    await Promise.resolve();
    await Promise.resolve();
    expect(h.controller.getState().view.read().samples?.name).toEqual(["Bea"]);
    expect(readRows).toHaveBeenCalledTimes(2);
    h.controller.disconnect();
  });

  it("publishes no samples when the table cannot supply them", async () => {
    const engine = createTableEngine<Row>({
      data: [...ROWS],
      columns: [{ key: "name", header: "Name", ai: { sample: true } }],
      rowKey: (row) => row.id,
    });
    const table = createNeutralTable(engine, "staff") as NeutralTable<unknown>;
    const h = harness({}, viewOf({ neutralTable: table }));
    const live = h.controller.session();
    const execute = vi
      .spyOn(live, "execute")
      .mockRejectedValue(new Error("offline"));
    h.controller.sync();
    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalled();
    });
    await Promise.resolve();
    expect(h.controller.getState().view.read().samples).toBeUndefined();
    h.controller.disconnect();
  });
});

describe("webmcp", () => {
  function fakeContext(fail = false) {
    const tools = new Map<string, WebMcpTool>();
    const context: ModelContextLike = {
      registerTool: (tool) => {
        if (fail) throw new Error("forbidden by policy");
        tools.set(tool.name, tool);
        return () => {
          tools.delete(tool.name);
        };
      },
    };
    return { tools, context };
  }

  it("offers the table, narrows it, and withdraws on disconnect", () => {
    const fake = fakeContext();
    vi.stubGlobal("document", { modelContext: fake.context });
    const onRegister = vi.fn();
    const h = harness({
      webmcp: { exposedTo: ["view.describe"], onRegister },
    });
    h.controller.sync();
    h.controller.sync();
    expect([...fake.tools.keys()]).toEqual(["adapttable.staff.view.describe"]);
    expect(onRegister).toHaveBeenCalledTimes(1);

    h.controller.disconnect();
    expect(fake.tools.size).toBe(0);
    expect(onRegister).toHaveBeenLastCalledWith([]);
  });

  it("offers everything for `true` and takes it back when switched off", () => {
    const fake = fakeContext();
    vi.stubGlobal("document", { modelContext: fake.context });
    const h = harness({ webmcp: true });
    h.controller.sync();
    expect(fake.tools.size).toBeGreaterThan(1);

    h.options.current = { ...h.options.current, webmcp: undefined };
    h.controller.sync();
    expect(fake.tools.size).toBe(0);
  });

  it("warns once when the page forbids it", () => {
    vi.stubGlobal("document", { modelContext: fakeContext(true).context });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    harness({ webmcp: true }).controller.sync();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("forbidden by policy")
    );
  });
});
