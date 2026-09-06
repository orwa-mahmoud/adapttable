/**
 * What the outside world sees while a render is still deciding.
 *
 * React may render a tree it never commits — a suspended sibling, a
 * transition it abandons, a Strict Mode double pass. The engine is not part
 * of React's state, so a render that writes to it writes to something an
 * agent, a second component or a subscriber can read immediately. Silence is
 * not isolation: a table that never reached the screen must never be the
 * table an agent is looking at.
 *
 * So a render stages a candidate, and the candidate is published when React
 * accepts the render — and only then.
 */
import type {
  ExtraFilters,
  TableEngine,
  TableRevisions,
} from "@adapttable/core";
import { act, render, screen } from "@testing-library/react";
import { StrictMode, Suspense, use } from "react";
import { describe, expect, it, vi } from "vitest";

import { useTableEngine } from "./useTableEngine";

interface Person {
  id: string;
  name: string;
}

const columns = [{ key: "name", sortable: true }];
const ADA = { id: "1", name: "Ada" };
const ALAN = { id: "2", name: "Alan" };
const GRACE = { id: "3", name: "Grace" };

/** A child that suspends until the test releases it. */
function makeGate() {
  let release = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  function Gate() {
    use(promise);
    return <span data-testid="gate">ready</span>;
  }
  return { Gate, release };
}

function Table({
  data,
  onEngine,
}: {
  data: Person[];
  onEngine: (engine: TableEngine<Person>) => void;
}) {
  // The harness reads the engine directly, which the React Compiler would
  // otherwise memoize on the engine identity — stable by design.
  "use no memo";
  const engine = useTableEngine<Person>({
    data,
    columns,
    rowKey: (row) => row.id,
    tableId: "commit",
  });
  onEngine(engine);
  return (
    <output data-testid="rows">
      {engine.candidate
        .rows("full")
        .map((row) => row.id)
        .join(",")}
    </output>
  );
}

describe("the engine publishes with the render, not during it", () => {
  it("keeps an abandoned render out of the committed table", async () => {
    const { Gate, release } = makeGate();
    let engine: TableEngine<Person> | undefined;
    const seen: TableRevisions[] = [];
    const other = vi.fn();

    function Host({ data, gated }: { data: Person[]; gated: boolean }) {
      return (
        <Suspense fallback={<span data-testid="pending">…</span>}>
          <Table
            data={data}
            onEngine={(next) => {
              engine ??= next;
            }}
          />
          {gated ? <Gate /> : null}
        </Suspense>
      );
    }

    const view = render(<Host data={[ADA, ALAN]} gated={false} />);
    const committed = engine;
    if (!committed) throw new Error("no engine");
    committed.subscribe("all", (revisions) => seen.push(revisions));
    committed.subscribe(["data"], other);

    const before = committed.snapshot().revisions;
    expect(committed.rows("full").map((row) => row.id)).toEqual(["1", "2"]);

    // A render that reaches the engine and then suspends before commit.
    await act(async () => {
      view.rerender(<Host data={[GRACE]} gated />);
      await Promise.resolve();
    });

    // The screen never changed, and neither did the table anyone else holds.
    expect(screen.getByTestId("pending")).toBeVisible();
    expect(committed.rows("full").map((row) => row.id)).toEqual(["1", "2"]);
    expect(committed.snapshot().revisions).toEqual(before);
    expect(seen).toHaveLength(0);
    expect(other).not.toHaveBeenCalled();

    // Abandon it: back to the data that is on screen, still nothing leaked.
    await act(async () => {
      view.rerender(<Host data={[ADA, ALAN]} gated={false} />);
      await Promise.resolve();
    });
    expect(committed.rows("full").map((row) => row.id)).toEqual(["1", "2"]);
    expect(committed.snapshot().revisions).toEqual(before);
    expect(seen).toHaveLength(0);

    // The next accepted render moves the screen and the engine together, and
    // wakes both subscribers once.
    await act(async () => {
      view.rerender(<Host data={[GRACE]} gated={false} />);
      await Promise.resolve();
    });
    expect(screen.getByTestId("rows")).toHaveTextContent("3");
    expect(committed.rows("full").map((row) => row.id)).toEqual(["3"]);
    expect(committed.snapshot().revisions.data).toBe(before.data + 1);
    expect(seen).toHaveLength(1);
    expect(other).toHaveBeenCalledTimes(1);
    release();
  });

  it("shrinks the data and clamps the page with it", async () => {
    let engine: TableEngine<Person> | undefined;
    function Host({ data }: { data: Person[] }) {
      return (
        <Table
          data={data}
          onEngine={(next) => {
            engine ??= next;
          }}
        />
      );
    }
    const view = render(<Host data={[ADA, ALAN, GRACE]} />);
    const table = engine;
    if (!table) throw new Error("no engine");
    act(() => {
      table.dispatch({ type: "setLimit", limit: 1 });
      table.dispatch({ type: "setPage", page: 3 });
    });
    expect(table.snapshot().page).toBe(3);

    await act(async () => {
      view.rerender(<Host data={[ADA]} />);
      await Promise.resolve();
    });
    expect(table.rows("full")).toHaveLength(1);
    // The request is remembered; the page shown is the one that exists.
    expect(table.snapshot().requestedPage).toBe(3);
    expect(table.snapshot().page).toBe(1);
    expect(table.rows("page").map((row) => row.id)).toEqual(["1"]);
  });

  it("publishes once through a Strict Mode double render", async () => {
    let engine: TableEngine<Person> | undefined;
    const woken = vi.fn();
    function Host({ data }: { data: Person[] }) {
      return (
        <StrictMode>
          <Table
            data={data}
            onEngine={(next) => {
              engine ??= next;
            }}
          />
        </StrictMode>
      );
    }
    const view = render(<Host data={[ADA]} />);
    const table = engine;
    if (!table) throw new Error("no engine");
    table.subscribe("all", woken);
    const before = table.snapshot().revisions.data;

    await act(async () => {
      view.rerender(<Host data={[ADA, ALAN]} />);
      await Promise.resolve();
    });
    expect(table.rows("full")).toHaveLength(2);
    expect(table.snapshot().revisions.data).toBe(before + 1);
    expect(woken).toHaveBeenCalledTimes(1);
  });

  it("leaves the table alone when a render changes nothing but identities", async () => {
    let engine: TableEngine<Person> | undefined;
    const woken = vi.fn();
    const rows = [ADA, ALAN];
    function Host({ tick }: { tick: number }) {
      return (
        <Table
          data={[...rows]}
          onEngine={(next) => {
            engine ??= next;
          }}
          key={`stable-${String(tick)}`.slice(0, 6)}
        />
      );
    }
    const view = render(<Host tick={0} />);
    const table = engine;
    if (!table) throw new Error("no engine");
    table.subscribe("all", woken);
    const before = table.snapshot().revisions;

    await act(async () => {
      view.rerender(<Host tick={1} />);
      await Promise.resolve();
    });
    // A fresh array of the same rows is the same table.
    expect(table.snapshot().revisions).toEqual(before);
    expect(woken).not.toHaveBeenCalled();
  });
});

/**
 * A host that hands the hook a new `filterFn` or `getSearchText` between
 * renders is changing what the table means, not just how it looks: the same
 * search box now matches different rows. Those two are functions, so a
 * comparison that only looked at the declared values would miss them.
 */
function LiveOptions({
  filterFn,
  getSearchText,
  onEngine,
}: {
  filterFn?: (row: Person, extra: ExtraFilters) => boolean;
  getSearchText?: (row: Person) => string;
  onEngine: (engine: TableEngine<Person>) => void;
}) {
  "use no memo";
  const engine = useTableEngine<Person>({
    data: [ADA, ALAN, GRACE],
    columns,
    rowKey: (row) => row.id,
    tableId: "live",
    defaults: { search: "a" },
    filterFn,
    getSearchText,
  });
  onEngine(engine);
  return (
    <output data-testid="rows">
      {engine.candidate
        .rows("full")
        .map((row) => row.id)
        .join(",")}
    </output>
  );
}

function Identity({
  tableId,
  onEngine,
}: {
  tableId: string;
  onEngine: (engine: TableEngine<Person>) => void;
}) {
  "use no memo";
  const engine = useTableEngine<Person>({
    data: [ADA],
    columns,
    rowKey: (row) => row.id,
    tableId,
  });
  onEngine(engine);
  return null;
}

describe("useTableEngine — options that stay live", () => {
  it("re-filters when the host swaps the filter function", () => {
    const engines: TableEngine<Person>[] = [];
    const view = render(
      <LiveOptions
        filterFn={(row) => row.id === "1"}
        onEngine={(engine) => engines.push(engine)}
      />
    );
    expect(screen.getByTestId("rows").textContent).toBe("1");

    view.rerender(
      <LiveOptions
        filterFn={(row) => row.id === "3"}
        onEngine={(engine) => engines.push(engine)}
      />
    );
    expect(screen.getByTestId("rows").textContent).toBe("3");
  });

  it("re-searches when the host swaps the searchable text", () => {
    const engines: TableEngine<Person>[] = [];
    const view = render(
      <LiveOptions
        getSearchText={(row) => row.name}
        onEngine={(engine) => engines.push(engine)}
      />
    );
    // "a" matches Ada, Alan and Grace by name.
    expect(screen.getByTestId("rows").textContent).toBe("1,2,3");

    view.rerender(
      <LiveOptions
        getSearchText={(row) => row.id}
        onEngine={(engine) => engines.push(engine)}
      />
    );
    // Searching the ids instead, nothing holds an "a".
    expect(screen.getByTestId("rows").textContent).toBe("");
  });

  it("keeps the identity it was created with when the host changes tableId", () => {
    const engines: TableEngine<Person>[] = [];
    const record = (engine: TableEngine<Person>) => engines.push(engine);
    const view = render(<Identity tableId="first" onEngine={record} />);
    expect(engines[0]?.tableId).toBe("first");

    view.rerender(<Identity tableId="second" onEngine={record} />);

    // The id names the table an agent addresses, so it is read once. A host
    // that changes it gets the table it created, not a silent re-identify.
    expect(engines.at(-1)?.tableId).toBe("first");
  });
});
