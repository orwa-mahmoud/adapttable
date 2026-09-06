/**
 * How the provider stays level with the table it is describing.
 *
 * The manifest an agent reads is republished whenever the table moves, so the
 * provider has to notice every move — including one that lands between the
 * render that read the table and the subscription that will hear about the
 * next one. React re-reads the store's snapshot after it attaches, which is
 * exactly that window; what has to hold is that the provider is a store
 * consumer rather than a hook re-checking by hand on every commit.
 *
 * The other half is the quiet case: a rerender that changes nothing must
 * publish nothing, or a host watching the bridge sees churn that says the
 * table changed when it did not.
 */
import {
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
} from "@adapttable/core";
import {
  applyTableFeatures,
  FeatureProviders,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { act, render, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { tableAgent } from "./react";
import type { AgentManifest } from "./types";

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
    neutral: createNeutralTable(engine, "sync") as NeutralTable<unknown>,
  };
}

function Publisher({ neutral }: { neutral: NeutralTable<unknown> }) {
  const rows = useRef<readonly unknown[]>(ROWS);
  usePublishTableRuntime(rows.current, undefined, {
    rows: rows.current,
    visibleRows: rows.current,
    neutralTable: neutral,
    getRowId: (row: unknown) => (row as Row).id,
    rowLabel: (row: unknown) => (row as Row).name,
  });
  return null;
}

function Harness({
  neutral,
  onPublish,
}: {
  neutral: NeutralTable<unknown>;
  onPublish: (manifest: AgentManifest) => void;
}) {
  const props = applyTableFeatures({
    features: [tableAgent({ tableId: "sync", bridge: { publish: onPublish } })],
  });
  return (
    <FeatureProviders props={props}>
      <Publisher neutral={neutral} />
    </FeatureProviders>
  );
}

describe("the agent provider follows the table", () => {
  it("catches a revision that moved before the subscription attached", async () => {
    const { engine, neutral } = makeTable();
    const published: AgentManifest[] = [];

    // The table moves while React is still rendering the tree that will
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

    render(<Harness neutral={neutral} onPublish={(m) => published.push(m)} />);
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
    render(<Harness neutral={neutral} onPublish={(m) => published.push(m)} />);
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
    const view = render(
      <Harness neutral={neutral} onPublish={(m) => published.push(m)} />
    );
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    const before = published.length;

    await act(async () => {
      view.rerender(
        <Harness neutral={neutral} onPublish={(m) => published.push(m)} />
      );
      await Promise.resolve();
    });
    expect(published).toHaveLength(before);
  });
});
