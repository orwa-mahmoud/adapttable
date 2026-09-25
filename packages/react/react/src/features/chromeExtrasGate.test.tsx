import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useFrontendData } from "../source/useFrontendData";
import { createMemoryAdapter } from "../url/adapter";
import { useTableChrome } from "../useTableChrome";
import { ChromeExtrasGate } from "./chromeExtrasGate";
import { batchEditing } from "./editing";
import { grouping } from "./grouping";
import {
  FeatureProviders,
  type TableRuntimeView,
  useTableRuntime,
} from "./providers";
import { rowPinning } from "./row-pinning";
import { applyTableFeatures, type TableFeature } from "./tableFeature";
import { tree } from "./tree";

interface Row {
  id: string;
  name: string;
  score: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", score: 3 },
  { id: "b", name: "Bob", score: 4 },
];

function Probe({
  features,
  columns,
  extraProps,
  onView,
}: {
  features: readonly TableFeature<Row>[];
  columns: ColumnDef<Row>[];
  extraProps?: { groupBy?: string; urlSync?: boolean };
  onView: (view: TableRuntimeView<Row> | undefined) => void;
}) {
  const applied = applyTableFeatures({ features, columns });
  function Table() {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: createMemoryAdapter(""),
      columns,
      paginationMode: "paged",
    });
    const props = {
      ...applied,
      source,
      columns,
      rowKey: (row: Row) => row.id,
      ...extraProps,
    };
    const chrome = useTableChrome<Row>(props);
    return (
      <ChromeExtrasGate chrome={chrome} props={props}>
        {() => <Reader onView={onView} />}
      </ChromeExtrasGate>
    );
  }
  function Reader({
    onView: publish,
  }: {
    onView: (view: TableRuntimeView<Row> | undefined) => void;
  }) {
    const runtime = useTableRuntime<Row>();
    useEffect(() => {
      publish(runtime.view());
    });
    return null;
  }
  return (
    <FeatureProviders props={applied}>
      <Table />
    </FeatureProviders>
  );
}

describe("ChromeExtrasGate runtime publish", () => {
  it("labels rows from format, accessor, or id and exposes grouping labels", () => {
    const views: (TableRuntimeView<Row> | undefined)[] = [];
    const columns: ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        formatValue: (row) => row.name,
      },
      {
        key: "score",
        header: <span>Score</span>,
        mobileLabel: "Score",
        accessor: (row) => row.score,
      },
      { key: "id" },
    ];
    render(
      <Probe
        features={[grouping("name"), batchEditing(() => undefined)]}
        columns={columns}
        extraProps={{ groupBy: "name" }}
        onView={(view) => views.push(view)}
      />
    );
    const view = views.at(-1);
    expect(view?.rowLabel(ROWS[0]!)).toBe("Alice");
    expect(view?.groupingState?.columnLabel("name")).toBe("Name");
    expect(view?.groupingState?.columnLabel("score")).toBe("Score");
    expect(view?.groupingState?.columnLabel("missing")).toBe("missing");
    expect(view?.editing?.stageCell).toEqual(expect.any(Function));
    view?.editing?.stageCell?.(ROWS[0]!, "a", "name", "Ada");
  });

  it("falls back to the row id and publishes tree rows", () => {
    const views: (TableRuntimeView<Row> | undefined)[] = [];
    render(
      <Probe
        features={[tree({ getParentId: () => undefined })]}
        columns={[{ key: "id", accessor: () => null }]}
        onView={(view) => views.push(view)}
      />
    );
    const view = views.at(-1);
    expect(view?.rowLabel(ROWS[0]!)).toBe("a");
    expect(view?.tree).toBeDefined();
  });

  it("labels a row by a numeric or boolean cell when nothing formats it", () => {
    const views: (TableRuntimeView<Row> | undefined)[] = [];
    render(
      <Probe
        features={[]}
        columns={[
          { key: "flag", accessor: () => true },
          { key: "score", accessor: (row) => row.score },
        ]}
        onView={(view) => views.push(view)}
      />
    );
    expect(views.at(-1)?.rowLabel(ROWS[1]!)).toBe("true");
  });

  it("pins and unpins a row through the published pinning", () => {
    const views: (TableRuntimeView<Row> | undefined)[] = [];
    const onPinnedRowIdsChange = vi.fn();
    render(
      <Probe
        features={[rowPinning({ onPinnedRowIdsChange })]}
        columns={[{ key: "name", accessor: (row) => row.name }]}
        extraProps={{ urlSync: false }}
        onView={(view) => views.push(view)}
      />
    );
    const setRowPin = views.at(-1)?.pinning?.setRowPin;
    expect(setRowPin).toEqual(expect.any(Function));

    act(() => {
      setRowPin?.("b", "top");
    });
    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: ["b"] })
    );
    expect(views.at(-1)?.pinning?.rows?.top).toEqual(["b"]);

    act(() => {
      views.at(-1)?.pinning?.setRowPin?.("b", undefined);
    });
    expect(views.at(-1)?.pinning?.rows?.top).toEqual([]);
  });

  it("publishes no row pin action without row pinning", () => {
    const views: (TableRuntimeView<Row> | undefined)[] = [];
    render(
      <Probe
        features={[]}
        columns={[{ key: "name", accessor: (row) => row.name }]}
        onView={(view) => views.push(view)}
      />
    );
    expect(views.at(-1)?.pinning?.setRowPin).toBeUndefined();
  });
});
