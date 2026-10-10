import type { AgentCapabilityDefinition, AgentSession } from "@adapttable/ai";
import { useDataTableShell } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import {
  TABLE_AGENT_STATE,
  tableAgent,
  type TableAgentOptions,
} from "../src/tableAgent";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
function mount(input: Parameters<typeof tableAgent>[0]) {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      data: [{ id: "one" }],
      columns: [{ key: "id" }],
      rowKey: (row: { id: string }) => row.id,
      urlSync: false,
      features: [tableAgent(input)],
    })
  );
  if (!shell) throw new Error("missing shell");
  stops.push(() => scope.stop());
  const session = (): AgentSession => {
    const value = shell.state.get(TABLE_AGENT_STATE).value;
    if (!value) throw new Error("missing session");
    return value;
  };
  return { shell, scope, session };
}
const capability = (
  execute: () => void,
  summary = "Write"
): AgentCapabilityDefinition => ({
  key: "test.write",
  kind: "write",
  summary,
  guide: {
    guide: summary,
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: () => {
    execute();
    return { applied: true };
  },
});
const options = (execute: () => void): TableAgentOptions => ({
  tableId: "one",
  approval: "never",
  commit: "immediate",
  writePolicy: "allow",
  capabilities: [capability(execute)],
});
describe("tableAgent reactive getter snapshots", () => {
  it("evaluates an inline reactive factory once per dependency change and revokes policy at admission", async () => {
    const write = vi.fn();
    const allow = shallowRef(true);
    const getter = vi.fn((): TableAgentOptions => ({
      ...options(write),
      writePolicy: allow.value ? "allow" : "deny",
      bridge: { attach: () => undefined },
    }));
    const host = mount(getter);
    await nextTick();
    await nextTick();
    const session = host.session();
    session.manifest();
    session.catalog();
    session.manifest();
    expect(getter).toHaveBeenCalledOnce();
    const run = session.execute(
      "test.write",
      {},
      session.manifest().viewRevision,
      "queued"
    );
    allow.value = false;
    const result = await run;
    expect(result.ok).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(getter).toHaveBeenCalledTimes(2);
  });
  it("still reads raw object mutations and reactive ref replacements when execution is admitted", async () => {
    const write = vi.fn();
    const raw: {
      -readonly [K in keyof TableAgentOptions]: TableAgentOptions[K];
    } = options(write);
    const host = mount(raw);
    await nextTick();
    await nextTick();
    const session = host.session();
    const run = session.execute(
      "test.write",
      {},
      session.manifest().viewRevision,
      "raw"
    );
    raw.writePolicy = "deny";
    expect((await run).error?.code).toBe("write-denied");
    expect(write).not.toHaveBeenCalled();
    const input = shallowRef(options(write));
    const refHost = mount(input);
    await nextTick();
    await nextTick();
    const previous = refHost.session();
    const queued = previous.execute(
      "test.write",
      {},
      previous.manifest().viewRevision,
      "ref"
    );
    input.value = { ...input.value, writePolicy: "deny" };
    expect((await queued).error?.code).toBe("write-denied");
    expect(write).not.toHaveBeenCalled();
  });

  it("preserves completed mutation receipts without rerunning them and denies fresh writes after revocation", async () => {
    const write = vi.fn();
    const base = options(write);
    const allow = shallowRef(true);
    const host = mount(() => ({
      ...base,
      writePolicy: allow.value ? "allow" : "deny",
    }));
    await nextTick();
    await nextTick();
    const session = host.session();
    const revision = session.manifest().viewRevision;
    const first = await session.execute("test.write", {}, revision, "cached");
    expect(first.ok).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    allow.value = false;
    const replay = await session.execute("test.write", {}, revision, "cached");
    expect(host.session()).toBe(session);
    expect(replay).toEqual(first);
    expect(write).toHaveBeenCalledOnce();
    const fresh = await session.execute(
      "test.write",
      {},
      session.manifest().viewRevision,
      "fresh"
    );
    expect(fresh.error?.code).toBe("write-denied");
    expect(write).toHaveBeenCalledOnce();
  });

  it("re-derives a cached read after getter-owned column visibility is revoked", async () => {
    const readable = shallowRef(true);
    const host = mount(() => ({
      tableId: "columns",
      columns: { id: { type: "string", readable: readable.value } },
    }));
    await nextTick();
    await nextTick();
    const session = host.session();
    const revision = session.manifest().viewRevision;
    const before = await session.execute(
      "columns.describe",
      {},
      revision,
      "columns"
    );
    expect(JSON.stringify(before.result)).toContain('"readable":true');
    readable.value = false;
    const after = await session.execute(
      "columns.describe",
      {},
      revision,
      "columns"
    );
    expect(host.session()).toBe(session);
    expect(JSON.stringify(after.result)).toContain('"readable":false');
    expect(JSON.stringify(after.result)).not.toContain('"readable":true');
  });
  it.each(["table", "capability"] as const)(
    "never revives a retired session after delivered %s A to B to A changes",
    async (kind) => {
      const write = vi.fn();
      const original = options(write);
      const input = shallowRef(original);
      const host = mount(() => input.value);
      await nextTick();
      await nextTick();
      const first = host.session();
      const revision = first.manifest().viewRevision;
      input.value =
        kind === "table"
          ? { ...original, tableId: "two" }
          : { ...original, capabilities: [capability(write, "Replacement")] };
      await nextTick();
      await nextTick();
      expect(host.session()).not.toBe(first);
      input.value = original;
      await nextTick();
      await nextTick();
      expect(host.session()).not.toBe(first);
      const result = await first.execute("test.write", {}, revision, "retired");
      expect(result.ok).toBe(false);
      expect(write).not.toHaveBeenCalled();
    }
  );
});
