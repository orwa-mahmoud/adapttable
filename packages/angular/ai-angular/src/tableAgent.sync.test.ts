/**
 * How the provider stays level with the table it is describing.
 *
 * The manifest an agent reads is republished whenever the table moves, so the
 * provider has to notice every move — including one that lands between the
 * render that read the table and the subscription that will hear about the
 * next one. Angular re-reads the store's snapshot after it attaches, which is
 * exactly that window; what has to hold is that the provider is a store
 * consumer rather than a hook re-checking by hand on every commit.
 *
 * The other half is the quiet case: a rerender that changes nothing must
 * publish nothing, or a host watching the bridge sees churn that says the
 * table changed when it did not.
 */
import type { AgentManifest } from "@adapttable/ai";
import {
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import {
  act,
  mountRuntime,
  testAgent as tableAgent,
  waitFor,
} from "./tableAgent.fixture";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];

function makeTable() {
  const engine = createTableEngine<Row>({
    data: ROWS,
    columns: [{ key: "name", header: "Name", sortable: true }],
    rowKey: (row) => row.id,
  });
  return {
    engine,
    neutral: createNeutralTable(engine, "sync"),
  };
}

function options(neutral: NeutralTable<Row>, published: AgentManifest[]) {
  return {
    features: [
      tableAgent({
        tableId: "sync",
        bridge: { publish: (manifest) => published.push(manifest) },
      }),
    ],
    view: {
      rows: ROWS,
      visibleRows: ROWS,
      neutralTable: neutral,
      getRowId: (row: Row) => row.id,
      rowLabel: (row: Row) => row.name,
    },
  };
}

describe("the agent provider follows the table", () => {
  it("catches a revision that moved before the subscription attached", async () => {
    const { engine, neutral } = makeTable();
    const published: AgentManifest[] = [];

    // The table moves while Angular is still rendering the tree that will
    // subscribe to it — the window a hand-rolled subscription drops.
    const original = neutral.subscribe.bind(neutral);
    const subscribe = vi.fn(
      (
        axes: Parameters<typeof original>[0],
        listener: Parameters<typeof original>[1]
      ) => {
        engine.dispatch({ type: "setSearch", search: "ada" });
        return original(axes, listener);
      }
    );
    Object.defineProperty(neutral, "subscribe", { value: subscribe });

    mountRuntime(options(neutral, published));
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    expect(subscribe).toHaveBeenCalled();
    const first = published[0]?.viewRevision ?? 0;
    // The move that happened during subscribe is reflected, not lost.
    await waitFor(() => {
      expect(published.at(-1)?.viewRevision).toBeGreaterThan(first - 1);
    });
    expect(published.at(-1)?.tableId).toBe("sync");
  });

  it("republishes when the table moves after mount", async () => {
    const { engine, neutral } = makeTable();
    const published: AgentManifest[] = [];
    mountRuntime(options(neutral, published));
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    const before = published.length;

    await act(async () => {
      engine.dispatch({ type: "setSearch", search: "grace" });
      await Promise.resolve();
    });
    expect(published.length).toBeGreaterThan(before);
  });

  it("publishes nothing when a rerender changes nothing", async () => {
    const { neutral } = makeTable();
    const published: AgentManifest[] = [];
    const view = mountRuntime(options(neutral, published));
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    const before = published.length;

    await act(async () => {
      view.rerender(options(neutral, published));
      await Promise.resolve();
    });
    expect(published).toHaveLength(before);
  });
});

describe("Angular revision subscriptions", () => {
  it("resubscribes when the published neutral table is replaced", async () => {
    const first = makeTable();
    const second = makeTable();
    const published: AgentManifest[] = [];
    const firstSubscribe = vi.spyOn(first.neutral, "subscribe");
    const secondSubscribe = vi.spyOn(second.neutral, "subscribe");
    const mounted = mountRuntime(options(first.neutral, published));
    expect(firstSubscribe).toHaveBeenCalledOnce();
    mounted.rerender(options(second.neutral, published));
    expect(secondSubscribe).toHaveBeenCalledOnce();
    const before = published.length;
    first.engine.dispatch({ type: "setSearch", search: "detached" });
    expect(published).toHaveLength(before);
    second.engine.dispatch({ type: "setSearch", search: "grace" });
    await waitFor(() => expect(published.length).toBeGreaterThan(before));
  });

  it("releases the engine subscription on destruction", () => {
    const { engine, neutral } = makeTable();
    const published: AgentManifest[] = [];
    const mounted = mountRuntime(options(neutral, published));
    const before = published.length;
    mounted.unmount();
    engine.dispatch({ type: "setSearch", search: "unmounted" });
    expect(published).toHaveLength(before);
  });
});
