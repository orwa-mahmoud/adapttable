/** Stable live sessions still notify Angular without cancelling conversations. */
import type {
  AssistantTransport,
  AssistantTransportReply,
} from "@adapttable/ai";
import {
  ADAPTTABLE_FEATURE_STATE,
  type FeatureState,
} from "@adapttable/angular";
import { computed, Injector, runInInjectionContext } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { injectTableAssistant } from "./assistant";
import { TABLE_AGENT_STATE } from "./tableAgent";
import { mountRuntime, testAgent, waitFor } from "./tableAgent.fixture";

const scopes = new Set<ReturnType<typeof Injector.create>>();
afterEach(() => {
  for (const scope of scopes) scope.destroy();
  scopes.clear();
});

function assistantFor(
  table: {
    readonly state: FeatureState;
    readonly fixture: {
      readonly componentRef: { readonly injector: Injector };
    };
  },
  transport: AssistantTransport
) {
  const scope = Injector.create({
    providers: [{ provide: ADAPTTABLE_FEATURE_STATE, useValue: table.state }],
    parent: table.fixture.componentRef.injector,
  });
  scopes.add(scope);
  const session = table.state.get(TABLE_AGENT_STATE);
  const assistant = runInInjectionContext(scope, () =>
    injectTableAssistant(
      computed(() => ({
        session: session(),
        transport,
        suggestions: [
          {
            id: "search",
            title: "Find Ada",
            prompt: "find Ada",
            requires: ["view.setSearch"],
          },
        ],
      }))
    )
  );
  TestBed.tick();
  return assistant;
}

describe("agent state publications inside Angular", () => {
  it("keeps a running turn and connection when the same session is republished", async () => {
    const publish = vi.fn();
    const attach = vi.fn();
    const feature = testAgent({
      tableId: "stable",
      bridge: { publish, attach },
    });
    const view = {
      rows: [{ id: "1", name: "Ada" }],
      getRowId: (row: unknown) => (row as { id: string }).id,
      rowLabel: () => "Ada",
    };
    const table = mountRuntime({ features: [feature], view });
    await table.fixture.whenStable();
    const session = table.state.get(TABLE_AGENT_STATE)();
    let settle: ((reply: AssistantTransportReply) => void) | undefined;
    let aborted = false;
    const connect = vi.fn();
    const disconnect = vi.fn();
    const transport: AssistantTransport = {
      connect,
      disconnect,
      send: (input) => {
        input.signal?.addEventListener("abort", () => {
          aborted = true;
        });
        return new Promise((resolve) => {
          settle = resolve;
        });
      },
    };
    const assistant = assistantFor(table, transport);
    const sending = assistant().send("hello");
    await waitFor(() => expect(assistant().busy).toBe(true));
    table.rerender({ features: [feature], view: { ...view } });
    await table.fixture.whenStable();
    expect(publish).toHaveBeenCalledOnce();
    expect(attach).toHaveBeenCalledOnce();
    expect(table.state.get(TABLE_AGENT_STATE)()).toBe(session);
    expect(connect).toHaveBeenCalledOnce();
    expect(disconnect).not.toHaveBeenCalled();
    expect(aborted).toBe(false);
    expect(assistant().busy).toBe(true);
    settle?.({ text: "still here" });
    await sending;
    expect(assistant().messages.at(-1)?.text).toBe("still here");
  });

  it("refreshes a catalog-dependent suggestion without replacing the session", async () => {
    const feature = testAgent({ tableId: "catalog" });
    const view = { rows: [], getRowId: () => "1", rowLabel: () => "row" };
    const table = mountRuntime({ features: [feature], view });
    await table.fixture.whenStable();
    const session = table.state.get(TABLE_AGENT_STATE)();
    const assistant = assistantFor(table, {
      send: () => Promise.resolve({ text: "done" }),
    });
    expect(assistant().suggestions).toEqual([]);
    table.rerender({
      features: [feature],
      view: {
        ...view,
        query: {
          page: 1,
          limit: 10,
          search: "",
          setPage: vi.fn(),
          setLimit: vi.fn(),
          setSort: vi.fn(),
          setSearch: vi.fn(),
        },
      },
    });
    await table.fixture.whenStable();
    expect(table.state.get(TABLE_AGENT_STATE)()).toBe(session);
    expect(assistant().suggestions.map((entry) => entry.id)).toEqual([
      "search",
    ]);
  });

  it("releases the assistant store once when its child injection context ends", async () => {
    const table = mountRuntime({
      features: [testAgent({ tableId: "cleanup" })],
    });
    await table.fixture.whenStable();
    const connect = vi.fn();
    const disconnect = vi.fn();
    const assistant = assistantFor(table, {
      connect,
      disconnect,
      send: () => Promise.resolve({ text: "done" }),
    });
    await waitFor(() => expect(assistant().status).toBe("ready"));
    const scope = [...scopes][0];
    if (!scope) throw new Error("Missing assistant scope");
    scope.destroy();
    scopes.delete(scope);
    table.unmount();
    expect(connect).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
