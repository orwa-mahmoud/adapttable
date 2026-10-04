import type { AgentCapabilityDefinition } from "@adapttable/ai";
import { createNeutralTable, createTableEngine } from "@adapttable/core";
import type { TableRuntimeView } from "@adapttable/core/binding";
import {
  AGENT_APPROVAL_STATE,
  createFeatureState,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import {
  TABLE_AGENT_STATE,
  tableAgent,
  type TableAgentOptions,
} from "../src/tableAgent";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
function mount(options: TableAgentOptions, initiallyActive = true) {
  const scope = effectScope();
  const state = createFeatureState();
  const active = shallowRef(initiallyActive);
  const input = shallowRef(options);
  const view = shallowRef<TableRuntimeView>({
    rows: [{ id: "one" }],
    getRowId: (row) => String((row as { id: string }).id),
    rowLabel: () => "One",
  });
  scope.run(() =>
    useDataTableShell<unknown>({
      data: [],
      columns: [],
      rowKey: () => "",
      features: [
        {
          id: "agent-fixture",
          mount: (context) =>
            tableAgent(input).mount?.({
              ...context,
              scope: context.scope,
              state,
              active,
              runtime: {
                view: () => view.value,
                labels: () => undefined,
                rowAt: (index) => view.value.rows[index],
                featureIds: () => ["table-agent"],
              },
              reconcile: () => undefined,
              flushAdmission: () => undefined,
              flush: (run) => run(),
            }),
        },
      ],
    })
  );
  stops.push(() => scope.stop());
  return {
    scope,
    state,
    active,
    input,
    view,
    session: () => {
      const session = state.get(TABLE_AGENT_STATE).value;
      if (!session) throw new Error("Agent not published");
      return session;
    },
  };
}
const options = (
  patch: Partial<TableAgentOptions> = {}
): TableAgentOptions => ({
  tableId: "people",
  columns: { id: { type: "string" } },
  ...patch,
});
const operation = (execute: () => void): AgentCapabilityDefinition => ({
  key: "test.write",
  summary: "Test write",
  kind: "write",
  guide: {
    guide: "Test",
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: () => {
    execute();
    return { applied: true };
  },
});
describe("tableAgent lifecycle", () => {
  it("stays inert before activation and publishes a single feature session afterwards", async () => {
    const attach = vi.fn();
    const host = mount(options({ bridge: { attach } }), false);
    await nextTick();
    expect(attach).not.toHaveBeenCalled();
    expect(host.state.get(TABLE_AGENT_STATE).value).toBeUndefined();
    host.active.value = true;
    await nextTick();
    await nextTick();
    expect(attach).toHaveBeenCalledOnce();
    expect(host.session().manifest().tableId).toBe("people");
  });
  it("uses latest bridge callbacks without remounting unrelated resources", async () => {
    const before = vi.fn();
    const after = vi.fn();
    const host = mount(options({ bridge: { attach: before } }));
    await nextTick();
    const session = host.session();
    host.input.value = options({ bridge: { attach: after } });
    await nextTick();
    await nextTick();
    expect(host.session()).toBe(session);
    expect(before).toHaveBeenCalledOnce();
    expect(after).toHaveBeenCalledOnce();
  });
  it("invalidates retained writes and retracts state on scope disposal", async () => {
    const write = vi.fn();
    const host = mount(
      options({
        writePolicy: "allow",
        approval: "never",
        commit: "immediate",
        capabilities: [operation(write)],
      })
    );
    await nextTick();
    const session = host.session();
    const revision = session.manifest().viewRevision;
    host.scope.stop();
    const result = await session.execute(
      "test.write",
      {},
      revision,
      "disposed"
    );
    expect(result.error?.code).toBe("cancelled");
    expect(write).not.toHaveBeenCalled();
    expect(host.state.get(TABLE_AGENT_STATE).value).toBeUndefined();
  });
  it("cancels pending approval across deactivate and resume without reviving it", async () => {
    const write = vi.fn();
    const host = mount(
      options({
        writePolicy: "allow",
        approval: "writes",
        commit: "immediate",
        capabilities: [operation(write)],
      })
    );
    await nextTick();
    const session = host.session();
    const pending = session.execute(
      "test.write",
      {},
      session.manifest().viewRevision,
      "pending"
    );
    await vi.waitFor(() =>
      expect(host.state.get(AGENT_APPROVAL_STATE).value).not.toBeNull()
    );
    host.active.value = false;
    await nextTick();
    const result = await pending;
    expect(result).toMatchObject({
      result: { applied: false, approval: "rejected" },
    });
    host.active.value = true;
    await nextTick();
    await nextTick();
    expect(host.state.get(AGENT_APPROVAL_STATE).value).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });
  it("replaces same-revision neutral sources without retaining old observation identity", async () => {
    const one = createTableEngine<unknown>({
      data: [{ id: "one" }],
      columns: [{ key: "id" }],
      rowKey: (row) => String((row as { id: string }).id),
    });
    const two = createTableEngine<unknown>({
      data: [{ id: "two" }],
      columns: [{ key: "id" }],
      rowKey: (row) => String((row as { id: string }).id),
    });
    stops.push(one.dispose, two.dispose);
    const host = mount(options());
    const source1 = createNeutralTable(one, "people");
    const source2 = createNeutralTable(two, "people");
    host.view.value = { ...host.view.value, neutralTable: source1 };
    await nextTick();
    await nextTick();
    const session = host.session();
    const revision = session.manifest().viewRevision;
    host.view.value = {
      ...host.view.value,
      neutralTable: source2,
      rows: [{ id: "two" }],
    };
    await nextTick();
    await nextTick();
    expect(session.manifest().viewRevision).toBeGreaterThan(revision);
    expect(
      (await session.execute("view.describe", {}, revision, "replaced")).error
        ?.code
    ).toBe("revision-mismatch");
  });
  it("routes synchronous view mutations through the feature flush seam", async () => {
    const host = mount(
      options({ columns: { id: { type: "string" }, name: { type: "string" } } })
    );
    const setHidden = vi.fn((key: string, hidden: boolean) => {
      host.view.value = {
        ...host.view.value,
        columnLayout: {
          keys: ["id", "name"],
          hidden: hidden ? [key] : [],
          setHidden,
        },
      };
    });
    host.view.value = {
      ...host.view.value,
      columnLayout: { keys: ["id", "name"], hidden: [], setHidden },
    };
    await nextTick();
    await nextTick();
    const session = host.session();
    const result = await session.execute(
      "view.hideColumn",
      { key: "name", hidden: true },
      session.manifest().viewRevision,
      "direct-layout"
    );
    expect(result.ok).toBe(true);
    expect(setHidden).toHaveBeenCalledExactlyOnceWith("name", true);
    expect(result.revision).toBe(session.manifest().viewRevision);
  });
});
