/**
 * The in-memory source publishes its engine with the render, not during it.
 *
 * `useFrontendData` renders from the candidate — the rows, the page it settled
 * on and the totals beside them all come from the state this render is about
 * to commit, so the table is never internally inconsistent. What an agent
 * holds through `source.tableEngine` is the committed table: the one on
 * screen, never one a render was still deciding on.
 */
import type { TableSource } from "@adapttable/core";
import { act, render, screen } from "@testing-library/react";
import { Suspense, use, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useFrontendData } from "./useFrontendData";

interface Person {
  id: string;
  name: string;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Alan" },
  { id: "3", name: "Grace" },
  { id: "4", name: "Lin" },
];

function makeGate() {
  let release = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  function Gate() {
    use(promise);
    return null;
  }
  return { Gate, release };
}

function Source({
  data,
  limit,
  onSource,
}: {
  data: Person[];
  limit: number;
  onSource: (source: TableSource<Person>) => void;
}) {
  "use no memo";
  const source = useFrontendData<Person>({
    data,
    urlSync: false,
    defaults: { limit },
  });
  onSource(source);
  return (
    <output data-testid="rows">
      {source.rows.map((row) => row.id).join(",")}
    </output>
  );
}

describe("useFrontendData publishes at commit", () => {
  it("renders the candidate and keeps the committed engine on screen state", async () => {
    const { Gate, release } = makeGate();
    let source: TableSource<Person> | undefined;
    const woken = vi.fn();

    function Host({ data, gated }: { data: Person[]; gated: boolean }) {
      return (
        <Suspense fallback={<span data-testid="pending">…</span>}>
          <Source
            data={data}
            limit={2}
            onSource={(next) => {
              source = next;
            }}
          />
          {gated ? <Gate /> : null}
        </Suspense>
      );
    }

    const view = render(<Host data={ROWS} gated={false} />);
    const engine = source?.tableEngine;
    if (!engine) throw new Error("no engine");
    engine.subscribe("all", woken);
    expect(source?.rows.map((row) => row.id)).toEqual(["1", "2"]);
    expect(engine.rows("page").map((row) => row.id)).toEqual(["1", "2"]);
    const before = engine.snapshot().revisions;

    // A render that reaches the source and then suspends.
    await act(async () => {
      view.rerender(<Host data={[ROWS[3]!]} gated />);
      await Promise.resolve();
    });
    expect(engine.rows("full").map((row) => row.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(engine.snapshot().revisions).toEqual(before);
    expect(woken).not.toHaveBeenCalled();

    release();
    await act(async () => {
      view.rerender(<Host data={ROWS} gated />);
      await Promise.resolve();
    });
    expect(engine.snapshot().revisions).toEqual(before);

    await act(async () => {
      view.rerender(<Host data={[ROWS[3]!]} gated />);
      await Promise.resolve();
    });
    expect(source?.rows.map((row) => row.id)).toEqual(["4"]);
    expect(engine.rows("full").map((row) => row.id)).toEqual(["4"]);
    expect(woken).toHaveBeenCalled();
  });

  it("clamps a controlled page onto the rows that are left", async () => {
    let source: TableSource<Person> | undefined;
    function Host({ data }: { data: Person[] }) {
      return (
        <Source
          data={data}
          limit={2}
          onSource={(next) => {
            source = next;
          }}
        />
      );
    }
    const view = render(<Host data={ROWS} />);
    act(() => {
      source?.setPage(2);
    });
    expect(source?.page).toBe(2);
    expect(source?.rows.map((row) => row.id)).toEqual(["3", "4"]);

    await act(async () => {
      view.rerender(<Host data={[ROWS[0]!]} />);
      await Promise.resolve();
    });
    // The page that exists, and the rows on it, in the same render.
    expect(source?.page).toBe(1);
    expect(source?.rows.map((row) => row.id)).toEqual(["1"]);
    expect(source?.total).toBe(1);
    expect(source?.tableEngine?.snapshot().page).toBe(1);
  });

  it("does not re-derive when a render only rebuilds the array", async () => {
    let source: TableSource<Person> | undefined;
    let renders = 0;
    function Host() {
      "use no memo";
      const [tick, setTick] = useState(0);
      renders += 1;
      return (
        <>
          <button type="button" onClick={() => setTick(tick + 1)}>
            tick
          </button>
          <Source
            data={[...ROWS]}
            limit={2}
            onSource={(next) => {
              source = next;
            }}
          />
        </>
      );
    }
    render(<Host />);
    const engine = source?.tableEngine;
    const before = engine?.snapshot().revisions;
    const rowsBefore = source?.rows;
    const rendersBefore = renders;

    await act(async () => {
      screen.getByRole("button", { name: "tick" }).click();
      await Promise.resolve();
    });
    expect(renders).toBe(rendersBefore + 1);
    expect(engine?.snapshot().revisions).toEqual(before);
    expect(source?.rows).toEqual(rowsBefore);
  });
});
