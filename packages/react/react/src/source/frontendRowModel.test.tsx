/**
 * The plain-table source uses the basic evaluator until grouping publishes
 * the full one. A render that never commits cannot swap that evaluator.
 */
import { createTableEngine, incrementalViewOf } from "@adapttable/core";
import { act, render } from "@testing-library/react";
import { Suspense, use } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { densityChooser } from "../features/density";
import { grouping } from "../features/grouping";
import { FeatureProviders } from "../features/providers";
import {
  applyTableFeatures,
  type TableFeature,
} from "../features/tableFeature";
import { createMemoryAdapter } from "../url/adapter";
import { useFrontendData } from "./useFrontendData";
import { type UseTableDataResult } from "./useTableData";
import { useTableDataLean } from "./useTableDataLean";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "core" },
  { id: "2", name: "Grace", team: "web" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
];

function groupsOf(
  source: UseTableDataResult<Row>["source"] | undefined
): unknown {
  const engine = source?.tableEngine;
  if (!engine) return undefined;
  return incrementalViewOf(engine.rows("full"))?.groups;
}

function Table({
  features,
  adapter,
  box,
}: {
  features: readonly TableFeature<Row>[];
  adapter: ReturnType<typeof createMemoryAdapter>;
  box: { current: UseTableDataResult<Row> | undefined };
}) {
  const applied = applyTableFeatures({ features });
  return (
    <FeatureProviders props={applied}>
      <Probe adapter={adapter} box={box} />
    </FeatureProviders>
  );
}

function Probe({
  adapter,
  box,
}: {
  adapter: ReturnType<typeof createMemoryAdapter>;
  box: { current: UseTableDataResult<Row> | undefined };
}) {
  box.current = useTableDataLean<Row>({
    data: ROWS,
    columns,
    urlAdapter: adapter,
  });
  return null;
}

describe("plain-table row model", () => {
  it("stays basic until grouping is composed, then keeps search across that change", () => {
    const adapter = createMemoryAdapter("");
    const box: { current: UseTableDataResult<Row> | undefined } = {
      current: undefined,
    };
    const grouped = grouping("team");
    const density = densityChooser();
    const view = render(<Table features={[]} adapter={adapter} box={box} />);
    act(() => box.current?.source.setGroupBy("team"));
    expect(groupsOf(box.current?.source)).toBeUndefined();
    act(() => box.current?.source.setSearch("ada"));
    const searched = box.current?.source.rows.map((row) => row.id);

    view.rerender(
      <Table features={[density, grouped]} adapter={adapter} box={box} />
    );
    expect(box.current?.source.search).toBe("ada");
    expect(box.current?.source.rows.map((row) => row.id)).toEqual(searched);
    expect(groupsOf(box.current?.source)).toBeDefined();
    const engine = box.current?.source.tableEngine;

    view.rerender(
      <Table features={[grouped, density]} adapter={adapter} box={box} />
    );
    expect(box.current?.source.tableEngine).toBe(engine);
    expect(box.current?.source.search).toBe("ada");

    view.rerender(<Table features={[density]} adapter={adapter} box={box} />);
    expect(box.current?.source.search).toBe("ada");
    expect(box.current?.source.groupBy).toBe("team");
    expect(groupsOf(box.current?.source)).toBeUndefined();
  });

  it("does not install the full evaluator while the render is still pending", async () => {
    let release = (): void => undefined;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    function Gate() {
      use(promise);
      return null;
    }
    let source: ReturnType<typeof useFrontendData<Row>> | undefined;
    const woken = vi.fn();

    function Host({ full, gated }: { full: boolean; gated: boolean }) {
      return (
        <Suspense fallback={<span>pending</span>}>
          <PendingSource
            full={full}
            onSource={(next) => {
              source = next;
            }}
          />
          {gated ? <Gate /> : null}
        </Suspense>
      );
    }

    function PendingSource({
      full,
      onSource,
    }: {
      full: boolean;
      onSource: (source: ReturnType<typeof useFrontendData<Row>>) => void;
    }) {
      const table = useFrontendData<Row>({
        data: ROWS,
        columns,
        urlSync: false,
        ...(full ? { createEngine: createTableEngine } : {}),
      });
      onSource(table);
      return null;
    }

    const view = render(<Host full={false} gated={false} />);
    const engine = source?.tableEngine;
    if (!engine) throw new Error("no engine");
    engine.subscribe("all", woken);
    act(() => source?.setGroupBy("team"));
    expect(groupsOf(source)).toBeUndefined();
    woken.mockClear();

    await act(async () => {
      view.rerender(<Host full gated />);
      await Promise.resolve();
    });
    expect(source?.tableEngine).toBe(engine);
    expect(groupsOf(source)).toBeUndefined();
    expect(woken).not.toHaveBeenCalled();

    release();
    await act(async () => {
      await promise;
    });
    expect(groupsOf(source)).toBeDefined();
    expect(woken).not.toHaveBeenCalled();
  });
});
