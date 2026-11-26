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
import type { AgentManifest } from "@adapttable/ai";
import {
  FeatureProviders,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { applyTableFeatures } from "@adapttable/react/features";
import { act, render, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { tableAgent } from "./react";
import {
  type NeutralTable,
  type PublishedTable,
  RealTable,
} from "./realTable.test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];

function Publisher({ neutral }: { neutral: NeutralTable }) {
  const rows = useRef<readonly unknown[]>(ROWS);
  usePublishTableRuntime({
    rows: () => rows.current,
    labels: () => undefined,
    view: () => ({
      rows: rows.current,
      visibleRows: rows.current,
      neutralTable: neutral,
      getRowId: (row: unknown) => (row as Row).id,
      rowLabel: (row: unknown) => (row as Row).name,
    }),
  });
  return null;
}

/**
 * The agent over a real table. `wrap` may replace the neutral surface the
 * agent reads (to watch it subscribe); `onTable` hears every publish.
 */
function Harness({
  onPublish,
  onTable,
  wrap = (neutral) => neutral,
}: {
  onPublish: (manifest: AgentManifest) => void;
  onTable?: (table: PublishedTable) => void;
  wrap?: (neutral: NeutralTable, table: PublishedTable) => NeutralTable;
}) {
  const [neutral, setNeutral] = useState<NeutralTable>();
  const props = applyTableFeatures({
    features: [tableAgent({ tableId: "sync", bridge: { publish: onPublish } })],
  });
  return (
    <>
      <RealTable
        rows={ROWS}
        onPublish={(table) => {
          onTable?.(table);
          setNeutral((current) => current ?? wrap(table.neutral, table));
        }}
      />
      {neutral ? (
        <FeatureProviders props={props}>
          <Publisher neutral={neutral} />
        </FeatureProviders>
      ) : null}
    </>
  );
}

/** Search the real table the way a reader does. */
function search(table: PublishedTable | undefined, text: string): void {
  const setSearch = table?.view.query?.setSearch;
  if (!setSearch) throw new Error("The table publishes no search");
  setSearch(text);
}

describe("the agent provider follows the table", () => {
  it("catches a revision that moved before the subscription attached", async () => {
    const published: AgentManifest[] = [];
    const subscribe = vi.fn();

    // The table moves while React is still rendering the tree that will
    // subscribe to it — the window a hand-rolled subscription drops.
    const wrap = (neutral: NeutralTable, table: PublishedTable) =>
      Object.create(neutral, {
        subscribe: {
          value: (...args: Parameters<NeutralTable["subscribe"]>) => {
            subscribe();
            search(table, "ada");
            return neutral.subscribe(...args);
          },
        },
      }) as NeutralTable;

    render(<Harness onPublish={(m) => published.push(m)} wrap={wrap} />);
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    expect(subscribe).toHaveBeenCalled();
    const first = published[0]?.viewRevision ?? 0;
    // The move that happened during subscribe is reflected, not lost.
    await waitFor(() => {
      expect(published.at(-1)?.viewRevision).toBeGreaterThan(first);
    });
    expect(published.at(-1)?.tableId).toBe("sync");
  });

  it("republishes when the table moves after mount", async () => {
    const published: AgentManifest[] = [];
    let table: PublishedTable | undefined;
    render(
      <Harness
        onPublish={(m) => published.push(m)}
        onTable={(next) => (table = next)}
      />
    );
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    const before = published.length;

    await act(async () => {
      search(table, "grace");
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(before);
    });
  });

  it("publishes nothing when a rerender changes nothing", async () => {
    const published: AgentManifest[] = [];
    const onPublish = (m: AgentManifest) => published.push(m);
    const view = render(<Harness onPublish={onPublish} />);
    await waitFor(() => {
      expect(published.length).toBeGreaterThan(0);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const before = published.length;

    await act(async () => {
      view.rerender(<Harness onPublish={onPublish} />);
      await Promise.resolve();
    });
    expect(published).toHaveLength(before);
  });
});
